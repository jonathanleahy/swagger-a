import type { NormalizedAPI } from '../../types';

export interface FieldBasedView {
  api_info: {
    title: string;
    version: string;
    description?: string;
    servers?: Array<{ url: string; description?: string }>;
  };
  paths: {
    [path: string]: {
      [method: string]: {
        operation_id?: string;
        summary?: string;
        description?: string;
        tags?: string[];
        parameters?: {
          [paramName: string]: {
            location: 'path' | 'query' | 'header' | 'cookie';
            type: string;
            required?: boolean;
            description?: string;
            default?: any;
            example?: any;
          };
        };
        request_body?: {
          required?: boolean;
          content_types: {
            [contentType: string]: {
              schema?: any;
              example?: any;
            };
          };
        };
        responses: {
          [statusCode: string]: {
            description: string;
            headers?: {
              [headerName: string]: {
                description?: string;
                schema?: any;
              };
            };
            content_types?: {
              [contentType: string]: {
                schema?: any;
                example?: any;
              };
            };
          };
        };
      };
    };
  };
  schemas: {
    [schemaName: string]: {
      type: string;
      properties?: any;
      required?: string[];
      description?: string;
    };
  };
}

export class FieldViewConverter {
  private resolveSchema(schemaRef: string | any, normalized: NormalizedAPI): any {
    // If it's already a schema object, return it
    if (typeof schemaRef === 'object') {
      // Handle $ref references
      if (schemaRef.$ref) {
        const refId = schemaRef.$ref.replace('#/components/schemas/', 'schema-').toLowerCase();
        const schema = normalized.schemas.find(s => s.id === refId);
        return schema || schemaRef;
      }
      return schemaRef;
    }

    // If it's a string ID, look it up
    if (typeof schemaRef === 'string') {
      const schema = normalized.schemas.find(s => s.id === schemaRef);
      return schema || { type: 'object' };
    }

    return schemaRef;
  }

  convertToFieldView(normalized: NormalizedAPI): FieldBasedView {
    const fieldView: FieldBasedView = {
      api_info: {
        title: (normalized.metadata as any).name || normalized.metadata.title || '',
        version: normalized.metadata.version,
        description: normalized.metadata.description,
        servers: normalized.metadata.servers,
      },
      paths: {},
      schemas: {},
    };

    // Convert endpoints to path-based structure
    normalized.endpoints.forEach(endpoint => {
      if (!fieldView.paths[endpoint.path]) {
        fieldView.paths[endpoint.path] = {};
      }

      const operation: any = {
        operation_id: endpoint.operationId,
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        parameters: {},
        responses: {},
      };

      // Add parameters with field names as keys
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        endpoint.parameters.forEach(param => {
          const paramData = normalized.parameters.find(p => p.id === param);
          if (paramData) {
            operation.parameters[paramData.name] = {
              location: paramData.in,
              type: paramData.schema?.type || 'string',
              required: paramData.required,
              description: paramData.description,
              default: paramData.schema?.default,
              example: paramData.example,
            };
          }
        });
      }

      // Add request body
      if (endpoint.requestBody) {
        const bodyData = normalized.requestBodies.find(b => b.id === endpoint.requestBody);
        if (bodyData) {
          operation.request_body = {
            required: bodyData.required,
            content_types: {},
          };

          Object.entries(bodyData.content).forEach(([contentType, mediaType]) => {
            operation.request_body.content_types[contentType] = {
              schema: this.resolveSchema(mediaType.schema, normalized),
              example: mediaType.example,
            };
          });
        }
      }

      // Add responses with status codes as keys
      if (endpoint.responses) {
        // Handle both array and object formats
        const responsesObj = Array.isArray(endpoint.responses)
          ? endpoint.responses.reduce((acc, r) => {
              const [code, id] = r.split(':');
              acc[code] = id;
              return acc;
            }, {} as any)
          : endpoint.responses;

        Object.entries(responsesObj).forEach(([statusCode, responseId]) => {
          const responseData = normalized.responses.find(r => r.id === responseId);
          if (responseData) {
            operation.responses[statusCode] = {
              description: responseData.description,
              headers: {},
              content_types: {},
            };

            // Add response headers if present
            if ((responseData as any).headers) {
              Object.entries((responseData as any).headers).forEach(([headerName, headerData]: [string, any]) => {
                operation.responses[statusCode].headers![headerName] = {
                  description: headerData.description,
                  schema: headerData.schema
                };
              });
            }

            if (responseData.content) {
              Object.entries(responseData.content).forEach(([contentType, mediaType]) => {
                operation.responses[statusCode].content_types![contentType] = {
                  schema: this.resolveSchema(mediaType.schema, normalized),
                  example: mediaType.example,
                };
              });
            }
          }
        });
      }

      fieldView.paths[endpoint.path][endpoint.method.toLowerCase()] = operation;
    });

    // Convert schemas with names as keys
    normalized.schemas.forEach(schema => {
      const schemaName = schema.id.replace('schema-', '');
      fieldView.schemas[schemaName] = {
        type: schema.type,
        properties: schema.properties,
        required: schema.required,
        description: schema.description,
      };
    });

    return fieldView;
  }

  // Create a simplified view focusing on fields
  createSimplifiedFieldView(normalized: NormalizedAPI): any {
    const title = (normalized.metadata as any).name || normalized.metadata.title || 'API';
    const simplified: any = {
      api: `${title} v${normalized.metadata.version}`,
      endpoints: {},
    };

    normalized.endpoints.forEach(endpoint => {
      const key = `${endpoint.method} ${endpoint.path}`;
      simplified.endpoints[key] = {
        summary: endpoint.summary,
        parameters: {},
        request_fields: {},
        response_fields: {},
      };

      // Extract parameter fields
      if (endpoint.parameters) {
        endpoint.parameters.forEach(paramId => {
          const param = normalized.parameters.find(p => p.id === paramId);
          if (param) {
            simplified.endpoints[key].parameters[param.name] = param.schema?.type || 'string';
          }
        });
      }

      // Extract request body fields
      if (endpoint.requestBody) {
        const body = normalized.requestBodies.find(b => b.id === endpoint.requestBody);
        if (body && body.content['application/json']?.schema) {
          const schemaRef = body.content['application/json'].schema;
          const schema = this.resolveSchema(schemaRef, normalized);
          if (schema && schema.properties) {
            simplified.endpoints[key].request_fields = this.extractFields(schema.properties);
          }
        }
      }

      // Extract response fields
      if (endpoint.responses) {
        // Handle both array and object formats
        const responsesObj = Array.isArray(endpoint.responses)
          ? endpoint.responses.reduce((acc, r) => {
              const [code, id] = r.split(':');
              acc[code] = id;
              return acc;
            }, {} as any)
          : endpoint.responses;

        // Find success response (200 or 201)
        const successCode = Object.keys(responsesObj).find(code => code === '200' || code === '201');
        if (successCode) {
          const responseId = responsesObj[successCode];
          const response = normalized.responses.find(r => r.id === responseId);
          if (response && response.content?.['application/json']?.schema) {
            const schemaRef = response.content['application/json'].schema;
            const schema = this.resolveSchema(schemaRef, normalized);
            if (schema) {
              if (schema.properties) {
                simplified.endpoints[key].response_fields = this.extractFields(schema.properties);
              } else if (schema.type === 'array' && schema.items) {
                const itemSchema = this.resolveSchema(schema.items, normalized);
                if (itemSchema && itemSchema.properties) {
                  simplified.endpoints[key].response_fields = {
                    array_of: this.extractFields(itemSchema.properties)
                  };
                }
              }
            }
          }
        }
      }
    });

    return simplified;
  }

  private extractFields(properties: any): any {
    const fields: any = {};
    Object.entries(properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
      if (fieldSchema.type === 'object') {
        if (fieldSchema.properties) {
          // Nested object with defined properties
          fields[fieldName] = this.extractFields(fieldSchema.properties);
        } else if (fieldSchema.additionalProperties) {
          // Object with dynamic keys (additionalProperties)
          if (typeof fieldSchema.additionalProperties === 'object') {
            if (fieldSchema.additionalProperties.type === 'object' && fieldSchema.additionalProperties.properties) {
              fields[fieldName] = {
                '[key: string]': this.extractFields(fieldSchema.additionalProperties.properties)
              };
            } else {
              fields[fieldName] = {
                '[key: string]': fieldSchema.additionalProperties.type || 'any'
              };
            }
          } else {
            fields[fieldName] = { '[key: string]': 'any' };
          }
        } else {
          // Generic object
          fields[fieldName] = 'object';
        }
      } else if (fieldSchema.type === 'array') {
        // Handle various array types
        if (fieldSchema.items) {
          if (fieldSchema.items.properties) {
            // Array of objects with properties
            fields[fieldName] = [{
              ...this.extractFields(fieldSchema.items.properties)
            }];
          } else if (fieldSchema.items.type === 'array') {
            // Array of arrays (2D array)
            if (fieldSchema.items.items) {
              fields[fieldName] = [[fieldSchema.items.items.type || 'any']];
            } else {
              fields[fieldName] = [['any']];
            }
          } else if (fieldSchema.items.type === 'object' && fieldSchema.items.properties) {
            // Array of objects
            fields[fieldName] = [{
              ...this.extractFields(fieldSchema.items.properties)
            }];
          } else {
            // Array of primitives
            fields[fieldName] = [fieldSchema.items.type || 'any'];
          }
        } else {
          // Array without item specification
          fields[fieldName] = ['any'];
        }
      } else {
        // Primitive type
        fields[fieldName] = fieldSchema.type || 'any';
      }
    });
    return fields;
  }
}
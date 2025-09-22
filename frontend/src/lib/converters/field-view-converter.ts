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
  convertToFieldView(normalized: NormalizedAPI): FieldBasedView {
    const fieldView: FieldBasedView = {
      api_info: {
        title: normalized.metadata.title,
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
              schema: mediaType.schema,
              example: mediaType.example,
            };
          });
        }
      }

      // Add responses with status codes as keys
      if (endpoint.responses && endpoint.responses.length > 0) {
        endpoint.responses.forEach(respRef => {
          const [statusCode, responseId] = respRef.split(':');
          const responseData = normalized.responses.find(r => r.id === responseId);
          if (responseData) {
            operation.responses[statusCode] = {
              description: responseData.description,
              content_types: {},
            };

            if (responseData.content) {
              Object.entries(responseData.content).forEach(([contentType, mediaType]) => {
                operation.responses[statusCode].content_types[contentType] = {
                  schema: mediaType.schema,
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
    const simplified: any = {
      api: `${normalized.metadata.title} v${normalized.metadata.version}`,
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
          const schema = body.content['application/json'].schema;
          if (schema.properties) {
            simplified.endpoints[key].request_fields = this.extractFields(schema.properties);
          }
        }
      }

      // Extract response fields
      if (endpoint.responses && endpoint.responses.length > 0) {
        const successResponse = endpoint.responses.find(r => r.startsWith('200:') || r.startsWith('201:'));
        if (successResponse) {
          const [, responseId] = successResponse.split(':');
          const response = normalized.responses.find(r => r.id === responseId);
          if (response && response.content?.['application/json']?.schema) {
            const schema = response.content['application/json'].schema;
            if (schema.properties) {
              simplified.endpoints[key].response_fields = this.extractFields(schema.properties);
            } else if (schema.items?.properties) {
              simplified.endpoints[key].response_fields = {
                array_of: this.extractFields(schema.items.properties)
              };
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
      if (fieldSchema.type === 'object' && fieldSchema.properties) {
        fields[fieldName] = this.extractFields(fieldSchema.properties);
      } else if (fieldSchema.type === 'array' && fieldSchema.items?.properties) {
        fields[fieldName] = [`array of ${fieldSchema.items.type || 'object'}`];
      } else {
        fields[fieldName] = fieldSchema.type || 'any';
      }
    });
    return fields;
  }
}
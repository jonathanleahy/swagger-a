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
          // Resolve parameter $ref if needed
          const resolvedParamId = this.resolveParameterRef(paramId);
          const param = normalized.parameters.find(p => p.id === resolvedParamId);
          if (param) {
            simplified.endpoints[key].parameters[param.name] = param.schema?.type || 'string';
          }
          // Note: Missing parameters are silently ignored to handle invalid $refs gracefully
        });
      }

      // Extract request body fields
      if (endpoint.requestBody) {
        let body = normalized.requestBodies.find(b => b.id === endpoint.requestBody);

        // Fallback: if exact match fails, try to find by partial match or use the first one
        if (!body && normalized.requestBodies.length > 0) {
          body = normalized.requestBodies.find(b => b.id.includes('body') || b.id.includes(endpoint.method.toLowerCase()))
                 || normalized.requestBodies[0];
        }

        if (body && body.content['application/json']?.schema) {
          const schemaRef = body.content['application/json'].schema;
          const schema = this.resolveSchema(schemaRef, normalized);
          if (schema && schema.properties) {
            simplified.endpoints[key].request_fields = this.extractFields(schema.properties, normalized);
          }
        }
      } else {
        console.log('No request body on endpoint');
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
                simplified.endpoints[key].response_fields = this.extractFields(schema.properties, normalized);
              } else if (schema.type === 'array' && schema.items) {
                const itemSchema = this.resolveSchema(schema.items, normalized);
                if (itemSchema) {
                  if (itemSchema.properties) {
                    // Array of objects
                    simplified.endpoints[key].response_fields = [{
                      ...this.extractFields(itemSchema.properties, normalized)
                    }];
                  } else {
                    // Array of primitives
                    simplified.endpoints[key].response_fields = [itemSchema.type || 'any'];
                  }
                }
              }
            }
          }
        }
      }
    });

    return simplified;
  }

  private extractFields(properties: any, normalized?: NormalizedAPI, visitedRefs: Set<string> = new Set()): any {
    const fields: any = {};
    Object.entries(properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
      // Handle $ref references
      if (fieldSchema.$ref) {
        // Check for circular reference
        if (visitedRefs.has(fieldSchema.$ref)) {
          fields[fieldName] = 'circular-ref';
          return;
        }

        const newVisitedRefs = new Set(visitedRefs);
        newVisitedRefs.add(fieldSchema.$ref);

        const resolved = this.resolveSchemaRef(fieldSchema.$ref, normalized);
        if (resolved) {
          // Check if this is an object with properties
          if (resolved.properties) {
            fields[fieldName] = this.extractFields(resolved.properties, normalized, newVisitedRefs);
          }
          // Check if this is an array
          else if (resolved.type === 'array' && resolved.items) {
            // Handle array with $ref items
            if (resolved.items.$ref) {
              // Check for circular reference in array items
              if (newVisitedRefs.has(resolved.items.$ref)) {
                fields[fieldName] = ['circular-ref'];
              } else {
                const itemVisitedRefs = new Set(newVisitedRefs);
                itemVisitedRefs.add(resolved.items.$ref);
                const itemResolved = this.resolveSchemaRef(resolved.items.$ref, normalized);
                if (itemResolved && itemResolved.properties) {
                  fields[fieldName] = [{
                    ...this.extractFields(itemResolved.properties, normalized, itemVisitedRefs)
                  }];
                } else if (itemResolved) {
                  fields[fieldName] = [itemResolved.type || 'any'];
                } else {
                  fields[fieldName] = ['any'];
                }
              }
            } else if (resolved.items.properties) {
              fields[fieldName] = [{
                ...this.extractFields(resolved.items.properties, normalized, newVisitedRefs)
              }];
            } else {
              fields[fieldName] = [resolved.items.type || 'any'];
            }
          }
          // Check if this is an enum (enum types are always strings in OpenAPI)
          else if (resolved.enum || (resolved as any).enum) {
            fields[fieldName] = 'string';
          }
          // Otherwise, use the type
          else {
            fields[fieldName] = resolved.type || 'any';
          }
        } else {
          fields[fieldName] = 'any';
        }
      } else if (fieldSchema.type === 'object') {
        if (fieldSchema.properties) {
          // Nested object with defined properties
          fields[fieldName] = this.extractFields(fieldSchema.properties, normalized, visitedRefs);
        } else if (fieldSchema.additionalProperties) {
          // Object with dynamic keys (additionalProperties)
          if (typeof fieldSchema.additionalProperties === 'object') {
            if (fieldSchema.additionalProperties.type === 'object' && fieldSchema.additionalProperties.properties) {
              fields[fieldName] = {
                '[key: string]': this.extractFields(fieldSchema.additionalProperties.properties, normalized, visitedRefs)
              };
            } else if (fieldSchema.additionalProperties.type === 'array' && fieldSchema.additionalProperties.items) {
              // additionalProperties with array value
              fields[fieldName] = {
                '[key: string]': [fieldSchema.additionalProperties.items.type || 'any']
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
          if (fieldSchema.items.$ref) {
            // Array items are $ref
            // Check for circular reference
            if (visitedRefs.has(fieldSchema.items.$ref)) {
              fields[fieldName] = ['circular-ref'];
            } else {
              const newVisitedRefs = new Set(visitedRefs);
              newVisitedRefs.add(fieldSchema.items.$ref);
              const itemResolved = this.resolveSchemaRef(fieldSchema.items.$ref, normalized);
              if (itemResolved && itemResolved.properties) {
                fields[fieldName] = [{
                  ...this.extractFields(itemResolved.properties, normalized, newVisitedRefs)
                }];
              } else {
                fields[fieldName] = [itemResolved?.type || 'any'];
              }
            }
          } else if (fieldSchema.items.properties) {
            // Array of objects with properties
            fields[fieldName] = [{
              ...this.extractFields(fieldSchema.items.properties, normalized, visitedRefs)
            }];
          } else if (fieldSchema.items.type === 'array') {
            // Array of arrays (2D array)
            if (fieldSchema.items.items) {
              if (fieldSchema.items.items.type === 'array') {
                // 3D array
                if (fieldSchema.items.items.items) {
                  fields[fieldName] = [[[fieldSchema.items.items.items.type || 'any']]];
                } else {
                  fields[fieldName] = [[['any']]];
                }
              } else if (fieldSchema.items.items.type === 'object' && fieldSchema.items.items.properties) {
                fields[fieldName] = [[{
                  ...this.extractFields(fieldSchema.items.items.properties, normalized, visitedRefs)
                }]];
              } else {
                fields[fieldName] = [[fieldSchema.items.items.type || 'any']];
              }
            } else {
              fields[fieldName] = [['any']];
            }
          } else if (fieldSchema.items.type === 'object' && fieldSchema.items.properties) {
            // Array of objects
            fields[fieldName] = [{
              ...this.extractFields(fieldSchema.items.properties, normalized, visitedRefs)
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

  private resolveSchemaRef(ref: string, normalized?: NormalizedAPI): any {
    if (!normalized) return null;

    let schemaId: string;

    // Handle both full $ref and already-processed schema IDs
    if (ref.startsWith('#/components/schemas/')) {
      // Full $ref like '#/components/schemas/Customer'
      const schemaName = ref.replace('#/components/schemas/', '').toLowerCase();
      schemaId = `schema-${schemaName}`;
    } else if (ref.startsWith('schema-')) {
      // Already processed like 'schema-membershiplevel'
      schemaId = ref;
    } else {
      // Plain name like 'Customer'
      schemaId = `schema-${ref.toLowerCase()}`;
    }

    // Find the schema in normalized schemas
    const schema = normalized.schemas.find(s => s.id === schemaId);

    // Return the full schema object, preserving all properties
    return schema || null;
  }

  private resolveParameterRef(ref: string): string {
    // Handle both full $ref and already-processed parameter IDs
    if (ref.startsWith('#/components/parameters/')) {
      // Full $ref like '#/components/parameters/GetProcessingCode'
      const paramName = ref.replace('#/components/parameters/', '');
      // Apply the same sanitization as generateId in SwaggerToJSONConverter
      const sanitized = paramName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return `param-${sanitized}`;
    } else if (ref.startsWith('param-')) {
      // Already processed like 'param-getprocessingcode'
      return ref;
    } else {
      // Plain name like 'GetProcessingCode'
      // Apply the same sanitization as generateId in SwaggerToJSONConverter
      const sanitized = ref.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return `param-${sanitized}`;
    }
  }
}
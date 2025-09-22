import { describe, it, expect } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';

describe('FieldView $ref Resolution Issue', () => {
  it('should resolve $refs in convertToFieldView output', () => {
    const converter = new FieldViewConverter();

    const normalized = {
      metadata: {
        title: 'Test API',
        version: '1.0.0'
      },
      endpoints: [
        {
          id: 'endpoint-1',
          path: '/organizations',
          method: 'POST',
          requestBody: 'request-1',
          responses: { '200': 'response-1' }
        }
      ],
      parameters: [],
      requestBodies: [
        {
          id: 'request-1',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  org: { $ref: 'schema-org' },
                  status: { $ref: '#/components/schemas/Status' },
                  config: {
                    type: 'object',
                    properties: {
                      enabled: { type: 'boolean' },
                      level: { $ref: 'schema-level' }
                    }
                  }
                }
              }
            }
          }
        }
      ],
      responses: [
        {
          id: 'response-1',
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  org: { $ref: 'schema-org' },
                  metadata: { $ref: '#/components/schemas/Metadata' }
                }
              }
            }
          }
        }
      ],
      schemas: [
        {
          id: 'schema-org',
          type: 'integer',
          description: 'Organization ID'
        },
        {
          id: 'schema-status',
          type: 'string',
          enum: ['active', 'inactive', 'pending']
        },
        {
          id: 'schema-level',
          type: 'string',
          enum: ['basic', 'premium', 'enterprise']
        },
        {
          id: 'schema-metadata',
          type: 'object',
          properties: {
            created: { type: 'string', format: 'date-time' },
            updated: { type: 'string', format: 'date-time' }
          }
        }
      ]
    };

    const fieldView = converter.convertToFieldView(normalized);

    // Check request body schema
    const requestBodySchema = fieldView.paths['/organizations']['post'].request_body?.content_types['application/json'].schema;
    console.log('Request body schema org field:', requestBodySchema.properties.org);
    console.log('Request body schema status field:', requestBodySchema.properties.status);
    console.log('Request body schema config.level field:', requestBodySchema.properties.config?.properties?.level);

    // EXPECTED: $refs should be resolved to actual schemas
    // Currently failing - shows { "$ref": "schema-org" } instead of resolved schema
    expect(requestBodySchema.properties.org).not.toHaveProperty('$ref');
    expect(requestBodySchema.properties.org).toEqual({
      type: 'integer',
      description: 'Organization ID'
    });

    expect(requestBodySchema.properties.status).not.toHaveProperty('$ref');
    expect(requestBodySchema.properties.status).toEqual({
      type: 'string',
      enum: ['active', 'inactive', 'pending']
    });

    // Nested $ref should also be resolved
    expect(requestBodySchema.properties.config.properties.level).not.toHaveProperty('$ref');
    expect(requestBodySchema.properties.config.properties.level).toEqual({
      type: 'string',
      enum: ['basic', 'premium', 'enterprise']
    });

    // Check response schema
    const responseSchema = fieldView.paths['/organizations']['post'].responses['200'].content_types!['application/json'].schema;
    console.log('Response schema org field:', responseSchema.properties.org);
    console.log('Response schema metadata field:', responseSchema.properties.metadata);

    expect(responseSchema.properties.org).not.toHaveProperty('$ref');
    expect(responseSchema.properties.org).toEqual({
      type: 'integer',
      description: 'Organization ID'
    });

    expect(responseSchema.properties.metadata).not.toHaveProperty('$ref');
    expect(responseSchema.properties.metadata).toEqual({
      type: 'object',
      properties: {
        created: { type: 'string', format: 'date-time' },
        updated: { type: 'string', format: 'date-time' }
      }
    });
  });

  it('should show that createSimplifiedFieldView works correctly', () => {
    const converter = new FieldViewConverter();

    const normalized = {
      metadata: {
        title: 'Test API',
        version: '1.0.0'
      },
      endpoints: [
        {
          id: 'endpoint-1',
          path: '/organizations',
          method: 'POST',
          requestBody: 'request-1',
          responses: { '200': 'response-1' }
        }
      ],
      parameters: [],
      requestBodies: [
        {
          id: 'request-1',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  org: { $ref: 'schema-org' },
                  status: { $ref: '#/components/schemas/Status' }
                }
              }
            }
          }
        }
      ],
      responses: [
        {
          id: 'response-1',
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  org: { $ref: 'schema-org' }
                }
              }
            }
          }
        }
      ],
      schemas: [
        {
          id: 'schema-org',
          type: 'integer'
        },
        {
          id: 'schema-status',
          type: 'string',
          enum: ['active', 'inactive']
        }
      ]
    };

    const simplified = converter.createSimplifiedFieldView(normalized);

    // This works correctly!
    expect(simplified.endpoints['POST /organizations'].request_fields.org).toBe('integer');
    expect(simplified.endpoints['POST /organizations'].request_fields.status).toBe('string');
    expect(simplified.endpoints['POST /organizations'].response_fields.org).toBe('integer');
  });
});
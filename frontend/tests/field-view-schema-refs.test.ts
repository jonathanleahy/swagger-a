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

    // Check request body schema - now simplified to just types
    const requestBodySchema = fieldView.paths['/organizations']['post'].request_body?.content_types['application/json'].schema;
    console.log('Request body schema:', JSON.stringify(requestBodySchema, null, 2));

    // EXPECTED: $refs should be resolved to simple types
    expect(requestBodySchema.org).toBe('integer');
    expect(requestBodySchema.status).toBe('string');

    // Nested $ref should also be resolved
    expect(requestBodySchema.config.enabled).toBe('boolean');
    expect(requestBodySchema.config.level).toBe('string');

    // Check response schema
    const responseSchema = fieldView.paths['/organizations']['post'].responses['200'].content_types!['application/json'].schema;
    console.log('Response schema:', JSON.stringify(responseSchema, null, 2));

    expect(responseSchema.id).toBe('string');
    expect(responseSchema.org).toBe('integer');
    expect(responseSchema.metadata).toEqual({
      created: 'string',
      updated: 'string'
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
import { describe, it, expect } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';

describe('Simple Field Types in convertToFieldView', () => {
  it('should return simple type strings instead of schema objects', () => {
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
                  org: {
                    type: 'string',
                    description: 'test test'
                  },
                  count: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 100
                  },
                  active: {
                    type: 'boolean',
                    default: true
                  },
                  tags: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  metadata: {
                    type: 'object',
                    properties: {
                      created: {
                        type: 'string',
                        format: 'date-time'
                      }
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
                  id: {
                    type: 'string',
                    description: 'Unique identifier'
                  },
                  status: {
                    type: 'string',
                    enum: ['active', 'inactive']
                  }
                }
              }
            }
          }
        }
      ],
      schemas: []
    };

    const fieldView = converter.convertToFieldView(normalized);

    // Check request body schema - should be simple type strings
    const requestSchema = fieldView.paths['/organizations']['post'].request_body?.content_types['application/json'].schema;
    console.log('Request schema:', JSON.stringify(requestSchema, null, 2));

    // EXPECTED: Simple type strings, not objects with type property
    // The schema is now simplified directly, not under properties
    expect(requestSchema.org).toBe('string');
    expect(requestSchema.count).toBe('integer');
    expect(requestSchema.active).toBe('boolean');
    expect(requestSchema.tags).toEqual(['string']);
    expect(requestSchema.metadata).toEqual({
      created: 'string'
    });

    // Check response schema
    const responseSchema = fieldView.paths['/organizations']['post'].responses['200'].content_types!['application/json'].schema;
    console.log('Response schema:', JSON.stringify(responseSchema, null, 2));

    expect(responseSchema.id).toBe('string');
    expect(responseSchema.status).toBe('string'); // enum should still be string
  });

  it('should handle $ref resolution to simple types', () => {
    const converter = new FieldViewConverter();

    const normalized = {
      metadata: {
        title: 'Test API',
        version: '1.0.0'
      },
      endpoints: [
        {
          id: 'endpoint-1',
          path: '/test',
          method: 'POST',
          requestBody: 'request-1',
          responses: {}
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
                  user: { $ref: 'schema-user' }
                }
              }
            }
          }
        }
      ],
      responses: [],
      schemas: [
        {
          id: 'schema-org',
          type: 'string',
          description: 'Organization name'
        },
        {
          id: 'schema-user',
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' }
          }
        }
      ]
    };

    const fieldView = converter.convertToFieldView(normalized);
    const requestSchema = fieldView.paths['/test']['post'].request_body?.content_types['application/json'].schema;

    // $ref to simple type should resolve to simple type string
    expect(requestSchema.org).toBe('string');

    // $ref to object should resolve to simplified object
    expect(requestSchema.user).toEqual({
      id: 'integer',
      name: 'string'
    });
  });
});
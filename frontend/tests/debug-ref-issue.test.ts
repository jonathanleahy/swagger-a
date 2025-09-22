import { describe, it, expect } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';

describe('Debug $ref Issue', () => {
  it('should resolve $ref in field view instead of showing ref object', () => {
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
                  org: {
                    $ref: 'schema-org'  // This is what we're seeing
                  },
                  user: {
                    $ref: '#/components/schemas/User'
                  }
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
          type: 'integer'
        },
        {
          id: 'schema-user',
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        }
      ]
    };

    console.log('Input schema for org field:', normalized.requestBodies[0].content['application/json'].schema.properties.org);

    const simplified = converter.createSimplifiedFieldView(normalized);
    console.log('Result for org field:', simplified.endpoints['POST /test'].request_fields.org);
    console.log('Result for user field:', simplified.endpoints['POST /test'].request_fields.user);

    // Should resolve to the actual type
    expect(simplified.endpoints['POST /test'].request_fields.org).toBe('integer');
    expect(simplified.endpoints['POST /test'].request_fields.user).toEqual({
      id: 'string',
      name: 'string'
    });
  });

  it('should handle convertToFieldView with $refs correctly', () => {
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
                  org: { $ref: 'schema-org' }
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
          type: 'integer'
        }
      ]
    };

    const fieldView = converter.convertToFieldView(normalized);
    console.log('FieldView result:', JSON.stringify(fieldView.paths['/test']['post'].request_body, null, 2));

    // Check what convertToFieldView produces
    const requestBodySchema = fieldView.paths['/test']['post'].request_body?.content_types['application/json'].schema;
    console.log('Request body schema:', requestBodySchema);
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';

describe('Field Simplification - Show types only', () => {
  let converter: FieldViewConverter;

  beforeEach(() => {
    converter = new FieldViewConverter();
  });

  it('should show simple types instead of full schema objects', () => {
    const normalized = {
      metadata: {
        title: 'Test API',
        version: '1.0.0'
      },
      endpoints: [
        {
          id: 'endpoint-1',
          path: '/items',
          method: 'GET',
          responses: { '200': 'response-1' }
        }
      ],
      parameters: [],
      requestBodies: [],
      responses: [
        {
          id: 'response-1',
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  has_next: {
                    type: 'boolean',
                    description: 'Whether there are more pages'
                  },
                  total: {
                    type: 'integer',
                    description: 'Total count',
                    minimum: 0
                  },
                  items: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        }
      ],
      schemas: []
    };

    const simplified = converter.createSimplifiedFieldView(normalized);

    // Should show simple types, not full schema objects
    expect(simplified.endpoints['GET /items'].response_fields.has_next).toBe('boolean');
    expect(simplified.endpoints['GET /items'].response_fields.total).toBe('integer');
    expect(simplified.endpoints['GET /items'].response_fields.items).toEqual(['string']);
  });

  it('should resolve $ref to actual type instead of showing ref object', () => {
    const normalized = {
      metadata: {
        title: 'Test API',
        version: '1.0.0'
      },
      endpoints: [
        {
          id: 'endpoint-1',
          path: '/products',
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
                  name: {
                    type: 'string'
                  },
                  tags: {
                    $ref: '#/components/schemas/Status'
                  },
                  category: {
                    $ref: '#/components/schemas/Category'
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
          id: 'schema-status',
          type: 'string',
          enum: ['active', 'inactive', 'pending']
        },
        {
          id: 'schema-category',
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' }
          }
        }
      ]
    };

    const simplified = converter.createSimplifiedFieldView(normalized);

    // Should resolve $refs to actual types
    expect(simplified.endpoints['POST /products'].request_fields.name).toBe('string');
    expect(simplified.endpoints['POST /products'].request_fields.tags).toBe('string'); // Status enum is string
    expect(simplified.endpoints['POST /products'].request_fields.category).toEqual({
      id: 'integer',
      name: 'string'
    });
  });

  it('should handle nested objects with $refs correctly', () => {
    const normalized = {
      metadata: {
        title: 'Test API',
        version: '1.0.0'
      },
      endpoints: [
        {
          id: 'endpoint-1',
          path: '/orders',
          method: 'GET',
          responses: { '200': 'response-1' }
        }
      ],
      parameters: [],
      requestBodies: [],
      responses: [
        {
          id: 'response-1',
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  order_id: { type: 'string' },
                  status: { $ref: '#/components/schemas/OrderStatus' },
                  customer: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      membership: { $ref: '#/components/schemas/MembershipLevel' }
                    }
                  },
                  metadata: {
                    type: 'object',
                    properties: {
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Creation timestamp'
                      },
                      flags: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Flag' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ],
      schemas: [
        {
          id: 'schema-orderstatus',
          type: 'string',
          enum: ['pending', 'processing', 'shipped', 'delivered']
        },
        {
          id: 'schema-membershiplevel',
          type: 'string',
          enum: ['bronze', 'silver', 'gold', 'platinum']
        },
        {
          id: 'schema-flag',
          type: 'string',
          enum: ['urgent', 'fragile', 'gift']
        }
      ]
    };

    const simplified = converter.createSimplifiedFieldView(normalized);
    const fields = simplified.endpoints['GET /orders'].response_fields;

    // All fields should be simplified to their types
    expect(fields.order_id).toBe('string');
    expect(fields.status).toBe('string'); // Resolved OrderStatus enum
    expect(fields.customer.id).toBe('integer');
    expect(fields.customer.membership).toBe('string'); // Resolved MembershipLevel enum
    expect(fields.metadata.created_at).toBe('string'); // Should be string, not object with format/description
    expect(fields.metadata.flags).toEqual(['string']); // Array of resolved Flag enum
  });

  it('should handle direct schema properties in convertToFieldView', () => {
    const normalized = {
      metadata: {
        title: 'Test API',
        version: '1.0.0'
      },
      endpoints: [],
      parameters: [],
      requestBodies: [],
      responses: [],
      schemas: [
        {
          id: 'schema-product',
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Product ID',
              minimum: 1
            },
            name: {
              type: 'string',
              description: 'Product name',
              minLength: 1,
              maxLength: 100
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Product price'
            },
            status: {
              $ref: '#/components/schemas/Status'
            }
          }
        },
        {
          id: 'schema-status',
          type: 'string',
          enum: ['available', 'out-of-stock']
        }
      ]
    };

    const fieldView = converter.convertToFieldView(normalized);

    // In full field view, we keep the structure but may want to consider
    // simplifying in the future
    expect(fieldView.schemas['product']).toBeDefined();
    expect(fieldView.schemas['product'].properties.id.type).toBe('integer');
    expect(fieldView.schemas['product'].properties.name.type).toBe('string');

    // For now convertToFieldView keeps full structure,
    // but createSimplifiedFieldView should simplify
  });
});
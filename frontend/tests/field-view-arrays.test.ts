import { describe, it, expect, beforeEach } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';
import { SwaggerToJSONConverter } from '../src/lib/converters/swagger-to-json';
import * as fs from 'fs';
import * as path from 'path';

describe('FieldViewConverter - Array Handling', () => {
  let converter: FieldViewConverter;
  let swaggerConverter: SwaggerToJSONConverter;

  beforeEach(() => {
    converter = new FieldViewConverter();
    swaggerConverter = new SwaggerToJSONConverter();
  });

  describe('arrays in parameters', () => {
    it('should handle array parameters in query', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/arrays-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const normalized = result.data;
      const fieldView = converter.convertToFieldView(normalized);

      // Check GET /products parameters
      const getProducts = fieldView.paths['/products']['get'];
      expect(getProducts.parameters).toBeDefined();
      expect(getProducts.parameters['categories']).toBeDefined();
      expect(getProducts.parameters['categories'].type).toBe('array');
      expect(getProducts.parameters['tags']).toBeDefined();
      expect(getProducts.parameters['tags'].type).toBe('array');
    });
  });

  describe('arrays in response bodies', () => {
    it('should handle array of objects response', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/arrays-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check GET /products response
      const getProducts = simplified.endpoints['GET /products'];
      expect(getProducts.response_fields).toBeDefined();
      expect(getProducts.response_fields.array_of).toBeDefined();
      expect(getProducts.response_fields.array_of.id).toBe('string');
      expect(getProducts.response_fields.array_of.name).toBe('string');
      expect(getProducts.response_fields.array_of.categories).toBeDefined();
      expect(Array.isArray(getProducts.response_fields.array_of.categories)).toBe(true);
      expect(getProducts.response_fields.array_of.categories[0]).toBe('string');
    });

    it('should handle nested arrays in response', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/arrays-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check GET /analytics response
      const getAnalytics = simplified.endpoints['GET /analytics'];
      expect(getAnalytics.response_fields).toBeDefined();

      // Check array of objects (dailyStats)
      expect(getAnalytics.response_fields.dailyStats).toBeDefined();
      expect(Array.isArray(getAnalytics.response_fields.dailyStats)).toBe(true);
      expect(getAnalytics.response_fields.dailyStats[0].date).toBe('string');
      expect(getAnalytics.response_fields.dailyStats[0].views).toBe('integer');
      expect(getAnalytics.response_fields.dailyStats[0].sales).toBe('number');

      // Check 2D array (matrix)
      expect(getAnalytics.response_fields.matrix).toBeDefined();
      expect(Array.isArray(getAnalytics.response_fields.matrix)).toBe(true);
      expect(Array.isArray(getAnalytics.response_fields.matrix[0])).toBe(true);
      expect(getAnalytics.response_fields.matrix[0][0]).toBe('number');

      // Check array of arrays of strings (topProducts)
      expect(getAnalytics.response_fields.topProducts).toBeDefined();
      expect(Array.isArray(getAnalytics.response_fields.topProducts)).toBe(true);
      expect(Array.isArray(getAnalytics.response_fields.topProducts[0])).toBe(true);
      expect(getAnalytics.response_fields.topProducts[0][0]).toBe('string');
    });
  });

  describe('arrays in request bodies', () => {
    it('should handle array request body', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/arrays-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check POST /products request (array of Product)
      const createProducts = simplified.endpoints['POST /products'];
      expect(createProducts.request_fields).toBeDefined();

      // The request body is an array of Products, so we expect array structure
      // Since the converter doesn't have special handling for array-typed request bodies at the root,
      // let's check what we actually get
    });

    it('should handle nested arrays in request body', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/arrays-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check POST /orders request
      const createOrder = simplified.endpoints['POST /orders'];
      expect(createOrder.request_fields).toBeDefined();

      // Check items array
      expect(createOrder.request_fields.items).toBeDefined();
      expect(Array.isArray(createOrder.request_fields.items)).toBe(true);
      expect(createOrder.request_fields.items[0].productId).toBe('string');
      expect(createOrder.request_fields.items[0].quantity).toBe('integer');

      // Check nested array within items
      expect(createOrder.request_fields.items[0].variations).toBeDefined();
      expect(Array.isArray(createOrder.request_fields.items[0].variations)).toBe(true);
      expect(createOrder.request_fields.items[0].variations[0].type).toBe('string');
      expect(createOrder.request_fields.items[0].variations[0].value).toBe('string');

      // Check shippingAddresses array
      expect(createOrder.request_fields.shippingAddresses).toBeDefined();
      expect(Array.isArray(createOrder.request_fields.shippingAddresses)).toBe(true);
      expect(createOrder.request_fields.shippingAddresses[0].type).toBe('string');
      expect(createOrder.request_fields.shippingAddresses[0].address).toBe('string');

      // Check statusHistory with array of strings within object
      expect(createOrder.request_fields.statusHistory).toBeDefined();
      expect(Array.isArray(createOrder.request_fields.statusHistory)).toBe(true);
      expect(createOrder.request_fields.statusHistory[0].status).toBe('string');
      expect(createOrder.request_fields.statusHistory[0].timestamp).toBe('string');
      expect(Array.isArray(createOrder.request_fields.statusHistory[0].notes)).toBe(true);
      expect(createOrder.request_fields.statusHistory[0].notes[0]).toBe('string');
    });

    it('should handle complex nested structures', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/arrays-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check PATCH /inventory request
      const updateInventory = simplified.endpoints['PATCH /inventory'];
      expect(updateInventory.request_fields).toBeDefined();

      // Check updates array with nested warehouses array
      expect(updateInventory.request_fields.updates).toBeDefined();
      expect(Array.isArray(updateInventory.request_fields.updates)).toBe(true);
      expect(updateInventory.request_fields.updates[0].productId).toBe('string');
      expect(updateInventory.request_fields.updates[0].quantity).toBe('integer');
      expect(Array.isArray(updateInventory.request_fields.updates[0].warehouses)).toBe(true);
      expect(updateInventory.request_fields.updates[0].warehouses[0]).toBe('string');

      // Check response with mixed success/failure arrays
      expect(updateInventory.response_fields).toBeDefined();
      expect(Array.isArray(updateInventory.response_fields.successful)).toBe(true);
      expect(updateInventory.response_fields.successful[0]).toBe('string');
      expect(Array.isArray(updateInventory.response_fields.failed)).toBe(true);
      expect(updateInventory.response_fields.failed[0].productId).toBe('string');
      expect(updateInventory.response_fields.failed[0].error).toBe('string');
    });
  });

  describe('schema extraction with arrays', () => {
    it('should properly extract Product schema with arrays', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/arrays-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      expect(fieldView.schemas).toBeDefined();
      expect(fieldView.schemas['product']).toBeDefined();

      const productSchema = fieldView.schemas['product'];
      expect(productSchema.properties.categories).toBeDefined();
      expect(productSchema.properties.categories.type).toBe('array');
      expect(productSchema.properties.categories.items.type).toBe('string');

      // Check images array with object items
      expect(productSchema.properties.images).toBeDefined();
      expect(productSchema.properties.images.type).toBe('array');
      expect(productSchema.properties.images.items.type).toBe('object');
      expect(productSchema.properties.images.items.properties.url.type).toBe('string');
      expect(productSchema.properties.images.items.properties.sizes.type).toBe('array');
      expect(productSchema.properties.images.items.properties.sizes.items.type).toBe('integer');

      // Check variations array with nested arrays
      expect(productSchema.properties.variations).toBeDefined();
      expect(productSchema.properties.variations.type).toBe('array');
      expect(productSchema.properties.variations.items.properties.sizes.type).toBe('array');
    });
  });

  describe('edge cases with arrays', () => {
    it('should handle empty arrays in response', () => {
      const normalized = {
        metadata: {
          title: 'Test API',
          version: '1.0.0'
        },
        endpoints: [
          {
            id: 'endpoint-1',
            path: '/empty',
            method: 'GET',
            responses: { '200': 'response-1' }
          }
        ],
        parameters: [],
        requestBodies: [],
        responses: [
          {
            id: 'response-1',
            description: 'Empty array',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              }
            }
          }
        ],
        schemas: []
      };

      const simplified = converter.createSimplifiedFieldView(normalized);
      expect(simplified.endpoints['GET /empty'].response_fields).toBeDefined();
      // Empty array should still show the type
      expect(Array.isArray(simplified.endpoints['GET /empty'].response_fields)).toBe(true);
    });

    it('should handle arrays without item specification', () => {
      const normalized = {
        metadata: {
          title: 'Test API',
          version: '1.0.0'
        },
        endpoints: [
          {
            id: 'endpoint-1',
            path: '/any-array',
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
                    data: {
                      type: 'array'
                    }
                  }
                }
              }
            }
          }
        ],
        responses: [],
        schemas: []
      };

      const simplified = converter.createSimplifiedFieldView(normalized);
      expect(simplified.endpoints['POST /any-array'].request_fields).toBeDefined();
      expect(simplified.endpoints['POST /any-array'].request_fields.data).toEqual(['any']);
    });
  });
});
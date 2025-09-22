import { describe, it, expect, beforeEach } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';
import { SwaggerToJSONConverter } from '../src/lib/converters/swagger-to-json';
import * as fs from 'fs';
import * as path from 'path';

describe('FieldViewConverter - $ref Resolution', () => {
  let converter: FieldViewConverter;
  let swaggerConverter: SwaggerToJSONConverter;

  beforeEach(() => {
    converter = new FieldViewConverter();
    swaggerConverter = new SwaggerToJSONConverter();
  });

  describe('schema $ref resolution', () => {
    it('should resolve $ref to schema components', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/refs-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check POST /orders request with multiple $refs
      const createOrder = simplified.endpoints['POST /orders'];
      expect(createOrder.request_fields).toBeDefined();

      // Customer $ref should be resolved to Customer schema
      expect(createOrder.request_fields.customer).toBeDefined();
      expect(createOrder.request_fields.customer.id).toBe('string');
      expect(createOrder.request_fields.customer.email).toBe('string');
      expect(createOrder.request_fields.customer.name).toBe('string');

      // Nested $ref within Customer (membershipLevel)
      expect(createOrder.request_fields.customer.membershipLevel).toBe('string');

      // Nested object with $ref (preferences.notifications)
      expect(createOrder.request_fields.customer.preferences).toBeDefined();
      expect(createOrder.request_fields.customer.preferences.newsletter).toBe('boolean');
      expect(createOrder.request_fields.customer.preferences.notifications).toBeDefined();
      expect(createOrder.request_fields.customer.preferences.notifications.email).toBe('boolean');
      expect(createOrder.request_fields.customer.preferences.notifications.sms).toBe('boolean');

      // Array of $refs (items)
      expect(createOrder.request_fields.items).toBeDefined();
      expect(Array.isArray(createOrder.request_fields.items)).toBe(true);
      console.log('items:', JSON.stringify(createOrder.request_fields.items, null, 2));
      expect(createOrder.request_fields.items[0].product).toBeDefined();
      expect(createOrder.request_fields.items[0].quantity).toBe('integer');

      // Same schema referenced multiple times (Address)
      expect(createOrder.request_fields.shippingAddress).toBeDefined();
      expect(createOrder.request_fields.shippingAddress.street).toBe('string');
      expect(createOrder.request_fields.shippingAddress.city).toBe('string');
      expect(createOrder.request_fields.billingAddress).toBeDefined();
      expect(createOrder.request_fields.billingAddress.street).toBe('string');
      expect(createOrder.request_fields.billingAddress.city).toBe('string');

      // Enum $ref (status)
      expect(createOrder.request_fields.status).toBe('string');
    });

    it('should handle nested $refs within arrays', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/refs-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check GET /customers/{customerId}
      const getCustomer = simplified.endpoints['GET /customers/{customerId}'];
      expect(getCustomer.response_fields).toBeDefined();

      // Array of Address $refs
      expect(getCustomer.response_fields.addresses).toBeDefined();
      expect(Array.isArray(getCustomer.response_fields.addresses)).toBe(true);
      expect(getCustomer.response_fields.addresses[0].street).toBe('string');
      expect(getCustomer.response_fields.addresses[0].city).toBe('string');
      expect(getCustomer.response_fields.addresses[0].postalCode).toBe('string');

      // Array of PaymentMethod $refs with nested CardDetails $ref
      expect(getCustomer.response_fields.paymentMethods).toBeDefined();
      expect(Array.isArray(getCustomer.response_fields.paymentMethods)).toBe(true);
      expect(getCustomer.response_fields.paymentMethods[0].type).toBe('string');
      expect(getCustomer.response_fields.paymentMethods[0].cardDetails).toBeDefined();
      expect(getCustomer.response_fields.paymentMethods[0].cardDetails.last4).toBe('string');
      expect(getCustomer.response_fields.paymentMethods[0].cardDetails.brand).toBe('string');
    });

    it('should handle deeply nested $refs', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/refs-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check GET /products with nested $refs
      const listProducts = simplified.endpoints['GET /products'];
      expect(listProducts.response_fields).toBeDefined();

      // Product with nested Price $ref
      expect(listProducts.response_fields.products).toBeDefined();
      expect(Array.isArray(listProducts.response_fields.products)).toBe(true);
      expect(listProducts.response_fields.products[0].price).toBeDefined();
      expect(listProducts.response_fields.products[0].price.amount).toBe('number');
      expect(listProducts.response_fields.products[0].price.currency).toBe('string');

      // Product with nested Category $ref
      expect(listProducts.response_fields.products[0].category).toBeDefined();
      expect(listProducts.response_fields.products[0].category.id).toBe('string');
      expect(listProducts.response_fields.products[0].category.name).toBe('string');

      // Product inventory with Warehouse $ref containing Address $ref
      expect(listProducts.response_fields.products[0].inventory).toBeDefined();
      expect(listProducts.response_fields.products[0].inventory.warehouse).toBeDefined();
      expect(listProducts.response_fields.products[0].inventory.warehouse.location).toBeDefined();
      expect(listProducts.response_fields.products[0].inventory.warehouse.location.street).toBe('string');
    });

    it('should handle self-referencing schemas', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/refs-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Category has self-referencing parent and children
      const listProducts = simplified.endpoints['GET /products'];
      const category = listProducts.response_fields.categories[0];

      expect(category).toBeDefined();
      expect(category.id).toBe('string');
      expect(category.name).toBe('string');

      // Note: Self-referencing schemas should show 'circular-ref'
      // to avoid infinite recursion. The converter should handle this gracefully.
      expect(category.parent).toBe('circular-ref');
      expect(category.children).toEqual(['circular-ref']);
    });

    it('should handle response with $ref at root level', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/refs-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // POST /orders response is a $ref to Order schema
      const createOrder = simplified.endpoints['POST /orders'];
      expect(createOrder.response_fields).toBeDefined();

      // Should have resolved the Order schema
      expect(createOrder.response_fields.id).toBe('string');
      expect(createOrder.response_fields.orderNumber).toBe('string');

      // Nested $refs within Order
      expect(createOrder.response_fields.customer).toBeDefined();
      expect(createOrder.response_fields.customer.id).toBe('string');

      expect(createOrder.response_fields.totals).toBeDefined();
      expect(createOrder.response_fields.totals.subtotal).toBe('number');
      expect(createOrder.response_fields.totals.total).toBe('number');

      expect(createOrder.response_fields.timestamps).toBeDefined();
      expect(createOrder.response_fields.timestamps.created).toBe('string');
    });

    it('should handle $refs in field view schemas', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/refs-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      // Check that schemas are properly extracted
      expect(fieldView.schemas).toBeDefined();

      // Customer schema should be present
      expect(fieldView.schemas['customer']).toBeDefined();
      expect(fieldView.schemas['customer'].properties).toBeDefined();
      expect(fieldView.schemas['customer'].properties.id).toBeDefined();

      // Address schema should be present
      expect(fieldView.schemas['address']).toBeDefined();
      expect(fieldView.schemas['address'].properties).toBeDefined();
      expect(fieldView.schemas['address'].properties.street).toBeDefined();

      // Order schema with its $refs
      expect(fieldView.schemas['order']).toBeDefined();
      expect(fieldView.schemas['order'].properties).toBeDefined();
      // The $refs in Order schema properties might be stored as references or resolved
      // depending on the implementation
    });
  });
});
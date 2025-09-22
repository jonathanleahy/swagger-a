import { describe, it, expect, beforeEach } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';
import { SwaggerToJSONConverter } from '../src/lib/converters/swagger-to-json';
import * as fs from 'fs';
import * as path from 'path';

describe('FieldViewConverter - Parameter Handling', () => {
  let converter: FieldViewConverter;
  let swaggerConverter: SwaggerToJSONConverter;

  beforeEach(() => {
    converter = new FieldViewConverter();
    swaggerConverter = new SwaggerToJSONConverter();
  });

  describe('path parameters', () => {
    it('should extract path parameters with correct types', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check GET /users/{userId}/posts/{postId}
      const getUserPost = simplified.endpoints['GET /users/{userId}/posts/{postId}'];
      expect(getUserPost).toBeDefined();
      expect(getUserPost.parameters).toBeDefined();
      expect(getUserPost.parameters['userId']).toBe('string');
      expect(getUserPost.parameters['postId']).toBe('integer');
    });

    it('should handle path parameters with patterns', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      // Check PUT /items/{itemId} with pattern
      const updateItem = fieldView.paths['/items/{itemId}']['put'];
      expect(updateItem.parameters['itemId']).toBeDefined();
      expect(updateItem.parameters['itemId'].location).toBe('path');
      expect(updateItem.parameters['itemId'].required).toBe(true);
    });
  });

  describe('query parameters', () => {
    it('should extract query parameters including arrays', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check GET /search
      const search = simplified.endpoints['GET /search'];
      expect(search.parameters).toBeDefined();
      expect(search.parameters['q']).toBe('string');
      expect(search.parameters['filters']).toBe('object');
      expect(search.parameters['sort']).toBe('string');
      expect(search.parameters['page']).toBe('integer');
      expect(search.parameters['limit']).toBe('integer');
    });

    it('should handle query parameters with default values', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const search = fieldView.paths['/search']['get'];
      expect(search.parameters['page'].default).toBe(1);
      expect(search.parameters['limit'].default).toBe(20);
    });

    it('should handle array query parameters', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const getUserPost = fieldView.paths['/users/{userId}/posts/{postId}']['get'];
      expect(getUserPost.parameters['fields']).toBeDefined();
      expect(getUserPost.parameters['fields'].type).toBe('array');

      const upload = fieldView.paths['/upload']['post'];
      expect(upload.parameters['tags']).toBeDefined();
      expect(upload.parameters['tags'].type).toBe('array');
    });
  });

  describe('header parameters', () => {
    it('should extract header parameters', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const getUserPost = fieldView.paths['/users/{userId}/posts/{postId}']['get'];
      expect(getUserPost.parameters['X-API-Key']).toBeDefined();
      expect(getUserPost.parameters['X-API-Key'].location).toBe('header');
      expect(getUserPost.parameters['X-API-Key'].required).toBe(true);
      expect(getUserPost.parameters['X-Request-ID']).toBeDefined();
      expect(getUserPost.parameters['X-Request-ID'].location).toBe('header');
      expect(getUserPost.parameters['X-Request-ID'].type).toBe('string');
    });

    it('should handle multiple required headers', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const listUsers = fieldView.paths['/admin/users']['get'];
      expect(listUsers.parameters['X-Admin-Token']).toBeDefined();
      expect(listUsers.parameters['X-Admin-Token'].required).toBe(true);
      expect(listUsers.parameters['X-Audit-User']).toBeDefined();
      expect(listUsers.parameters['X-Audit-User'].required).toBe(true);
    });
  });

  describe('cookie parameters', () => {
    it('should extract cookie parameters', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const getUserPost = fieldView.paths['/users/{userId}/posts/{postId}']['get'];
      expect(getUserPost.parameters['sessionId']).toBeDefined();
      expect(getUserPost.parameters['sessionId'].location).toBe('cookie');
      expect(getUserPost.parameters['sessionId'].type).toBe('string');
    });
  });

  describe('complex parameter scenarios', () => {
    it('should handle endpoints with mixed parameter types', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      const getUserPost = simplified.endpoints['GET /users/{userId}/posts/{postId}'];
      expect(getUserPost.parameters).toBeDefined();

      // Should have both path and query parameters
      expect(Object.keys(getUserPost.parameters).length).toBeGreaterThan(2);
      expect(getUserPost.parameters['userId']).toBeDefined(); // path
      expect(getUserPost.parameters['postId']).toBeDefined(); // path
      expect(getUserPost.parameters['includeComments']).toBeDefined(); // query
      expect(getUserPost.parameters['fields']).toBeDefined(); // query array
      expect(getUserPost.parameters['X-API-Key']).toBeDefined(); // header
      expect(getUserPost.parameters['sessionId']).toBeDefined(); // cookie
    });

    it('should handle object-type query parameters', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const search = fieldView.paths['/search']['get'];
      expect(search.parameters['filters']).toBeDefined();
      expect(search.parameters['filters'].type).toBe('object');

      const listUsers = fieldView.paths['/admin/users']['get'];
      expect(listUsers.parameters['created']).toBeDefined();
      expect(listUsers.parameters['created'].type).toBe('object');
    });

    it('should handle enum parameters', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const search = fieldView.paths['/search']['get'];
      expect(search.parameters['sort']).toBeDefined();
      expect(search.parameters['sort'].type).toBe('string');

      const updateItem = fieldView.paths['/items/{itemId}']['put'];
      expect(updateItem.parameters['fields']).toBeDefined();
      expect(updateItem.parameters['fields'].type).toBe('array');
    });
  });

  describe('parameter validation attributes', () => {
    it('should preserve validation constraints', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const search = fieldView.paths['/search']['get'];
      // Query parameter with minLength/maxLength should still be type string
      expect(search.parameters['q'].type).toBe('string');
      expect(search.parameters['q'].required).toBe(true);

      // Integer parameters with min/max
      expect(search.parameters['page'].type).toBe('integer');
      expect(search.parameters['limit'].type).toBe('integer');
    });
  });

  describe('parameter descriptions', () => {
    it('should preserve parameter descriptions', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/parameters-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const getUserPost = fieldView.paths['/users/{userId}/posts/{postId}']['get'];
      expect(getUserPost.parameters['userId'].description).toBe('User ID');
      expect(getUserPost.parameters['includeComments'].description).toBe('Include comments in response');
      expect(getUserPost.parameters['X-API-Key'].description).toBe('API authentication key');
    });

    it('should resolve parameter $refs to types', () => {
      const normalized = {
        metadata: {
          title: 'Test API',
          version: '1.0.0'
        },
        endpoints: [
          {
            id: 'endpoint-1',
            path: '/test',
            method: 'GET',
            parameters: ['#/components/parameters/GetProcessingCode', 'param-limit'],
            responses: { '200': 'response-1' }
          }
        ],
        parameters: [
          {
            id: 'param-getprocessingcode',
            name: 'processingCode',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['fast', 'normal', 'slow'] }
          },
          {
            id: 'param-limit',
            name: 'limit',
            in: 'query',
            schema: { type: 'integer' }
          }
        ],
        requestBodies: [],
        responses: [
          {
            id: 'response-1',
            description: 'OK'
          }
        ],
        schemas: []
      };

      const simplified = converter.createSimplifiedFieldView(normalized);

      expect(simplified.endpoints['GET /test'].parameters).toBeDefined();
      expect(simplified.endpoints['GET /test'].parameters.processingCode).toBe('string');
      expect(simplified.endpoints['GET /test'].parameters.limit).toBe('integer');
    });
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';
import { SwaggerToJSONConverter } from '../src/lib/converters/swagger-to-json';
import * as fs from 'fs';
import * as path from 'path';

describe('FieldViewConverter', () => {
  let converter: FieldViewConverter;
  let swaggerConverter: SwaggerToJSONConverter;

  beforeEach(() => {
    converter = new FieldViewConverter();
    swaggerConverter = new SwaggerToJSONConverter();
  });

  describe('convertToFieldView', () => {
    it('should convert petstore example to field-based view', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/petstore-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const normalized = result.data;
      const fieldView = converter.convertToFieldView(normalized);

      // Check API info
      expect(fieldView.api_info).toBeDefined();
      expect(fieldView.api_info.title).toBe('Petstore API');
      expect(fieldView.api_info.version).toBe('1.0.0');

      // Check paths structure
      expect(fieldView.paths).toBeDefined();
      expect(fieldView.paths['/pets']).toBeDefined();
      expect(fieldView.paths['/pets']['get']).toBeDefined();
      expect(fieldView.paths['/pets']['post']).toBeDefined();

      // Check GET /pets parameters
      const getPets = fieldView.paths['/pets']['get'];
      expect(getPets.parameters).toBeDefined();
      expect(getPets.parameters['limit']).toBeDefined();
      expect(getPets.parameters['limit'].location).toBe('query');
      expect(getPets.parameters['limit'].type).toBe('integer');
      expect(getPets.parameters['limit'].default).toBe(20);

      expect(getPets.parameters['page']).toBeDefined();
      expect(getPets.parameters['page'].location).toBe('query');
      expect(getPets.parameters['page'].type).toBe('integer');
      expect(getPets.parameters['page'].default).toBe(1);

      // Check POST /pets request body
      const postPets = fieldView.paths['/pets']['post'];
      expect(postPets.request_body).toBeDefined();
      expect(postPets.request_body.required).toBe(true);
      expect(postPets.request_body.content_types).toBeDefined();
      expect(postPets.request_body.content_types['application/json']).toBeDefined();
      expect(postPets.request_body.content_types['application/json'].schema).toBeDefined();

      // Check responses
      expect(getPets.responses).toBeDefined();
      expect(getPets.responses['200']).toBeDefined();
      expect(getPets.responses['200'].description).toBe('A paged array of pets');
      expect(getPets.responses['200'].content_types).toBeDefined();
      expect(getPets.responses['200'].content_types['application/json']).toBeDefined();
    });

    it('should handle path parameters correctly', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/petstore-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const normalized = result.data;
      const fieldView = converter.convertToFieldView(normalized);

      const getPetById = fieldView.paths['/pets/{petId}']['get'];
      expect(getPetById.parameters).toBeDefined();
      expect(getPetById.parameters['petId']).toBeDefined();
      expect(getPetById.parameters['petId'].location).toBe('path');
      expect(getPetById.parameters['petId'].type).toBe('string');
      expect(getPetById.parameters['petId'].required).toBe(true);
    });

    it('should extract schemas with field names as keys', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/petstore-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const normalized = result.data;
      const fieldView = converter.convertToFieldView(normalized);

      expect(fieldView.schemas).toBeDefined();
      expect(fieldView.schemas['pet']).toBeDefined();
      expect(fieldView.schemas['pet'].type).toBe('object');
      expect(fieldView.schemas['pet'].properties).toBeDefined();
      expect(fieldView.schemas['pet'].required).toContain('id');
      expect(fieldView.schemas['pet'].required).toContain('name');

      expect(fieldView.schemas['user']).toBeDefined();
      expect(fieldView.schemas['user'].type).toBe('object');
      expect(fieldView.schemas['user'].properties).toBeDefined();
    });
  });

  describe('createSimplifiedFieldView', () => {
    it('should create simplified view with field extraction', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/petstore-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const normalized = result.data;
      const simplified = converter.createSimplifiedFieldView(normalized);

      // Check basic structure
      expect(simplified.api).toBe('Petstore API v1.0.0');
      expect(simplified.endpoints).toBeDefined();

      // Check GET /pets
      const getPets = simplified.endpoints['GET /pets'];
      expect(getPets).toBeDefined();
      expect(getPets.summary).toBe('List all pets');

      // Check parameters
      expect(getPets.parameters).toBeDefined();
      expect(getPets.parameters['limit']).toBe('integer');
      expect(getPets.parameters['page']).toBe('integer');

      // Check response fields for array response
      expect(getPets.response_fields).toBeDefined();
      // Should be an array of Pet objects
      if (getPets.response_fields.array_of) {
        expect(getPets.response_fields.array_of).toBeDefined();
      }
    });

    it('should extract request body fields correctly', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/petstore-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const normalized = result.data;
      const simplified = converter.createSimplifiedFieldView(normalized);

      // Check POST /pets
      const postPets = simplified.endpoints['POST /pets'];
      expect(postPets).toBeDefined();
      expect(postPets.request_fields).toBeDefined();

      // Should have Pet schema fields
      expect(postPets.request_fields['id']).toBe('integer');
      expect(postPets.request_fields['name']).toBe('string');
      expect(postPets.request_fields['category']).toBe('string');
      expect(postPets.request_fields['status']).toBe('string');
      expect(postPets.request_fields['tags']).toBeDefined();

      // Check response fields
      expect(postPets.response_fields).toBeDefined();
      expect(postPets.response_fields['id']).toBe('integer');
      expect(postPets.response_fields['name']).toBe('string');
    });

    it('should handle PUT requests with both parameters and body', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/petstore-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const normalized = result.data;
      const simplified = converter.createSimplifiedFieldView(normalized);

      const updatePet = simplified.endpoints['PUT /pets/{petId}'];
      expect(updatePet).toBeDefined();

      // Check path parameters
      expect(updatePet.parameters).toBeDefined();
      expect(updatePet.parameters['petId']).toBe('string');

      // Check request body fields
      expect(updatePet.request_fields).toBeDefined();
      expect(updatePet.request_fields['id']).toBe('integer');
      expect(updatePet.request_fields['name']).toBe('string');

      // Check response fields
      expect(updatePet.response_fields).toBeDefined();
      expect(updatePet.response_fields['id']).toBe('integer');
      expect(updatePet.response_fields['name']).toBe('string');
    });

    it('should extract nested object fields', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/petstore-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const normalized = result.data;
      const simplified = converter.createSimplifiedFieldView(normalized);

      const createUser = simplified.endpoints['POST /users'];
      expect(createUser).toBeDefined();

      // Check User schema fields
      expect(createUser.request_fields).toBeDefined();
      expect(createUser.request_fields['id']).toBe('integer');
      expect(createUser.request_fields['username']).toBe('string');
      expect(createUser.request_fields['email']).toBe('string');
      expect(createUser.request_fields['firstName']).toBe('string');
      expect(createUser.request_fields['lastName']).toBe('string');
      expect(createUser.request_fields['phone']).toBe('string');
    });
  });

  describe('edge cases', () => {
    it('should handle endpoints without parameters', () => {
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
            summary: 'Test endpoint',
            parameters: [],
            responses: []
          }
        ],
        parameters: [],
        requestBodies: [],
        responses: [],
        schemas: []
      };

      const fieldView = converter.convertToFieldView(normalized);
      expect(fieldView.paths['/test']['get'].parameters).toEqual({});
    });

    it('should handle endpoints without request body', () => {
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
            summary: 'Test endpoint',
            requestBody: null,
            responses: []
          }
        ],
        parameters: [],
        requestBodies: [],
        responses: [],
        schemas: []
      };

      const simplified = converter.createSimplifiedFieldView(normalized);
      expect(simplified.endpoints['GET /test'].request_fields).toEqual({});
    });

    it('should handle responses without content', () => {
      const normalized = {
        metadata: {
          title: 'Test API',
          version: '1.0.0'
        },
        endpoints: [
          {
            id: 'endpoint-1',
            path: '/test',
            method: 'DELETE',
            summary: 'Delete test',
            responses: ['204:response-1']
          }
        ],
        parameters: [],
        requestBodies: [],
        responses: [
          {
            id: 'response-1',
            description: 'No content',
            content: null
          }
        ],
        schemas: []
      };

      const fieldView = converter.convertToFieldView(normalized);
      expect(fieldView.paths['/test']['delete'].responses['204']).toBeDefined();
      expect(fieldView.paths['/test']['delete'].responses['204'].content_types).toEqual({});
    });
  });
});
import { describe, it, expect } from 'vitest';
import { SwaggerToJSONConverter } from './swagger-to-json';
import { JSONToSwaggerConverter } from './json-to-swagger';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

// Load test fixtures
const loadFixture = (filename: string) => {
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', filename);
  return fs.readFileSync(fixturePath, 'utf-8');
};

describe('SwaggerToJSONConverter', () => {
  const converter = new SwaggerToJSONConverter();

  it('should convert simple Petstore Swagger to normalized JSON', () => {
    const swaggerYaml = loadFixture('petstore-swagger.yaml');
    // const expectedJson = JSON.parse(loadFixture('petstore-normalized.json'));

    const result = converter.convert(swaggerYaml);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    if (result.data) {
      // Check metadata
      expect(result.data.metadata.name).toBe('Petstore API');
      expect(result.data.metadata.version).toBe('1.0.0');
      expect(result.data.metadata.baseUrl).toBe('https://petstore.swagger.io/v1');

      // Check endpoints count
      expect(result.data.endpoints).toHaveLength(4);

      // Check schemas
      expect(result.data.schemas).toHaveLength(3);
      const petSchema = result.data.schemas.find(s => s.name === 'Pet');
      expect(petSchema).toBeDefined();
      expect(petSchema?.required).toEqual(['id', 'name']);

      // Check parameters
      expect(result.data.parameters.length).toBeGreaterThan(0);
      const limitParam = result.data.parameters.find(p => p.name === 'limit');
      expect(limitParam).toBeDefined();
      expect(limitParam?.in).toBe('query');

      // Check responses
      expect(result.data.responses.length).toBeGreaterThan(0);
    }
  });

  it('should handle OpenAPI 3.0 JSON format', () => {
    const swaggerJson = JSON.stringify({
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/test': {
          get: {
            summary: 'Test endpoint',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = converter.convert(swaggerJson);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.metadata.name).toBe('Test API');
    expect(result.data?.endpoints).toHaveLength(1);
    expect(result.data?.endpoints[0].method).toBe('GET');
    expect(result.data?.endpoints[0].path).toBe('/test');
  });

  it('should handle Swagger 2.0 format', () => {
    const swagger2 = JSON.stringify({
      swagger: '2.0',
      info: {
        title: 'Swagger 2.0 API',
        version: '1.0.0',
      },
      host: 'api.example.com',
      basePath: '/v2',
      schemes: ['https'],
      paths: {
        '/users': {
          get: {
            summary: 'Get users',
            responses: {
              '200': {
                description: 'User list',
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/definitions/User',
                  },
                },
              },
            },
          },
        },
      },
      definitions: {
        User: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
          },
        },
      },
    });

    const result = converter.convert(swagger2);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.metadata.baseUrl).toBe('https://api.example.com/v2');
    expect(result.data?.schemas).toHaveLength(1);
    expect(result.data?.schemas[0].name).toBe('User');
  });

  it('should handle schema references correctly', () => {
    const swaggerWithRefs = JSON.stringify({
      openapi: '3.0.0',
      info: {
        title: 'API with References',
        version: '1.0.0',
      },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'Item list',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Item',
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Item',
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Created',
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Item: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              category: {
                $ref: '#/components/schemas/Category',
              },
            },
          },
          Category: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    });

    const result = converter.convert(swaggerWithRefs);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.schemas).toHaveLength(2);

    // Check that references are resolved
    const itemSchema = result.data?.schemas.find(s => s.name === 'Item');
    expect(itemSchema).toBeDefined();
    expect(itemSchema?.properties?.category?.$ref).toBeDefined();
  });

  it('should handle errors gracefully', () => {
    const invalidSwagger = 'This is not valid YAML or JSON';

    const result = converter.convert(invalidSwagger);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });
});

describe('JSONToSwaggerConverter', () => {
  const converter = new JSONToSwaggerConverter();

  it('should convert normalized JSON back to OpenAPI 3.0', () => {
    const normalizedJson = JSON.parse(loadFixture('petstore-normalized.json'));

    const openApiYaml = converter.convertToOpenAPI(normalizedJson, 'yaml');
    const openApiSpec = YAML.parse(openApiYaml);

    expect(openApiSpec.openapi).toBe('3.0.0');
    expect(openApiSpec.info.title).toBe('Petstore API');
    expect(openApiSpec.info.version).toBe('1.0.0');
    expect(openApiSpec.servers[0].url).toBe('https://petstore.swagger.io/v1');

    // Check paths
    expect(openApiSpec.paths['/pets']).toBeDefined();
    expect(openApiSpec.paths['/pets'].get).toBeDefined();
    expect(openApiSpec.paths['/pets'].post).toBeDefined();
    expect(openApiSpec.paths['/pets/{petId}']).toBeDefined();

    // Check components
    expect(openApiSpec.components.schemas.Pet).toBeDefined();
    expect(openApiSpec.components.schemas.Pet.required).toEqual(['id', 'name']);
  });

  it('should convert normalized JSON to Swagger 2.0', () => {
    const normalizedJson = JSON.parse(loadFixture('petstore-normalized.json'));

    const swagger2Yaml = converter.convertToSwagger2(normalizedJson, 'yaml');
    const swagger2Spec = YAML.parse(swagger2Yaml);

    expect(swagger2Spec.swagger).toBe('2.0');
    expect(swagger2Spec.info.title).toBe('Petstore API');
    expect(swagger2Spec.host).toBe('petstore.swagger.io');
    expect(swagger2Spec.basePath).toBe('/v1');
    expect(swagger2Spec.schemes).toContain('https');

    // Check definitions instead of components
    expect(swagger2Spec.definitions.Pet).toBeDefined();
    expect(swagger2Spec.definitions.Pet.required).toEqual(['id', 'name']);
  });

  it('should convert to JSON format when specified', () => {
    const normalizedJson = {
      id: 'test-api',
      metadata: {
        name: 'Test API',
        version: '1.0.0',
        description: 'Test description',
        baseUrl: 'https://api.example.com',
        tags: ['test'],
      },
      endpoints: [
        {
          id: 'endpoint-1',
          path: '/test',
          method: 'GET',
          summary: 'Test endpoint',
          tags: ['test'],
          responses: {
            '200': 'response-1',
          },
        },
      ],
      schemas: [],
      parameters: [],
      responses: [
        {
          id: 'response-1',
          description: 'Success response',
        },
      ],
      requestBodies: [],
    };

    const openApiJson = converter.convertToOpenAPI(normalizedJson, 'json');
    const openApiSpec = JSON.parse(openApiJson);

    expect(openApiSpec.openapi).toBe('3.0.0');
    expect(openApiSpec.info.title).toBe('Test API');
    expect(openApiSpec.paths['/test'].get).toBeDefined();
  });

  it('should handle complex schemas with references', () => {
    const normalizedWithRefs = {
      id: 'ref-api',
      metadata: {
        name: 'Reference API',
        version: '1.0.0',
      },
      endpoints: [
        {
          id: 'endpoint-1',
          path: '/items',
          method: 'POST',
          requestBody: 'request-body-1',
          responses: {
            '201': 'response-1',
          },
        },
      ],
      schemas: [
        {
          id: 'schema-item',
          name: 'Item',
          type: 'object',
          properties: {
            id: { type: 'string' },
            category: { $ref: 'schema-category' },
          },
        },
        {
          id: 'schema-category',
          name: 'Category',
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
      ],
      parameters: [],
      responses: [
        {
          id: 'response-1',
          description: 'Created',
          content: {
            'application/json': {
              schema: 'schema-item',
            },
          },
        },
      ],
      requestBodies: [
        {
          id: 'request-body-1',
          required: true,
          content: {
            'application/json': {
              schema: 'schema-item',
            },
          },
        },
      ],
    };

    const openApiYaml = converter.convertToOpenAPI(normalizedWithRefs, 'yaml');
    const openApiSpec = YAML.parse(openApiYaml);

    // Check schema references
    expect(openApiSpec.components.schemas.Item.properties.category.$ref).toBe(
      '#/components/schemas/Category'
    );

    // Check request body reference
    expect(
      openApiSpec.paths['/items'].post.requestBody.content['application/json'].schema.$ref
    ).toBe('#/components/schemas/Item');
  });

  it('should clean up undefined values', () => {
    const minimalApi = {
      id: 'minimal',
      metadata: {
        name: 'Minimal API',
        version: '1.0.0',
      },
      endpoints: [],
      schemas: [],
      parameters: [],
      responses: [],
      requestBodies: [],
    };

    const openApiYaml = converter.convertToOpenAPI(minimalApi, 'yaml');
    const openApiSpec = YAML.parse(openApiYaml);

    // Check that empty components are not included
    expect(openApiSpec.components?.parameters).toBeUndefined();
    expect(openApiSpec.components?.requestBodies).toBeUndefined();
    expect(openApiSpec.components?.securitySchemes).toBeUndefined();

    // When all components are empty, the components object itself might be removed
    if (openApiSpec.components) {
      expect(openApiSpec.components.schemas).toBeDefined();
    }
  });
});

describe('Round-trip conversion', () => {
  it('should maintain data integrity through conversion cycle', () => {
    const swaggerConverter = new SwaggerToJSONConverter();
    const jsonConverter = new JSONToSwaggerConverter();

    // Load original Swagger
    const originalSwagger = loadFixture('petstore-swagger.yaml');

    // Convert to normalized JSON
    const toJsonResult = swaggerConverter.convert(originalSwagger);
    expect(toJsonResult.success).toBe(true);

    if (!toJsonResult.data) {
      throw new Error('Conversion to JSON failed');
    }

    // Convert back to OpenAPI
    const backToSwagger = jsonConverter.convertToOpenAPI(toJsonResult.data, 'yaml');
    const backToSpec = YAML.parse(backToSwagger);

    // Parse original for comparison
    const originalSpec = YAML.parse(originalSwagger);

    // Check key elements are preserved
    expect(backToSpec.info.title).toBe(originalSpec.info.title);
    expect(backToSpec.info.version).toBe(originalSpec.info.version);
    expect(Object.keys(backToSpec.paths)).toEqual(Object.keys(originalSpec.paths));
    expect(Object.keys(backToSpec.components.schemas)).toEqual(
      Object.keys(originalSpec.components.schemas)
    );
  });
});
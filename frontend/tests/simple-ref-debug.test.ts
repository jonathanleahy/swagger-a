import { describe, it, expect } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';
import { SwaggerToJSONConverter } from '../src/lib/converters/swagger-to-json';

describe('Simple $ref Debug', () => {
  it('should resolve basic enum $ref', () => {
    const yamlContent = `
openapi: 3.0.0
info:
  title: Simple Test
  version: 1.0.0
paths:
  /test:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                level:
                  $ref: '#/components/schemas/Level'
      responses:
        '200':
          description: OK
components:
  schemas:
    Level:
      type: string
      enum: [basic, advanced]
`;

    const converter = new FieldViewConverter();
    const swaggerConverter = new SwaggerToJSONConverter();

    const result = swaggerConverter.convert(yamlContent);
    console.log('Swagger conversion result:', result.success);

    if (result.success && result.data) {
      console.log('Schemas found:', result.data.schemas.map(s => ({ id: s.id, type: s.type, enum: (s as any).enum })));
      console.log('Endpoints found:', result.data.endpoints.map(e => ({ path: e.path, method: e.method, requestBody: e.requestBody })));
      console.log('Request bodies found:', result.data.requestBodies.map(rb => ({ id: rb.id, content: Object.keys(rb.content) })));

      const simplified = converter.createSimplifiedFieldView(result.data);
      console.log('Simplified result:', JSON.stringify(simplified, null, 2));

      const endpoint = simplified.endpoints['POST /test'];
      expect(endpoint.request_fields.level).toBe('string');
    } else {
      throw new Error('Failed to convert');
    }
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';
import { SwaggerToJSONConverter } from '../src/lib/converters/swagger-to-json';

describe('Final Parameter $refs Resolution Demo', () => {
  let converter: FieldViewConverter;
  let swaggerConverter: SwaggerToJSONConverter;

  beforeEach(() => {
    converter = new FieldViewConverter();
    swaggerConverter = new SwaggerToJSONConverter();
  });

  it('should demonstrate that parameter $refs are now correctly resolved to types', () => {
    // This is the exact scenario from the original issue
    const swaggerWithParameterRefs = `
openapi: 3.0.0
info:
  title: Demo API
  version: 1.0.0
paths:
  /api/process:
    get:
      summary: Process data with parameters
      parameters:
        - $ref: '#/components/parameters/GetProcessingCode'
        - $ref: '#/components/parameters/API_KEY'
        - $ref: '#/components/parameters/User_ID'
      responses:
        '200':
          description: Success
components:
  parameters:
    GetProcessingCode:
      name: processingCode
      in: query
      required: true
      description: Processing mode
      schema:
        type: string
        enum: [fast, normal, slow]
    API_KEY:
      name: apiKey
      in: header
      required: true
      description: API authentication key
      schema:
        type: string
    User_ID:
      name: userId
      in: query
      required: false
      description: User identifier
      schema:
        type: string
        format: uuid
`;

    console.log('=== DEMONSTRATING THE FIX ===');

    // Convert the swagger
    const result = swaggerConverter.convert(swaggerWithParameterRefs);
    expect(result.success).toBe(true);

    if (result.success && result.data) {
      console.log('\n1. Raw endpoint parameters from swagger conversion:');
      const endpoint = result.data.endpoints[0];
      console.log(`   ${endpoint.method} ${endpoint.path}:`);
      endpoint.parameters?.forEach((param, index) => {
        console.log(`   [${index}] "${param}"`);
      });

      console.log('\n2. Available parameter definitions:');
      result.data.parameters.forEach(param => {
        console.log(`   - ${param.id} (name: ${param.name}, type: ${param.schema?.type})`);
      });

      // Create simplified field view
      const simplified = converter.createSimplifiedFieldView(result.data);

      console.log('\n3. RESOLVED parameter types in field view:');
      const params = simplified.endpoints['GET /api/process'].parameters;
      Object.entries(params).forEach(([name, type]) => {
        console.log(`   - ${name}: ${type} ✅`);
      });

      console.log('\n🎉 SUCCESS: All parameter $refs are now resolved to proper types!');
      console.log('   - No more raw "#/components/parameters/GetProcessingCode" strings');
      console.log('   - All parameters show their actual types (string, integer, etc.)');
      console.log('   - Case sensitivity and special characters are handled correctly');

      // Verify the specific cases mentioned in the issue
      expect(params.processingCode).toBe('string');
      expect(params.apiKey).toBe('string');
      expect(params.userId).toBe('string');

      // Verify no raw $refs remain
      const parameterValues = Object.values(params);
      parameterValues.forEach(value => {
        expect(value).not.toContain('#/components/parameters/');
      });
    }
  });

  it('should handle edge cases that previously caused issues', () => {
    console.log('\n=== TESTING EDGE CASES ===');

    // Test with various problematic parameter names
    const edgeCaseSwagger = `
openapi: 3.0.0
info:
  title: Edge Case API
  version: 1.0.0
paths:
  /edge-test:
    get:
      parameters:
        - $ref: '#/components/parameters/Special-Chars_123'
        - $ref: '#/components/parameters/UPPER_CASE'
        - $ref: '#/components/parameters/mixedCase'
        - $ref: '#/components/parameters/with.dots'
      responses:
        '200':
          description: Success
components:
  parameters:
    Special-Chars_123:
      name: specialParam
      in: query
      schema:
        type: string
    UPPER_CASE:
      name: upperParam
      in: header
      schema:
        type: integer
    mixedCase:
      name: mixedParam
      in: query
      schema:
        type: boolean
    with.dots:
      name: dottedParam
      in: query
      schema:
        type: number
`;

    const result = swaggerConverter.convert(edgeCaseSwagger);
    expect(result.success).toBe(true);

    if (result.success && result.data) {
      const simplified = converter.createSimplifiedFieldView(result.data);
      const params = simplified.endpoints['GET /edge-test'].parameters;

      console.log('Edge case parameter resolution:');
      Object.entries(params).forEach(([name, type]) => {
        console.log(`   - ${name}: ${type}`);
      });

      // All should be resolved correctly despite problematic names
      expect(Object.keys(params)).toHaveLength(4);
      expect(params.specialParam).toBe('string');
      expect(params.upperParam).toBe('integer');
      expect(params.mixedParam).toBe('boolean');
      expect(params.dottedParam).toBe('number');
    }
  });

  it('should gracefully handle missing parameter definitions', () => {
    console.log('\n=== TESTING MISSING PARAMETERS ===');

    // Test with $refs that don't have corresponding definitions
    const missingParamSwagger = `
openapi: 3.0.0
info:
  title: Missing Param API
  version: 1.0.0
paths:
  /missing-test:
    get:
      parameters:
        - $ref: '#/components/parameters/ExistingParam'
        - $ref: '#/components/parameters/MissingParam'
        - name: directParam
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Success
components:
  parameters:
    ExistingParam:
      name: existing
      in: query
      schema:
        type: string
    # Note: MissingParam is not defined
`;

    const result = swaggerConverter.convert(missingParamSwagger);
    expect(result.success).toBe(true);

    if (result.success && result.data) {
      // This should now show a warning but not crash
      const simplified = converter.createSimplifiedFieldView(result.data);
      const params = simplified.endpoints['GET /missing-test'].parameters;

      console.log('Parameters with missing definitions:');
      Object.entries(params).forEach(([name, type]) => {
        console.log(`   - ${name}: ${type} (resolved)`);
      });

      // Should only include the parameters that exist
      expect(params.existing).toBe('string');
      expect(params.directParam).toBe('string');
      expect(params.MissingParam).toBeUndefined(); // Should not exist
    }
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { FieldViewConverter } from '../src/lib/converters/field-view-converter';
import { SwaggerToJSONConverter } from '../src/lib/converters/swagger-to-json';
import * as fs from 'fs';
import * as path from 'path';

describe('FieldViewConverter - Complex Fields and Headers', () => {
  let converter: FieldViewConverter;
  let swaggerConverter: SwaggerToJSONConverter;

  beforeEach(() => {
    converter = new FieldViewConverter();
    swaggerConverter = new SwaggerToJSONConverter();
  });

  describe('nested object fields', () => {
    it('should handle deeply nested object structures', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/complex-fields-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      // Check POST /companies with nested objects
      const createCompany = simplified.endpoints['POST /companies'];
      expect(createCompany.request_fields).toBeDefined();

      // Check nested headquarters object
      expect(createCompany.request_fields.headquarters).toBeDefined();
      expect(createCompany.request_fields.headquarters.street).toBe('string');
      expect(createCompany.request_fields.headquarters.city).toBe('string');

      // Check deeply nested coordinates
      expect(createCompany.request_fields.headquarters.coordinates).toBeDefined();
      expect(createCompany.request_fields.headquarters.coordinates.latitude).toBe('number');
      expect(createCompany.request_fields.headquarters.coordinates.longitude).toBe('number');
    });

    it('should handle arrays of objects with nested arrays', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/complex-fields-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      const createCompany = simplified.endpoints['POST /companies'];

      // Check departments array with nested employees array
      expect(createCompany.request_fields.departments).toBeDefined();
      expect(Array.isArray(createCompany.request_fields.departments)).toBe(true);
      expect(createCompany.request_fields.departments[0].name).toBe('string');
      expect(createCompany.request_fields.departments[0].budget).toBe('number');

      // Check nested employees array
      expect(createCompany.request_fields.departments[0].employees).toBeDefined();
      expect(Array.isArray(createCompany.request_fields.departments[0].employees)).toBe(true);
      expect(createCompany.request_fields.departments[0].employees[0].id).toBe('string');
      expect(createCompany.request_fields.departments[0].employees[0].skills).toBeDefined();
      expect(Array.isArray(createCompany.request_fields.departments[0].employees[0].skills)).toBe(true);
      expect(createCompany.request_fields.departments[0].employees[0].skills[0]).toBe('string');
    });
  });

  describe('additionalProperties handling', () => {
    it('should handle objects with additionalProperties', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/complex-fields-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      const createCompany = simplified.endpoints['POST /companies'];

      // Check metadata with additionalProperties
      expect(createCompany.request_fields.metadata).toBeDefined();
      expect(createCompany.request_fields.metadata['[key: string]']).toBe('string');
    });

    it('should handle nested additionalProperties with objects', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/complex-fields-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      const getReports = simplified.endpoints['GET /reports'];

      // Check breakdown with different additionalProperties types
      expect(getReports.response_fields.summary.breakdown.byCategory).toBeDefined();
      expect(getReports.response_fields.summary.breakdown.byCategory['[key: string]']).toBe('number');

      // Check nested object in additionalProperties
      expect(getReports.response_fields.summary.breakdown.byRegion).toBeDefined();
      expect(getReports.response_fields.summary.breakdown.byRegion['[key: string]']).toBeDefined();
      expect(getReports.response_fields.summary.breakdown.byRegion['[key: string]'].sales).toBe('number');
      expect(getReports.response_fields.summary.breakdown.byRegion['[key: string]'].units).toBe('integer');
    });

    it('should handle complex additionalProperties structures', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/complex-fields-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      const updateConfig = simplified.endpoints['PUT /configurations'];

      // Check permissions with additionalProperties as array
      expect(updateConfig.request_fields.permissions).toBeDefined();
      expect(updateConfig.request_fields.permissions['[key: string]']).toBeDefined();
      expect(Array.isArray(updateConfig.request_fields.permissions['[key: string]'])).toBe(true);
      expect(updateConfig.request_fields.permissions['[key: string]'][0]).toBe('string');
    });
  });

  describe('3D arrays and complex matrices', () => {
    it('should handle 2D and 3D arrays', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/complex-fields-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const simplified = converter.createSimplifiedFieldView(result.data);

      const getMatrix = simplified.endpoints['GET /matrix-data'];

      // Check 2D array with objects
      expect(getMatrix.response_fields.grid).toBeDefined();
      expect(Array.isArray(getMatrix.response_fields.grid)).toBe(true);
      expect(Array.isArray(getMatrix.response_fields.grid[0])).toBe(true);
      expect(getMatrix.response_fields.grid[0][0].value).toBe('number');
      expect(getMatrix.response_fields.grid[0][0].metadata).toBeDefined();
      expect(getMatrix.response_fields.grid[0][0].metadata.color).toBe('string');

      // Check 3D array (tensor)
      expect(getMatrix.response_fields.tensor).toBeDefined();
      expect(Array.isArray(getMatrix.response_fields.tensor)).toBe(true);
      expect(Array.isArray(getMatrix.response_fields.tensor[0])).toBe(true);
      expect(Array.isArray(getMatrix.response_fields.tensor[0][0])).toBe(true);
      expect(getMatrix.response_fields.tensor[0][0][0]).toBe('number');
    });
  });

  describe('response headers', () => {
    it('should extract response headers', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/headers-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      // Check POST /auth/login headers
      const login = fieldView.paths['/auth/login']['post'];
      expect(login.responses['200']).toBeDefined();
      expect(login.responses['200'].headers).toBeDefined();
      expect(login.responses['200'].headers!['X-Auth-Token']).toBeDefined();
      expect(login.responses['200'].headers!['X-Auth-Token'].description).toBe('Authentication token');
      expect(login.responses['200'].headers!['X-Refresh-Token']).toBeDefined();
      expect(login.responses['200'].headers!['X-Token-Expiry']).toBeDefined();
    });

    it('should handle file download headers', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/headers-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const download = fieldView.paths['/files/{fileId}']['get'];
      expect(download.responses['200'].headers).toBeDefined();
      expect(download.responses['200'].headers!['Content-Disposition']).toBeDefined();
      expect(download.responses['200'].headers!['Content-Type']).toBeDefined();
      expect(download.responses['200'].headers!['Content-Length']).toBeDefined();
      expect(download.responses['200'].headers!['ETag']).toBeDefined();
      expect(download.responses['200'].headers!['Last-Modified']).toBeDefined();
    });

    it('should handle pagination headers', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/headers-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const getData = fieldView.paths['/api/data']['get'];
      expect(getData.responses['200'].headers).toBeDefined();
      expect(getData.responses['200'].headers!['X-Total-Count']).toBeDefined();
      expect(getData.responses['200'].headers!['X-Page']).toBeDefined();
      expect(getData.responses['200'].headers!['X-Per-Page']).toBeDefined();
      expect(getData.responses['200'].headers!['X-Total-Pages']).toBeDefined();
      expect(getData.responses['200'].headers!['Link']).toBeDefined();
    });

    it('should handle async job and rate limit headers', () => {
      const yamlContent = fs.readFileSync(
        path.join(__dirname, 'fixtures/headers-example.yaml'),
        'utf8'
      );
      const result = swaggerConverter.convert(yamlContent);
      if (!result.success || !result.data) {
        throw new Error('Failed to convert swagger');
      }
      const fieldView = converter.convertToFieldView(result.data);

      const startJob = fieldView.paths['/api/async-job']['post'];

      // Check 202 response headers
      expect(startJob.responses['202'].headers).toBeDefined();
      expect(startJob.responses['202'].headers!['Location']).toBeDefined();
      expect(startJob.responses['202'].headers!['X-Job-Id']).toBeDefined();
      expect(startJob.responses['202'].headers!['Retry-After']).toBeDefined();

      // Check 429 response headers
      expect(startJob.responses['429'].headers).toBeDefined();
      expect(startJob.responses['429'].headers!['X-RateLimit-Limit']).toBeDefined();
      expect(startJob.responses['429'].headers!['X-RateLimit-Remaining']).toBeDefined();
      expect(startJob.responses['429'].headers!['X-RateLimit-Reset']).toBeDefined();
    });
  });
});
import YAML from 'yaml';
import type { NormalizedAPI, SwaggerSpec } from '../../types';

export class JSONToSwaggerConverter {
  private schemaMap: Map<string, any> = new Map();
  private parameterMap: Map<string, any> = new Map();
  private responseMap: Map<string, any> = new Map();
  private requestBodyMap: Map<string, any> = new Map();

  convertToOpenAPI(normalized: NormalizedAPI, format: 'json' | 'yaml' = 'yaml'): string {
    const spec = this.buildOpenAPISpec(normalized);

    if (format === 'json') {
      return JSON.stringify(spec, null, 2);
    }

    return YAML.stringify(spec);
  }

  convertToSwagger2(normalized: NormalizedAPI, format: 'json' | 'yaml' = 'yaml'): string {
    const spec = this.buildSwagger2Spec(normalized);

    if (format === 'json') {
      return JSON.stringify(spec, null, 2);
    }

    return YAML.stringify(spec);
  }

  private buildOpenAPISpec(api: NormalizedAPI): SwaggerSpec {
    this.buildMaps(api);

    const spec: SwaggerSpec = {
      openapi: '3.0.0',
      info: {
        title: api.metadata.name,
        version: api.metadata.version,
        description: api.metadata.description,
        license: api.metadata.license,
      },
      servers: api.metadata.baseUrl
        ? [{ url: api.metadata.baseUrl }]
        : undefined,
      paths: this.buildPaths(api),
      components: {
        schemas: this.buildSchemas(api),
        parameters: this.buildComponentParameters(api),
        responses: this.buildComponentResponses(api),
        requestBodies: this.buildComponentRequestBodies(api),
        securitySchemes: this.buildSecuritySchemes(api),
      },
    };

    // Remove undefined values
    this.cleanObject(spec);

    return spec;
  }

  private buildSwagger2Spec(api: NormalizedAPI): SwaggerSpec {
    this.buildMaps(api);

    const url = api.metadata.baseUrl ? new URL(api.metadata.baseUrl) : null;

    const spec: SwaggerSpec = {
      swagger: '2.0',
      info: {
        title: api.metadata.name,
        version: api.metadata.version,
        description: api.metadata.description,
        license: api.metadata.license,
      },
      host: url?.host,
      basePath: url?.pathname || '/',
      schemes: url ? [url.protocol.replace(':', '')] : ['https'],
      paths: this.buildSwagger2Paths(api),
      definitions: this.buildSchemas(api),
      parameters: this.buildComponentParameters(api),
      responses: this.buildComponentResponses(api),
      securityDefinitions: this.buildSwagger2SecurityDefinitions(api),
    };

    // Remove undefined values
    this.cleanObject(spec);

    return spec;
  }

  private buildMaps(api: NormalizedAPI): void {
    // Build schema map
    api.schemas.forEach(schema => {
      this.schemaMap.set(schema.id, schema);
    });

    // Build parameter map
    api.parameters.forEach(param => {
      this.parameterMap.set(param.id, param);
    });

    // Build response map
    api.responses.forEach(response => {
      this.responseMap.set(response.id, response);
    });

    // Build request body map
    api.requestBodies.forEach(body => {
      this.requestBodyMap.set(body.id, body);
    });
  }

  private buildPaths(api: NormalizedAPI): Record<string, any> {
    const paths: Record<string, any> = {};

    api.endpoints.forEach(endpoint => {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      const operation: any = {
        summary: endpoint.summary,
        description: endpoint.description,
        operationId: endpoint.operationId,
        tags: endpoint.tags,
        parameters: this.buildOperationParameters(endpoint.parameters),
        requestBody: this.buildOperationRequestBody(endpoint.requestBody),
        responses: this.buildOperationResponses(endpoint.responses),
        security: endpoint.security,
      };

      // Remove undefined values
      this.cleanObject(operation);

      paths[endpoint.path][endpoint.method.toLowerCase()] = operation;
    });

    return paths;
  }

  private buildSwagger2Paths(api: NormalizedAPI): Record<string, any> {
    const paths: Record<string, any> = {};

    api.endpoints.forEach(endpoint => {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      const operation: any = {
        summary: endpoint.summary,
        description: endpoint.description,
        operationId: endpoint.operationId,
        tags: endpoint.tags,
        parameters: this.buildSwagger2Parameters(endpoint),
        responses: this.buildOperationResponses(endpoint.responses),
        security: endpoint.security,
      };

      // Remove undefined values
      this.cleanObject(operation);

      paths[endpoint.path][endpoint.method.toLowerCase()] = operation;
    });

    return paths;
  }

  private buildOperationParameters(parameterIds?: string[]): any[] | undefined {
    if (!parameterIds || parameterIds.length === 0) {
      return undefined;
    }

    return parameterIds.map(paramId => {
      const param = this.parameterMap.get(paramId);
      if (!param) {
        return { $ref: `#/components/parameters/${paramId}` };
      }

      return {
        name: param.name,
        in: param.in,
        description: param.description,
        required: param.required,
        schema: param.schema,
      };
    });
  }

  private buildSwagger2Parameters(endpoint: any): any[] | undefined {
    const parameters: any[] = [];

    // Add path/query/header parameters
    if (endpoint.parameters) {
      endpoint.parameters.forEach((paramId: string) => {
        const param = this.parameterMap.get(paramId);
        if (param) {
          const swagger2Param: any = {
            name: param.name,
            in: param.in,
            description: param.description,
            required: param.required,
          };

          // In Swagger 2.0, schema properties are at the top level
          if (param.schema) {
            Object.assign(swagger2Param, param.schema);
          }

          parameters.push(swagger2Param);
        }
      });
    }

    // Add body parameter for request body
    if (endpoint.requestBody) {
      const body = this.requestBodyMap.get(endpoint.requestBody);
      if (body) {
        const schema = body.content['application/json']?.schema;
        parameters.push({
          name: 'body',
          in: 'body',
          required: body.required,
          schema: this.resolveSchemaReference(schema),
        });
      }
    }

    return parameters.length > 0 ? parameters : undefined;
  }

  private buildOperationRequestBody(requestBodyId?: string): any {
    if (!requestBodyId) {
      return undefined;
    }

    const body = this.requestBodyMap.get(requestBodyId);
    if (!body) {
      return { $ref: `#/components/requestBodies/${requestBodyId}` };
    }

    return {
      description: body.description,
      required: body.required,
      content: this.buildContent(body.content),
    };
  }

  private buildOperationResponses(responses: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    Object.entries(responses).forEach(([code, responseId]) => {
      const response = this.responseMap.get(responseId);
      if (!response) {
        result[code] = { $ref: `#/components/responses/${responseId}` };
      } else {
        result[code] = {
          description: response.description,
          headers: response.headers,
          content: this.buildContent(response.content),
        };
      }
    });

    return result;
  }

  private buildContent(content?: Record<string, any>): Record<string, any> | undefined {
    if (!content) {
      return undefined;
    }

    const result: Record<string, any> = {};

    Object.entries(content).forEach(([mediaType, mediaTypeObj]) => {
      result[mediaType] = {
        schema: this.resolveSchemaReference(mediaTypeObj.schema),
        example: mediaTypeObj.example,
        examples: mediaTypeObj.examples,
      };
    });

    return result;
  }

  private resolveSchemaReference(schemaRef: string | any): any {
    if (typeof schemaRef === 'string') {
      const schema = this.schemaMap.get(schemaRef);
      if (schema) {
        return { $ref: `#/components/schemas/${schema.name}` };
      }
      return { $ref: schemaRef };
    }

    return schemaRef;
  }

  private buildSchemas(api: NormalizedAPI): Record<string, any> {
    const schemas: Record<string, any> = {};

    api.schemas.forEach(schema => {
      const schemaObj: any = {
        type: schema.type,
        required: schema.required,
        properties: this.buildSchemaProperties(schema.properties),
        items: this.buildSchemaItems(schema.items),
        enum: schema.enum,
        format: schema.format,
        maxItems: schema.maxItems,
        minItems: schema.minItems,
        example: schema.example,
        description: schema.description,
      };

      // Clean up undefined values
      this.cleanObject(schemaObj);

      schemas[schema.name] = schemaObj;
    });

    return schemas;
  }

  private buildSchemaProperties(properties?: Record<string, any>): Record<string, any> | undefined {
    if (!properties) {
      return undefined;
    }

    const result: Record<string, any> = {};

    Object.entries(properties).forEach(([key, prop]) => {
      if (prop.$ref) {
        const schema = this.schemaMap.get(prop.$ref);
        if (schema) {
          result[key] = { $ref: `#/components/schemas/${schema.name}` };
        } else {
          result[key] = prop;
        }
      } else {
        result[key] = prop;
      }
    });

    return result;
  }

  private buildSchemaItems(items?: string | any): any {
    if (!items) {
      return undefined;
    }

    if (typeof items === 'string') {
      const schema = this.schemaMap.get(items);
      if (schema) {
        return { $ref: `#/components/schemas/${schema.name}` };
      }
    }

    return items;
  }

  private buildComponentParameters(api: NormalizedAPI): Record<string, any> | undefined {
    if (api.parameters.length === 0) {
      return undefined;
    }

    const parameters: Record<string, any> = {};

    api.parameters.forEach(param => {
      parameters[param.name] = {
        name: param.name,
        in: param.in,
        description: param.description,
        required: param.required,
        schema: param.schema,
      };
    });

    return parameters;
  }

  private buildComponentResponses(api: NormalizedAPI): Record<string, any> | undefined {
    if (api.responses.length === 0) {
      return undefined;
    }

    const responses: Record<string, any> = {};

    api.responses.forEach(response => {
      const name = response.id.replace('response-', '');
      responses[name] = {
        description: response.description,
        headers: response.headers,
        content: this.buildContent(response.content),
      };
    });

    return responses;
  }

  private buildComponentRequestBodies(api: NormalizedAPI): Record<string, any> | undefined {
    if (api.requestBodies.length === 0) {
      return undefined;
    }

    const bodies: Record<string, any> = {};

    api.requestBodies.forEach(body => {
      const name = body.id.replace('request-body-', '');
      bodies[name] = {
        description: body.description,
        required: body.required,
        content: this.buildContent(body.content),
      };
    });

    return bodies;
  }

  private buildSecuritySchemes(api: NormalizedAPI): Record<string, any> | undefined {
    if (!api.securitySchemes || api.securitySchemes.length === 0) {
      return undefined;
    }

    const schemes: Record<string, any> = {};

    api.securitySchemes.forEach(scheme => {
      const name = scheme.id.replace('security-', '');
      schemes[name] = {
        type: scheme.type,
        name: scheme.name,
        in: scheme.in,
        scheme: scheme.scheme,
        bearerFormat: scheme.bearerFormat,
        flows: scheme.flows,
        openIdConnectUrl: scheme.openIdConnectUrl,
      };
    });

    return schemes;
  }

  private buildSwagger2SecurityDefinitions(api: NormalizedAPI): Record<string, any> | undefined {
    if (!api.securitySchemes || api.securitySchemes.length === 0) {
      return undefined;
    }

    const definitions: Record<string, any> = {};

    api.securitySchemes.forEach(scheme => {
      const name = scheme.id.replace('security-', '');
      definitions[name] = {
        type: scheme.type,
        name: scheme.name,
        in: scheme.in,
      };
    });

    return definitions;
  }

  private cleanObject(obj: any): void {
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined || obj[key] === null) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        this.cleanObject(obj[key]);
        if (Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    });
  }
}
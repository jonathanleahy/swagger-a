import YAML from 'yaml';
import type {
  SwaggerSpec,
  NormalizedAPI,
  Endpoint,
  Schema,
  Parameter,
  Response,
  RequestBody,
  ConversionResult,
  SecurityScheme,
} from '../../types';

export class SwaggerToJSONConverter {
  private idCounters: Record<string, number> = {};
  private schemaRefs: Map<string, string> = new Map();
  private componentRefs: Map<string, string> = new Map();

  convert(swaggerContent: string): ConversionResult {
    try {
      const spec = this.parseSwagger(swaggerContent);
      const normalized = this.normalizeSwagger(spec);

      return {
        success: true,
        data: normalized,
        warnings: this.collectWarnings(spec),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private parseSwagger(content: string): SwaggerSpec {
    try {
      // Try parsing as JSON first
      return JSON.parse(content);
    } catch {
      // If JSON fails, try YAML
      return YAML.parse(content);
    }
  }

  private normalizeSwagger(spec: SwaggerSpec): NormalizedAPI {
    this.resetCounters();
    this.buildReferenceMap(spec);

    const apiId = this.generateId('api', spec.info.title);

    return {
      id: apiId,
      metadata: this.extractMetadata(spec),
      endpoints: this.extractEndpoints(spec),
      schemas: this.extractSchemas(spec),
      parameters: this.extractParameters(spec),
      responses: this.extractResponses(spec),
      requestBodies: this.extractRequestBodies(spec),
      securitySchemes: this.extractSecuritySchemes(spec),
    };
  }

  private extractMetadata(spec: SwaggerSpec) {
    const baseUrl = this.getBaseUrl(spec);
    const tags = this.getAllTags(spec);

    return {
      name: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
      baseUrl,
      license: spec.info.license,
      tags,
    };
  }

  private getBaseUrl(spec: SwaggerSpec): string | undefined {
    if (spec.servers && spec.servers.length > 0) {
      return spec.servers[0].url;
    }
    if (spec.host) {
      const scheme = spec.schemes?.[0] || 'https';
      const basePath = spec.basePath || '';
      return `${scheme}://${spec.host}${basePath}`;
    }
    return undefined;
  }

  private getAllTags(spec: SwaggerSpec): string[] {
    const tags = new Set<string>();

    Object.values(spec.paths || {}).forEach(pathItem => {
      Object.values(pathItem || {}).forEach((operation: any) => {
        if (operation.tags) {
          operation.tags.forEach((tag: string) => tags.add(tag));
        }
      });
    });

    return Array.from(tags);
  }

  private extractEndpoints(spec: SwaggerSpec): Endpoint[] {
    const endpoints: Endpoint[] = [];

    Object.entries(spec.paths || {}).forEach(([path, pathItem]) => {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

      methods.forEach(method => {
        if (pathItem[method]) {
          const operation = pathItem[method];
          const endpointId = this.generateId(
            'endpoint',
            operation.operationId || `${method}-${path}`
          );

          const endpoint: Endpoint = {
            id: endpointId,
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId,
            summary: operation.summary,
            description: operation.description,
            tags: operation.tags,
            parameters: this.extractOperationParameters(operation, pathItem.parameters) ?? [],
            requestBody: this.extractOperationRequestBody(operation),
            responses: this.extractOperationResponses(operation),
            security: operation.security,
          };

          endpoints.push(endpoint);
        }
      });
    });

    return endpoints;
  }

  private extractOperationParameters(operation: any, pathParameters?: any[]): string[] {
    const paramIds: string[] = [];
    const allParams = [...(pathParameters || []), ...(operation.parameters || [])];

    allParams.forEach(param => {
      if (param.$ref) {
        const refId = this.resolveRef(param.$ref);
        if (refId) paramIds.push(refId);
      } else {
        const paramId = this.generateId('param', param.name);
        paramIds.push(paramId);
      }
    });

    return paramIds;
  }

  private extractOperationRequestBody(operation: any): string | undefined {
    if (!operation.requestBody) return undefined;

    if (operation.requestBody.$ref) {
      return this.resolveRef(operation.requestBody.$ref);
    }

    const bodyId = this.generateId('request-body', operation.operationId || 'body');
    return bodyId;
  }

  private extractOperationResponses(operation: any): Record<string, string> {
    const responses: Record<string, string> = {};

    Object.entries(operation.responses || {}).forEach(([code, response]: [string, any]) => {
      if (response.$ref) {
        responses[code] = this.resolveRef(response.$ref);
      } else {
        const responseId = this.generateId(
          'response',
          `${operation.operationId || 'op'}-${code}`
        );
        responses[code] = responseId;
      }
    });

    return responses;
  }

  private extractSchemas(spec: SwaggerSpec): Schema[] {
    const schemas: Schema[] = [];
    const schemaMap = this.getSchemaMap(spec);

    Object.entries(schemaMap).forEach(([name, schema]) => {
      const schemaId = this.generateId('schema', name);

      schemas.push({
        id: schemaId,
        name,
        type: schema.type || 'object',
        required: schema.required,
        properties: this.normalizeProperties(schema.properties),
        items: this.normalizeItems(schema.items),
        enum: schema.enum,
        format: schema.format,
        maxItems: schema.maxItems,
        minItems: schema.minItems,
        example: schema.example,
        description: schema.description,
      });

      this.schemaRefs.set(name, schemaId);
    });

    return schemas;
  }

  private getSchemaMap(spec: SwaggerSpec): Record<string, any> {
    if (spec.components?.schemas) {
      return spec.components.schemas;
    }
    if (spec.definitions) {
      return spec.definitions;
    }
    return {};
  }

  private normalizeProperties(properties: any): Record<string, any> | undefined {
    if (!properties) return undefined;

    const normalized: Record<string, any> = {};

    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
      if (prop.$ref) {
        normalized[key] = { $ref: this.resolveRef(prop.$ref) };
      } else {
        normalized[key] = prop;
      }
    });

    return normalized;
  }

  private normalizeItems(items: any): any {
    if (!items) return undefined;

    if (items.$ref) {
      return this.resolveRef(items.$ref);
    }

    return items;
  }

  private extractParameters(spec: SwaggerSpec): Parameter[] {
    const parameters: Parameter[] = [];
    const seen = new Set<string>();

    // Extract from paths
    Object.values(spec.paths || {}).forEach(pathItem => {
      // Path-level parameters
      if (pathItem.parameters) {
        pathItem.parameters.forEach((param: any) => {
          if (!param.$ref) {
            const key = `${param.name}-${param.in}`;
            if (!seen.has(key)) {
              seen.add(key);
              const paramId = this.generateId('param', param.name);
              parameters.push({
                id: paramId,
                name: param.name,
                in: param.in,
                description: param.description,
                required: param.required,
                schema: param.schema || param,
              });
            }
          }
        });
      }

      // Operation-level parameters
      const methods = ['get', 'post', 'put', 'delete', 'patch'];
      methods.forEach(method => {
        const operation = pathItem[method];
        if (operation?.parameters) {
          operation.parameters.forEach((param: any) => {
            if (!param.$ref) {
              const key = `${param.name}-${param.in}`;
              if (!seen.has(key)) {
                seen.add(key);
                const paramId = this.generateId('param', param.name);
                parameters.push({
                  id: paramId,
                  name: param.name,
                  in: param.in,
                  description: param.description,
                  required: param.required,
                  schema: param.schema || param,
                });
              }
            }
          });
        }
      });
    });

    // Extract from components/parameters
    const componentParams = spec.components?.parameters || spec.parameters || {};
    Object.entries(componentParams).forEach(([name, param]: [string, any]) => {
      const key = `${param.name || name}-${param.in}`;
      if (!seen.has(key)) {
        seen.add(key);
        const paramId = this.generateId('param', name);
        parameters.push({
          id: paramId,
          name: param.name || name,
          in: param.in,
          description: param.description,
          required: param.required,
          schema: param.schema || param,
        });
        this.componentRefs.set(`#/components/parameters/${name}`, paramId);
      }
    });

    return parameters;
  }

  private extractResponses(spec: SwaggerSpec): Response[] {
    const responses: Response[] = [];
    const seen = new Set<string>();

    // Extract from operations
    Object.values(spec.paths || {}).forEach(pathItem => {
      const methods = ['get', 'post', 'put', 'delete', 'patch'];
      methods.forEach(method => {
        const operation = pathItem[method];
        if (operation?.responses) {
          Object.entries(operation.responses).forEach(([code, response]: [string, any]) => {
            if (!response.$ref) {
              const key = `${operation.operationId || method}-${code}`;
              if (!seen.has(key)) {
                seen.add(key);
                const responseId = this.generateId('response', key);
                responses.push({
                  id: responseId,
                  description: response.description || 'Response',
                  headers: response.headers,
                  content: this.normalizeContent(response.content || response.schema) || {},
                });
              }
            }
          });
        }
      });
    });

    // Extract from components/responses
    const componentResponses = spec.components?.responses || spec.responses || {};
    Object.entries(componentResponses).forEach(([name, response]: [string, any]) => {
      const responseId = this.generateId('response', name);
      responses.push({
        id: responseId,
        description: response.description || 'Response',
        headers: response.headers,
        content: this.normalizeContent(response.content || response.schema),
      });
      this.componentRefs.set(`#/components/responses/${name}`, responseId);
    });

    return responses;
  }

  private extractRequestBodies(spec: SwaggerSpec): RequestBody[] {
    const bodies: RequestBody[] = [];
    const seen = new Set<string>();

    // Extract from operations
    Object.values(spec.paths || {}).forEach(pathItem => {
      const methods = ['post', 'put', 'patch'];
      methods.forEach(method => {
        const operation = pathItem[method];
        if (operation?.requestBody && !operation.requestBody.$ref) {
          const key = operation.operationId || `${method}-body`;
          if (!seen.has(key)) {
            seen.add(key);
            const bodyId = this.generateId('request-body', key);
            bodies.push({
              id: bodyId,
              description: operation.requestBody.description,
              content: this.normalizeContent(operation.requestBody.content),
              required: operation.requestBody.required,
            });
          }
        }
      });
    });

    // Extract from components/requestBodies
    const componentBodies = spec.components?.requestBodies || {};
    Object.entries(componentBodies).forEach(([name, body]: [string, any]) => {
      const bodyId = this.generateId('request-body', name);
      bodies.push({
        id: bodyId,
        description: body.description,
        content: this.normalizeContent(body.content) || {},
        required: body.required,
      });
      this.componentRefs.set(`#/components/requestBodies/${name}`, bodyId);
    });

    return bodies;
  }

  private extractSecuritySchemes(spec: SwaggerSpec): SecurityScheme[] | undefined {
    const schemes: SecurityScheme[] = [];
    const securityDefs = spec.components?.securitySchemes || spec.securityDefinitions || {};

    if (Object.keys(securityDefs).length === 0) {
      return undefined;
    }

    Object.entries(securityDefs).forEach(([name, scheme]: [string, any]) => {
      const schemeId = this.generateId('security', name);
      schemes.push({
        id: schemeId,
        type: scheme.type,
        name: scheme.name || name,
        in: scheme.in,
        scheme: scheme.scheme,
        bearerFormat: scheme.bearerFormat,
        flows: scheme.flows,
        openIdConnectUrl: scheme.openIdConnectUrl,
      });
    });

    return schemes;
  }

  private normalizeContent(content: any): Record<string, any> | undefined {
    if (!content) return undefined;

    if (content.type) {
      // Swagger 2.0 style schema
      return {
        'application/json': {
          schema: content,
        },
      };
    }

    // OpenAPI 3.0 style content
    const normalized: Record<string, any> = {};

    Object.entries(content).forEach(([mediaType, mediaTypeObj]: [string, any]) => {
      normalized[mediaType] = {
        schema: mediaTypeObj.schema?.$ref
          ? this.resolveRef(mediaTypeObj.schema.$ref)
          : mediaTypeObj.schema,
        example: mediaTypeObj.example,
        examples: mediaTypeObj.examples,
      };
    });

    return normalized;
  }

  private buildReferenceMap(spec: SwaggerSpec): void {
    // Build schema reference map
    const schemas = this.getSchemaMap(spec);
    Object.keys(schemas).forEach(name => {
      const schemaId = this.generateId('schema', name);
      this.schemaRefs.set(name, schemaId);
      this.componentRefs.set(`#/components/schemas/${name}`, schemaId);
      this.componentRefs.set(`#/definitions/${name}`, schemaId);
    });
  }

  private resolveRef(ref: string): string {
    // Remove the # prefix and resolve
    // const cleanRef = ref.replace(/^#\//, '');

    // Try direct component reference
    if (this.componentRefs.has(ref)) {
      return this.componentRefs.get(ref)!;
    }

    // Try schema reference
    const schemaName = ref.split('/').pop();
    if (schemaName && this.schemaRefs.has(schemaName)) {
      return this.schemaRefs.get(schemaName)!;
    }

    // Return the ref as-is if we can't resolve it
    return ref;
  }

  private generateId(type: string, name?: string): string {
    const sanitized = name
      ? name.toLowerCase().replace(/[^a-z0-9]/g, '-')
      : type;

    if (!this.idCounters[type]) {
      this.idCounters[type] = 0;
    }

    const id = name
      ? `${type}-${sanitized}`
      : `${type}-${++this.idCounters[type]}`;

    return id;
  }

  private resetCounters(): void {
    this.idCounters = {};
    this.schemaRefs.clear();
    this.componentRefs.clear();
  }

  private collectWarnings(spec: SwaggerSpec): string[] {
    const warnings: string[] = [];

    if (!spec.openapi && !spec.swagger) {
      warnings.push('No OpenAPI or Swagger version specified');
    }

    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      warnings.push('No paths defined in the specification');
    }

    return warnings;
  }
}
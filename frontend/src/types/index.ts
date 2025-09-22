export interface APIMetadata {
  name: string;
  version: string;
  description?: string;
  baseUrl?: string;
  license?: {
    name: string;
    url?: string;
  };
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Endpoint {
  id: string;
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: string[];
  requestBody?: string;
  responses: Record<string, string>;
  security?: SecurityRequirement[];
}

export interface Schema {
  id: string;
  name: string;
  type: string;
  required?: string[];
  properties?: Record<string, any>;
  items?: string | any;
  enum?: string[];
  format?: string;
  maxItems?: number;
  minItems?: number;
  example?: any;
  description?: string;
}

export interface Parameter {
  id: string;
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: any;
  style?: string;
  explode?: boolean;
}

export interface Response {
  id: string;
  description: string;
  headers?: Record<string, any>;
  content?: Record<string, MediaType>;
}

export interface RequestBody {
  id: string;
  description?: string;
  content: Record<string, MediaType>;
  required?: boolean;
}

export interface MediaType {
  schema?: string | any;
  example?: any;
  examples?: Record<string, any>;
}

export interface SecurityScheme {
  id: string;
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: any;
  openIdConnectUrl?: string;
}

export interface SecurityRequirement {
  [key: string]: string[];
}

export interface NormalizedAPI {
  id: string;
  metadata: APIMetadata;
  endpoints: Endpoint[];
  schemas: Schema[];
  parameters: Parameter[];
  responses: Response[];
  requestBodies: RequestBody[];
  securitySchemes?: SecurityScheme[];
}

export interface SwaggerSpec {
  openapi?: string;
  swagger?: string;
  info: {
    title: string;
    version: string;
    description?: string;
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
    requestBodies?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  definitions?: Record<string, any>;
  parameters?: Record<string, any>;
  responses?: Record<string, any>;
  securityDefinitions?: Record<string, any>;
}

export interface ConversionResult {
  success: boolean;
  data?: NormalizedAPI;
  error?: string;
  warnings?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path?: string;
    message: string;
    keyword?: string;
    params?: any;
  }>;
  warnings?: string[];
}
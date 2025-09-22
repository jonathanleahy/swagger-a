package domain

import (
	"time"
)

// APIDefinition represents a normalized API structure
type APIDefinition struct {
	ID             string                   `json:"id"`
	Metadata       APIMetadata              `json:"metadata"`
	Endpoints      []Endpoint               `json:"endpoints"`
	Schemas        []Schema                 `json:"schemas"`
	Parameters     []Parameter              `json:"parameters"`
	Responses      []Response               `json:"responses"`
	RequestBodies  []RequestBody            `json:"requestBodies"`
	SecuritySchemes []SecurityScheme        `json:"securitySchemes,omitempty"`
	CreatedAt      time.Time                `json:"createdAt"`
	UpdatedAt      time.Time                `json:"updatedAt"`
}

// APIMetadata contains API metadata information
type APIMetadata struct {
	Name        string            `json:"name"`
	Version     string            `json:"version"`
	Description string            `json:"description,omitempty"`
	BaseURL     string            `json:"baseUrl,omitempty"`
	License     *License          `json:"license,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
}

// License represents API license information
type License struct {
	Name string `json:"name"`
	URL  string `json:"url,omitempty"`
}

// Endpoint represents an API endpoint
type Endpoint struct {
	ID           string                     `json:"id"`
	Path         string                     `json:"path"`
	Method       string                     `json:"method"`
	OperationID  string                     `json:"operationId,omitempty"`
	Summary      string                     `json:"summary,omitempty"`
	Description  string                     `json:"description,omitempty"`
	Tags         []string                   `json:"tags,omitempty"`
	Parameters   []string                   `json:"parameters,omitempty"`
	RequestBody  string                     `json:"requestBody,omitempty"`
	Responses    map[string]string          `json:"responses"`
	Security     []SecurityRequirement      `json:"security,omitempty"`
}

// Schema represents a data schema
type Schema struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Required    []string               `json:"required,omitempty"`
	Properties  map[string]interface{} `json:"properties,omitempty"`
	Items       interface{}            `json:"items,omitempty"`
	Enum        []string               `json:"enum,omitempty"`
	Format      string                 `json:"format,omitempty"`
	MaxItems    int                    `json:"maxItems,omitempty"`
	MinItems    int                    `json:"minItems,omitempty"`
	Example     interface{}            `json:"example,omitempty"`
	Description string                 `json:"description,omitempty"`
}

// Parameter represents an API parameter
type Parameter struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	In          string      `json:"in"`
	Description string      `json:"description,omitempty"`
	Required    bool        `json:"required,omitempty"`
	Schema      interface{} `json:"schema,omitempty"`
	Style       string      `json:"style,omitempty"`
	Explode     bool        `json:"explode,omitempty"`
}

// Response represents an API response
type Response struct {
	ID          string                       `json:"id"`
	Description string                       `json:"description"`
	Headers     map[string]interface{}       `json:"headers,omitempty"`
	Content     map[string]MediaType         `json:"content,omitempty"`
}

// RequestBody represents an API request body
type RequestBody struct {
	ID          string                 `json:"id"`
	Description string                 `json:"description,omitempty"`
	Content     map[string]MediaType   `json:"content"`
	Required    bool                   `json:"required,omitempty"`
}

// MediaType represents a media type
type MediaType struct {
	Schema   interface{}            `json:"schema,omitempty"`
	Example  interface{}            `json:"example,omitempty"`
	Examples map[string]interface{} `json:"examples,omitempty"`
}

// SecurityScheme represents a security scheme
type SecurityScheme struct {
	ID               string      `json:"id"`
	Type             string      `json:"type"`
	Name             string      `json:"name,omitempty"`
	In               string      `json:"in,omitempty"`
	Scheme           string      `json:"scheme,omitempty"`
	BearerFormat     string      `json:"bearerFormat,omitempty"`
	Flows            interface{} `json:"flows,omitempty"`
	OpenIDConnectURL string      `json:"openIdConnectUrl,omitempty"`
}

// SecurityRequirement represents a security requirement
type SecurityRequirement map[string][]string

// ConversionRequest represents a request to convert Swagger to JSON
type ConversionRequest struct {
	SwaggerContent string `json:"swaggerContent"`
	Format         string `json:"format"` // "yaml" or "json"
}

// ConversionResponse represents a conversion response
type ConversionResponse struct {
	Success  bool           `json:"success"`
	Data     *APIDefinition `json:"data,omitempty"`
	Error    string         `json:"error,omitempty"`
	Warnings []string       `json:"warnings,omitempty"`
}

// ValidationRequest represents a validation request
type ValidationRequest struct {
	JSONContent string `json:"jsonContent"`
	SchemaID    string `json:"schemaId,omitempty"`
}

// ValidationResponse represents a validation response
type ValidationResponse struct {
	Valid    bool              `json:"valid"`
	Errors   []ValidationError `json:"errors,omitempty"`
	Warnings []string          `json:"warnings,omitempty"`
}

// ValidationError represents a validation error
type ValidationError struct {
	Path    string      `json:"path,omitempty"`
	Message string      `json:"message"`
	Keyword string      `json:"keyword,omitempty"`
	Params  interface{} `json:"params,omitempty"`
}
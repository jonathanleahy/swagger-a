package ports

import (
	"context"
	"github.com/swagger-editor/backend/internal/core/domain"
)

// ConverterService defines the interface for conversion operations
type ConverterService interface {
	// ConvertSwaggerToJSON converts Swagger/OpenAPI to normalized JSON
	ConvertSwaggerToJSON(ctx context.Context, request *domain.ConversionRequest) (*domain.ConversionResponse, error)

	// ConvertJSONToSwagger converts normalized JSON back to Swagger/OpenAPI
	ConvertJSONToSwagger(ctx context.Context, api *domain.APIDefinition, format string) (string, error)
}

// ValidatorService defines the interface for validation operations
type ValidatorService interface {
	// ValidateSwagger validates a Swagger/OpenAPI specification
	ValidateSwagger(ctx context.Context, content string) (*domain.ValidationResponse, error)

	// ValidateJSON validates JSON against a schema
	ValidateJSON(ctx context.Context, request *domain.ValidationRequest) (*domain.ValidationResponse, error)

	// ValidateAPIDefinition validates an API definition
	ValidateAPIDefinition(ctx context.Context, api *domain.APIDefinition) (*domain.ValidationResponse, error)
}

// APIService defines the interface for API definition operations
type APIService interface {
	// CreateAPIDefinition creates a new API definition
	CreateAPIDefinition(ctx context.Context, api *domain.APIDefinition) (*domain.APIDefinition, error)

	// GetAPIDefinition retrieves an API definition by ID
	GetAPIDefinition(ctx context.Context, id string) (*domain.APIDefinition, error)

	// ListAPIDefinitions lists all API definitions
	ListAPIDefinitions(ctx context.Context) ([]*domain.APIDefinition, error)

	// UpdateAPIDefinition updates an existing API definition
	UpdateAPIDefinition(ctx context.Context, id string, api *domain.APIDefinition) (*domain.APIDefinition, error)

	// DeleteAPIDefinition deletes an API definition
	DeleteAPIDefinition(ctx context.Context, id string) error

	// ImportSwagger imports a Swagger/OpenAPI specification
	ImportSwagger(ctx context.Context, content string) (*domain.APIDefinition, error)

	// ExportSwagger exports an API definition as Swagger/OpenAPI
	ExportSwagger(ctx context.Context, id string, format string) (string, error)
}
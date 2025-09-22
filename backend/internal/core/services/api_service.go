package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/swagger-editor/backend/internal/core/domain"
	"github.com/swagger-editor/backend/internal/core/ports"
)

// APIService implements the API service interface
type APIService struct {
	repo      ports.APIRepository
	converter ports.ConverterService
	validator ports.ValidatorService
}

// NewAPIService creates a new API service
func NewAPIService(
	repo ports.APIRepository,
	converter ports.ConverterService,
	validator ports.ValidatorService,
) *APIService {
	return &APIService{
		repo:      repo,
		converter: converter,
		validator: validator,
	}
}

// CreateAPIDefinition creates a new API definition
func (s *APIService) CreateAPIDefinition(ctx context.Context, api *domain.APIDefinition) (*domain.APIDefinition, error) {
	if api == nil {
		return nil, errors.New("api definition is required")
	}

	// Validate the API definition
	validationResult, err := s.validator.ValidateAPIDefinition(ctx, api)
	if err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	if !validationResult.Valid {
		return nil, fmt.Errorf("api definition is invalid: %v", validationResult.Errors)
	}

	// Generate ID if not provided
	if api.ID == "" {
		api.ID = uuid.New().String()
	}

	// Set timestamps
	now := time.Now()
	api.CreatedAt = now
	api.UpdatedAt = now

	// Save to repository
	if err := s.repo.Save(ctx, api); err != nil {
		return nil, fmt.Errorf("failed to save api definition: %w", err)
	}

	return api, nil
}

// GetAPIDefinition retrieves an API definition by ID
func (s *APIService) GetAPIDefinition(ctx context.Context, id string) (*domain.APIDefinition, error) {
	if id == "" {
		return nil, errors.New("id is required")
	}

	api, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get api definition: %w", err)
	}

	if api == nil {
		return nil, fmt.Errorf("api definition not found: %s", id)
	}

	return api, nil
}

// ListAPIDefinitions lists all API definitions
func (s *APIService) ListAPIDefinitions(ctx context.Context) ([]*domain.APIDefinition, error) {
	apis, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list api definitions: %w", err)
	}

	return apis, nil
}

// UpdateAPIDefinition updates an existing API definition
func (s *APIService) UpdateAPIDefinition(ctx context.Context, id string, api *domain.APIDefinition) (*domain.APIDefinition, error) {
	if id == "" {
		return nil, errors.New("id is required")
	}

	if api == nil {
		return nil, errors.New("api definition is required")
	}

	// Check if API exists
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to find api definition: %w", err)
	}

	if existing == nil {
		return nil, fmt.Errorf("api definition not found: %s", id)
	}

	// Validate the updated API definition
	validationResult, err := s.validator.ValidateAPIDefinition(ctx, api)
	if err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	if !validationResult.Valid {
		return nil, fmt.Errorf("api definition is invalid: %v", validationResult.Errors)
	}

	// Preserve original ID and creation time
	api.ID = id
	api.CreatedAt = existing.CreatedAt
	api.UpdatedAt = time.Now()

	// Update in repository
	if err := s.repo.Update(ctx, api); err != nil {
		return nil, fmt.Errorf("failed to update api definition: %w", err)
	}

	return api, nil
}

// DeleteAPIDefinition deletes an API definition
func (s *APIService) DeleteAPIDefinition(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("id is required")
	}

	// Check if API exists
	exists, err := s.repo.ExistsByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to check api existence: %w", err)
	}

	if !exists {
		return fmt.Errorf("api definition not found: %s", id)
	}

	// Delete from repository
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete api definition: %w", err)
	}

	return nil
}

// ImportSwagger imports a Swagger/OpenAPI specification
func (s *APIService) ImportSwagger(ctx context.Context, content string) (*domain.APIDefinition, error) {
	if content == "" {
		return nil, errors.New("swagger content is required")
	}

	// Validate the Swagger content
	validationResult, err := s.validator.ValidateSwagger(ctx, content)
	if err != nil {
		return nil, fmt.Errorf("swagger validation failed: %w", err)
	}

	if !validationResult.Valid {
		return nil, fmt.Errorf("swagger content is invalid: %v", validationResult.Errors)
	}

	// Convert to normalized API definition
	conversionRequest := &domain.ConversionRequest{
		SwaggerContent: content,
		Format:         "yaml", // Auto-detect format
	}

	conversionResult, err := s.converter.ConvertSwaggerToJSON(ctx, conversionRequest)
	if err != nil {
		return nil, fmt.Errorf("conversion failed: %w", err)
	}

	if !conversionResult.Success {
		return nil, fmt.Errorf("conversion failed: %s", conversionResult.Error)
	}

	if conversionResult.Data == nil {
		return nil, errors.New("conversion produced no data")
	}

	// Create the API definition
	return s.CreateAPIDefinition(ctx, conversionResult.Data)
}

// ExportSwagger exports an API definition as Swagger/OpenAPI
func (s *APIService) ExportSwagger(ctx context.Context, id string, format string) (string, error) {
	if id == "" {
		return "", errors.New("id is required")
	}

	// Validate format
	if format != "yaml" && format != "json" {
		format = "yaml" // Default to YAML
	}

	// Get the API definition
	api, err := s.GetAPIDefinition(ctx, id)
	if err != nil {
		return "", fmt.Errorf("failed to get api definition: %w", err)
	}

	// Convert to Swagger
	swagger, err := s.converter.ConvertJSONToSwagger(ctx, api, format)
	if err != nil {
		return "", fmt.Errorf("failed to convert to swagger: %w", err)
	}

	return swagger, nil
}
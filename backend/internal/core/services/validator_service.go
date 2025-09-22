package services

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/swagger-editor/backend/internal/core/domain"
	"gopkg.in/yaml.v3"
)

// ValidatorService implements the validator service interface
type ValidatorService struct {
}

// ValidateSwagger validates a Swagger/OpenAPI specification
func (s *ValidatorService) ValidateSwagger(ctx context.Context, content string) (*domain.ValidationResponse, error) {
	// Basic validation implementation
	// In production, you would use a proper OpenAPI validator

	var spec map[string]interface{}
	var errors []domain.ValidationError

	// Try to parse as JSON
	err := json.Unmarshal([]byte(content), &spec)
	if err != nil {
		// Try to parse as YAML
		err = yaml.Unmarshal([]byte(content), &spec)
		if err != nil {
			return &domain.ValidationResponse{
				Valid: false,
				Errors: []domain.ValidationError{
					{
						Message: "Invalid JSON or YAML format: " + err.Error(),
					},
				},
			}, nil
		}
	}

	// Check for required fields
	if spec["openapi"] == nil && spec["swagger"] == nil {
		errors = append(errors, domain.ValidationError{
			Path:    "/",
			Message: "Missing required field: openapi or swagger version",
			Keyword: "required",
		})
	}

	if spec["info"] == nil {
		errors = append(errors, domain.ValidationError{
			Path:    "/",
			Message: "Missing required field: info",
			Keyword: "required",
		})
	} else {
		info, ok := spec["info"].(map[string]interface{})
		if ok {
			if info["title"] == nil {
				errors = append(errors, domain.ValidationError{
					Path:    "/info",
					Message: "Missing required field: title",
					Keyword: "required",
				})
			}
			if info["version"] == nil {
				errors = append(errors, domain.ValidationError{
					Path:    "/info",
					Message: "Missing required field: version",
					Keyword: "required",
				})
			}
		}
	}

	if spec["paths"] == nil {
		errors = append(errors, domain.ValidationError{
			Path:    "/",
			Message: "Missing required field: paths",
			Keyword: "required",
		})
	}

	valid := len(errors) == 0

	return &domain.ValidationResponse{
		Valid:  valid,
		Errors: errors,
		Warnings: []string{
			"This is a basic validation. Full OpenAPI validation to be implemented.",
		},
	}, nil
}

// ValidateJSON validates JSON against a schema
func (s *ValidatorService) ValidateJSON(ctx context.Context, request *domain.ValidationRequest) (*domain.ValidationResponse, error) {
	// Basic JSON validation
	var jsonData interface{}
	err := json.Unmarshal([]byte(request.JSONContent), &jsonData)
	if err != nil {
		return &domain.ValidationResponse{
			Valid: false,
			Errors: []domain.ValidationError{
				{
					Message: "Invalid JSON format: " + err.Error(),
				},
			},
		}, nil
	}

	// If schema validation is requested, implement it here
	// For now, just check if it's valid JSON
	return &domain.ValidationResponse{
		Valid: true,
		Warnings: []string{
			"Schema validation not yet implemented. Only JSON syntax validated.",
		},
	}, nil
}

// ValidateAPIDefinition validates an API definition
func (s *ValidatorService) ValidateAPIDefinition(ctx context.Context, api *domain.APIDefinition) (*domain.ValidationResponse, error) {
	var errors []domain.ValidationError

	// Validate metadata
	if api.Metadata.Name == "" {
		errors = append(errors, domain.ValidationError{
			Path:    "/metadata/name",
			Message: "API name is required",
			Keyword: "required",
		})
	}

	if api.Metadata.Version == "" {
		errors = append(errors, domain.ValidationError{
			Path:    "/metadata/version",
			Message: "API version is required",
			Keyword: "required",
		})
	}

	// Validate endpoints
	for i, endpoint := range api.Endpoints {
		if endpoint.Path == "" {
			errors = append(errors, domain.ValidationError{
				Path:    strings.Join([]string{"/endpoints", string(rune(i)), "/path"}, ""),
				Message: "Endpoint path is required",
				Keyword: "required",
			})
		}

		if endpoint.Method == "" {
			errors = append(errors, domain.ValidationError{
				Path:    strings.Join([]string{"/endpoints", string(rune(i)), "/method"}, ""),
				Message: "Endpoint method is required",
				Keyword: "required",
			})
		}

		// Validate HTTP method
		validMethods := map[string]bool{
			"GET": true, "POST": true, "PUT": true, "DELETE": true,
			"PATCH": true, "OPTIONS": true, "HEAD": true,
		}
		if !validMethods[endpoint.Method] {
			errors = append(errors, domain.ValidationError{
				Path:    strings.Join([]string{"/endpoints", string(rune(i)), "/method"}, ""),
				Message: "Invalid HTTP method: " + endpoint.Method,
				Keyword: "enum",
			})
		}
	}

	valid := len(errors) == 0

	return &domain.ValidationResponse{
		Valid:  valid,
		Errors: errors,
	}, nil
}
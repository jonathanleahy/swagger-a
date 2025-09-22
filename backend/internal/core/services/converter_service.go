package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/swagger-editor/backend/internal/core/domain"
	"gopkg.in/yaml.v3"
)

// ConverterService implements the converter service interface
type ConverterService struct {
}

// ConvertSwaggerToJSON converts Swagger/OpenAPI to normalized JSON
func (s *ConverterService) ConvertSwaggerToJSON(ctx context.Context, request *domain.ConversionRequest) (*domain.ConversionResponse, error) {
	// This is a simplified implementation
	// In production, you would use the TypeScript converter or a Go equivalent

	// Parse the content to detect format
	var spec map[string]interface{}
	var err error

	// Try JSON first
	err = json.Unmarshal([]byte(request.SwaggerContent), &spec)
	if err != nil {
		// Try YAML
		err = yaml.Unmarshal([]byte(request.SwaggerContent), &spec)
		if err != nil {
			return &domain.ConversionResponse{
				Success: false,
				Error:   "Failed to parse Swagger content: " + err.Error(),
			}, nil
		}
	}

	// Extract basic information
	info, _ := spec["info"].(map[string]interface{})
	paths, _ := spec["paths"].(map[string]interface{})

	// Create a simplified API definition
	api := &domain.APIDefinition{
		ID: "generated-" + generateID(),
		Metadata: domain.APIMetadata{
			Name:        getStringValue(info, "title", "Untitled API"),
			Version:     getStringValue(info, "version", "1.0.0"),
			Description: getStringValue(info, "description", ""),
		},
		Endpoints:     extractEndpoints(paths),
		Schemas:       []domain.Schema{},
		Parameters:    []domain.Parameter{},
		Responses:     []domain.Response{},
		RequestBodies: []domain.RequestBody{},
	}

	// Extract servers/host for base URL
	if servers, ok := spec["servers"].([]interface{}); ok && len(servers) > 0 {
		if server, ok := servers[0].(map[string]interface{}); ok {
			api.Metadata.BaseURL = getStringValue(server, "url", "")
		}
	} else if host, ok := spec["host"].(string); ok {
		scheme := "https"
		if schemes, ok := spec["schemes"].([]interface{}); ok && len(schemes) > 0 {
			scheme = schemes[0].(string)
		}
		basePath := spec["basePath"]
		if basePath == nil {
			basePath = ""
		}
		api.Metadata.BaseURL = fmt.Sprintf("%s://%s%s", scheme, host, basePath)
	}

	return &domain.ConversionResponse{
		Success:  true,
		Data:     api,
		Warnings: []string{"This is a simplified conversion. Full conversion logic to be implemented."},
	}, nil
}

// ConvertJSONToSwagger converts normalized JSON back to Swagger/OpenAPI
func (s *ConverterService) ConvertJSONToSwagger(ctx context.Context, api *domain.APIDefinition, format string) (string, error) {
	// Create OpenAPI 3.0 structure
	swagger := map[string]interface{}{
		"openapi": "3.0.0",
		"info": map[string]interface{}{
			"title":       api.Metadata.Name,
			"version":     api.Metadata.Version,
			"description": api.Metadata.Description,
		},
		"paths": buildPaths(api.Endpoints),
	}

	if api.Metadata.BaseURL != "" {
		swagger["servers"] = []map[string]string{
			{"url": api.Metadata.BaseURL},
		}
	}

	// Convert to requested format
	if format == "json" {
		bytes, err := json.MarshalIndent(swagger, "", "  ")
		if err != nil {
			return "", err
		}
		return string(bytes), nil
	}

	// Default to YAML
	bytes, err := yaml.Marshal(swagger)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// Helper functions

func generateID() string {
	return fmt.Sprintf("%d", 1234567890)
}

func getStringValue(m map[string]interface{}, key, defaultValue string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return defaultValue
}

func extractEndpoints(paths map[string]interface{}) []domain.Endpoint {
	endpoints := []domain.Endpoint{}

	for path, pathItem := range paths {
		if pathMap, ok := pathItem.(map[string]interface{}); ok {
			for method, operation := range pathMap {
				if opMap, ok := operation.(map[string]interface{}); ok {
					endpoint := domain.Endpoint{
						ID:          fmt.Sprintf("endpoint-%s-%s", method, strings.ReplaceAll(path, "/", "-")),
						Path:        path,
						Method:      strings.ToUpper(method),
						Summary:     getStringValue(opMap, "summary", ""),
						Description: getStringValue(opMap, "description", ""),
						Responses:   make(map[string]string),
					}

					// Extract operation ID
					if opId, ok := opMap["operationId"].(string); ok {
						endpoint.OperationID = opId
					}

					// Extract tags
					if tags, ok := opMap["tags"].([]interface{}); ok {
						for _, tag := range tags {
							if tagStr, ok := tag.(string); ok {
								endpoint.Tags = append(endpoint.Tags, tagStr)
							}
						}
					}

					endpoints = append(endpoints, endpoint)
				}
			}
		}
	}

	return endpoints
}

func buildPaths(endpoints []domain.Endpoint) map[string]interface{} {
	paths := make(map[string]interface{})

	for _, endpoint := range endpoints {
		if paths[endpoint.Path] == nil {
			paths[endpoint.Path] = make(map[string]interface{})
		}

		pathItem := paths[endpoint.Path].(map[string]interface{})

		operation := map[string]interface{}{
			"summary":     endpoint.Summary,
			"description": endpoint.Description,
			"responses": map[string]interface{}{
				"200": map[string]interface{}{
					"description": "Successful response",
				},
			},
		}

		if endpoint.OperationID != "" {
			operation["operationId"] = endpoint.OperationID
		}

		if len(endpoint.Tags) > 0 {
			operation["tags"] = endpoint.Tags
		}

		pathItem[strings.ToLower(endpoint.Method)] = operation
	}

	return paths
}


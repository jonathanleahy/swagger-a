package rest

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/swagger-editor/backend/internal/core/domain"
	"github.com/swagger-editor/backend/internal/core/ports"
)

// Handler handles REST API requests
type Handler struct {
	apiService       ports.APIService
	converterService ports.ConverterService
	validatorService ports.ValidatorService
}

// NewHandler creates a new REST handler
func NewHandler(
	apiService ports.APIService,
	converterService ports.ConverterService,
	validatorService ports.ValidatorService,
) *Handler {
	return &Handler{
		apiService:       apiService,
		converterService: converterService,
		validatorService: validatorService,
	}
}

// ListAPIDefinitions lists all API definitions
func (h *Handler) ListAPIDefinitions(w http.ResponseWriter, r *http.Request) {
	apis, err := h.apiService.ListAPIDefinitions(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, apis)
}

// CreateAPIDefinition creates a new API definition
func (h *Handler) CreateAPIDefinition(w http.ResponseWriter, r *http.Request) {
	var api domain.APIDefinition
	if err := json.NewDecoder(r.Body).Decode(&api); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	created, err := h.apiService.CreateAPIDefinition(r.Context(), &api)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusCreated, created)
}

// GetAPIDefinition retrieves an API definition by ID
func (h *Handler) GetAPIDefinition(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	api, err := h.apiService.GetAPIDefinition(r.Context(), id)
	if err != nil {
		respondWithError(w, http.StatusNotFound, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, api)
}

// UpdateAPIDefinition updates an existing API definition
func (h *Handler) UpdateAPIDefinition(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var api domain.APIDefinition
	if err := json.NewDecoder(r.Body).Decode(&api); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	updated, err := h.apiService.UpdateAPIDefinition(r.Context(), id, &api)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, updated)
}

// DeleteAPIDefinition deletes an API definition
func (h *Handler) DeleteAPIDefinition(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.apiService.DeleteAPIDefinition(r.Context(), id); err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// ConvertSwaggerToJSON converts Swagger to normalized JSON
func (h *Handler) ConvertSwaggerToJSON(w http.ResponseWriter, r *http.Request) {
	var request domain.ConversionRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	result, err := h.converterService.ConvertSwaggerToJSON(r.Context(), &request)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, result)
}

// ConvertJSONToSwagger converts normalized JSON to Swagger
func (h *Handler) ConvertJSONToSwagger(w http.ResponseWriter, r *http.Request) {
	var api domain.APIDefinition
	if err := json.NewDecoder(r.Body).Decode(&api); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "yaml"
	}

	result, err := h.converterService.ConvertJSONToSwagger(r.Context(), &api, format)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Return as text for YAML, JSON for JSON format
	if format == "yaml" {
		w.Header().Set("Content-Type", "text/yaml")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(result))
	} else {
		respondWithJSON(w, http.StatusOK, json.RawMessage(result))
	}
}

// ValidateSwagger validates a Swagger specification
func (h *Handler) ValidateSwagger(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	result, err := h.validatorService.ValidateSwagger(r.Context(), request.Content)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, result)
}

// ValidateJSON validates JSON against a schema
func (h *Handler) ValidateJSON(w http.ResponseWriter, r *http.Request) {
	var request domain.ValidationRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	result, err := h.validatorService.ValidateJSON(r.Context(), &request)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, result)
}

// ImportSwagger imports a Swagger specification
func (h *Handler) ImportSwagger(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	api, err := h.apiService.ImportSwagger(r.Context(), request.Content)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusCreated, api)
}

// ExportSwagger exports an API definition as Swagger
func (h *Handler) ExportSwagger(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "yaml"
	}

	content, err := h.apiService.ExportSwagger(r.Context(), id, format)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Set appropriate content type
	if format == "yaml" {
		w.Header().Set("Content-Type", "text/yaml")
		w.Header().Set("Content-Disposition", "attachment; filename=swagger.yaml")
	} else {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", "attachment; filename=swagger.json")
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(content))
}

// Helper functions

func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
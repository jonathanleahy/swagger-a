package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
	"github.com/swagger-editor/backend/internal/adapters/primary/rest"
	"github.com/swagger-editor/backend/internal/adapters/secondary/repository"
	"github.com/swagger-editor/backend/internal/core/services"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	// Initialize repositories (in-memory for now)
	apiRepo := repository.NewInMemoryAPIRepository()

	// Initialize services with placeholders for converter and validator
	// These will be implemented with actual logic later
	converterService := &services.ConverterService{}
	validatorService := &services.ValidatorService{}
	apiService := services.NewAPIService(apiRepo, converterService, validatorService)

	// Create router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)

	// CORS
	corsMiddleware := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	r.Use(corsMiddleware.Handler)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "healthy",
			"service": "swagger-editor-backend",
		})
	})

	// REST API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Initialize REST handlers
		restHandler := rest.NewHandler(apiService, converterService, validatorService)

		// API definitions
		r.Get("/definitions", restHandler.ListAPIDefinitions)
		r.Post("/definitions", restHandler.CreateAPIDefinition)
		r.Get("/definitions/{id}", restHandler.GetAPIDefinition)
		r.Put("/definitions/{id}", restHandler.UpdateAPIDefinition)
		r.Delete("/definitions/{id}", restHandler.DeleteAPIDefinition)

		// Conversion endpoints
		r.Post("/convert/swagger-to-json", restHandler.ConvertSwaggerToJSON)
		r.Post("/convert/json-to-swagger", restHandler.ConvertJSONToSwagger)

		// Validation endpoints
		r.Post("/validate/swagger", restHandler.ValidateSwagger)
		r.Post("/validate/json", restHandler.ValidateJSON)

		// Import/Export
		r.Post("/import", restHandler.ImportSwagger)
		r.Get("/export/{id}", restHandler.ExportSwagger)
	})

	// GraphQL endpoint (placeholder for now)
	r.Post("/graphql", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "GraphQL endpoint will be available soon",
		})
	})

	// GraphQL playground
	r.Get("/graphql", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>GraphQL Playground</title>
				<style>
					body { font-family: sans-serif; padding: 20px; }
					h1 { color: #333; }
					.info { background: #f0f0f0; padding: 20px; border-radius: 5px; }
				</style>
			</head>
			<body>
				<h1>GraphQL Playground</h1>
				<div class="info">
					<p>GraphQL endpoint will be available at <code>/graphql</code></p>
					<p>The playground will be activated once GraphQL is fully configured.</p>
				</div>
			</body>
			</html>
		`))
	})

	// Static file server for frontend (if needed in production)
	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	})

	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("📍 REST API: http://localhost:%s/api/v1", port)
	log.Printf("📍 GraphQL: http://localhost:%s/graphql", port)
	log.Printf("📍 Health: http://localhost:%s/health", port)

	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), r); err != nil {
		log.Fatal(err)
	}
}
.PHONY: help setup dev build test clean frontend-dev backend-dev

# Default target
help:
	@echo "Swagger Editor - Available Commands:"
	@echo "  make setup       - Install all dependencies"
	@echo "  make dev         - Run both frontend and backend in dev mode"
	@echo "  make frontend    - Run only frontend"
	@echo "  make backend     - Run only backend"
	@echo "  make build       - Build production artifacts"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make test        - Run all tests"

# Setup project
setup:
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install
	@echo "Installing backend dependencies..."
	@cd backend && go mod download
	@echo "Setup complete!"

# Run development environment
dev:
	@./run.sh

# Run frontend only
frontend:
	@cd frontend && npm run dev

# Run backend only
backend:
	@cd backend && go run cmd/api/main.go

# Build production
build:
	@./build-all.sh

# Clean build artifacts
clean:
	@rm -rf frontend/dist frontend/node_modules
	@rm -rf backend/bin backend/tmp
	@echo "Clean complete!"

# Run tests
test:
	@echo "Running frontend tests..."
	@cd frontend && npm test
	@echo "Running backend tests..."
	@cd backend && go test ./...
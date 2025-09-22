package ports

import (
	"context"
	"github.com/swagger-editor/backend/internal/core/domain"
)

// APIRepository defines the interface for API definition persistence
type APIRepository interface {
	// Save stores an API definition
	Save(ctx context.Context, api *domain.APIDefinition) error

	// FindByID retrieves an API definition by ID
	FindByID(ctx context.Context, id string) (*domain.APIDefinition, error)

	// FindAll retrieves all API definitions
	FindAll(ctx context.Context) ([]*domain.APIDefinition, error)

	// Update updates an existing API definition
	Update(ctx context.Context, api *domain.APIDefinition) error

	// Delete removes an API definition
	Delete(ctx context.Context, id string) error

	// ExistsByID checks if an API definition exists
	ExistsByID(ctx context.Context, id string) (bool, error)
}
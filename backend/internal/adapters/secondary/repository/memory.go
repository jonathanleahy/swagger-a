package repository

import (
	"context"
	"errors"
	"sync"

	"github.com/swagger-editor/backend/internal/core/domain"
)

// InMemoryAPIRepository is an in-memory implementation of APIRepository
type InMemoryAPIRepository struct {
	mu     sync.RWMutex
	apis   map[string]*domain.APIDefinition
	nextID int
}

// NewInMemoryAPIRepository creates a new in-memory API repository
func NewInMemoryAPIRepository() *InMemoryAPIRepository {
	return &InMemoryAPIRepository{
		apis: make(map[string]*domain.APIDefinition),
	}
}

// Save stores an API definition
func (r *InMemoryAPIRepository) Save(ctx context.Context, api *domain.APIDefinition) error {
	if api == nil {
		return errors.New("api definition cannot be nil")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	r.apis[api.ID] = api
	return nil
}

// FindByID retrieves an API definition by ID
func (r *InMemoryAPIRepository) FindByID(ctx context.Context, id string) (*domain.APIDefinition, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	api, exists := r.apis[id]
	if !exists {
		return nil, nil
	}

	// Return a copy to prevent external modifications
	apiCopy := *api
	return &apiCopy, nil
}

// FindAll retrieves all API definitions
func (r *InMemoryAPIRepository) FindAll(ctx context.Context) ([]*domain.APIDefinition, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	apis := make([]*domain.APIDefinition, 0, len(r.apis))
	for _, api := range r.apis {
		apiCopy := *api
		apis = append(apis, &apiCopy)
	}

	return apis, nil
}

// Update updates an existing API definition
func (r *InMemoryAPIRepository) Update(ctx context.Context, api *domain.APIDefinition) error {
	if api == nil {
		return errors.New("api definition cannot be nil")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.apis[api.ID]; !exists {
		return errors.New("api definition not found")
	}

	r.apis[api.ID] = api
	return nil
}

// Delete removes an API definition
func (r *InMemoryAPIRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.apis[id]; !exists {
		return errors.New("api definition not found")
	}

	delete(r.apis, id)
	return nil
}

// ExistsByID checks if an API definition exists
func (r *InMemoryAPIRepository) ExistsByID(ctx context.Context, id string) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	_, exists := r.apis[id]
	return exists, nil
}
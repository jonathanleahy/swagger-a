# Swagger Editor & JSON Converter

A full-stack application for editing Swagger/OpenAPI specifications and converting them to a normalized JSON format optimized for database storage.

## Features

- **Swagger/OpenAPI Editor**: Monaco-based editor with syntax highlighting and validation
- **Bidirectional Conversion**: Convert between Swagger/OpenAPI and normalized JSON format
- **Real-time Validation**: Instant feedback on specification errors
- **Multiple Format Support**: Handles both OpenAPI 3.0 and Swagger 2.0
- **JSON/YAML Support**: Works with both JSON and YAML formats
- **Database-Ready Output**: Normalized JSON structure designed for efficient storage
- **Modern UI**: Built with React, TypeScript, Tailwind CSS, and shadcn/ui components

## Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for fast development and building
- Monaco Editor for code editing
- Tailwind CSS v3 for styling
- shadcn/ui for UI components
- Vitest for testing

### Backend
- Go with Hexagonal Architecture
- GraphQL with gqlgen
- Domain-driven design patterns
- RESTful endpoints for file operations

## Quick Start

### Development Mode

Run both frontend and backend with hot reload:

```bash
./dev-all.sh
```

This starts:
- Frontend at http://localhost:5173
- Backend at http://localhost:8082
- GraphQL playground at http://localhost:8082/graphql

### Build Production

Build both frontend and backend:

```bash
./build-all.sh
```

## Project Structure

```
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── editor/      # Swagger editor component
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── lib/             # Core libraries
│   │   │   ├── converters/  # Swagger ↔ JSON converters
│   │   │   └── validators/  # JSON/YAML validators
│   │   └── types/           # TypeScript type definitions
│   └── tests/
│       └── fixtures/        # Test fixtures with sample files
│
├── backend/                  # Go backend with hexagonal architecture
│   ├── cmd/                 # Application entrypoints
│   ├── internal/
│   │   ├── core/           # Core business logic
│   │   │   ├── domain/     # Domain models
│   │   │   ├── ports/      # Port interfaces
│   │   │   └── services/   # Business services
│   │   ├── adapters/       # External adapters
│   │   │   ├── primary/    # API handlers (REST, GraphQL)
│   │   │   └── secondary/  # Database, external services
│   │   └── infrastructure/ # Infrastructure concerns
│   └── graph/              # GraphQL schema and resolvers
│
├── scripts/                 # Development and build scripts
├── dev-all.sh              # Start development servers
├── build-all.sh            # Build production artifacts
└── stop-dev.sh             # Stop all development servers
```

## Normalized JSON Format

The application converts Swagger/OpenAPI specifications into a normalized format optimized for database storage:

```json
{
  "metadata": {
    "title": "API Title",
    "version": "1.0.0",
    "description": "API Description",
    "servers": [...]
  },
  "endpoints": [
    {
      "id": "unique-endpoint-id",
      "path": "/api/endpoint",
      "method": "GET",
      "operationId": "getEndpoint",
      "summary": "Endpoint summary",
      "parameters": [...],
      "responses": [...]
    }
  ],
  "schemas": {
    "SchemaName": {
      "type": "object",
      "properties": {...}
    }
  },
  "security": [...],
  "tags": [...]
}
```

## Development

### Frontend Development

```bash
cd frontend
npm install
npm run dev      # Start dev server
npm run test     # Run tests
npm run build    # Build for production
```

### Backend Development

```bash
cd backend
go mod download
./dev.sh         # Start with hot reload
go test ./...    # Run tests
go build         # Build binary
```

### Running Tests

Frontend tests:
```bash
cd frontend
npm run test
npm run test:coverage
```

Backend tests:
```bash
cd backend
go test ./...
go test -cover ./...
```

## API Documentation

### GraphQL API

Access the GraphQL playground at http://localhost:8082/graphql when running in development mode.

### REST Endpoints

- `POST /api/upload` - Upload Swagger/OpenAPI files
- `GET /api/download/:id` - Download converted JSON
- `POST /api/validate` - Validate Swagger specification

## Configuration

### Frontend Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8082
VITE_GRAPHQL_URL=http://localhost:8082/graphql
```

### Backend Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=8082
ENV=development
DATABASE_URL=your-database-url
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issues page.
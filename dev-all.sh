#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Swagger Editor Development Environment${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup INT TERM

# Start backend
echo -e "${GREEN}Starting Backend (Go + GraphQL)...${NC}"
cd backend
if command -v air &> /dev/null; then
    air &
else
    go run cmd/api/main.go &
fi
BACKEND_PID=$!

# Start frontend
echo -e "${GREEN}Starting Frontend (React + Vite)...${NC}"
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${YELLOW}Frontend: http://localhost:5173${NC}"
echo -e "${YELLOW}Backend:  http://localhost:8082${NC}"
echo -e "${YELLOW}GraphQL:  http://localhost:8082/graphql${NC}"
echo -e "\nPress Ctrl+C to stop all services"

# Wait for all background processes
wait
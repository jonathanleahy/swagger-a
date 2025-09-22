#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${GREEN}🚀 Starting Swagger Editor${NC}"
echo -e "${YELLOW}Working directory: $SCRIPT_DIR${NC}"

# Change to the script directory (project root)
cd "$SCRIPT_DIR"

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Check if backend dependencies are installed
if [ ! -d "backend/vendor" ] && [ ! -f "backend/go.sum" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && go mod download && cd ..
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup INT TERM

# Start backend
echo -e "${GREEN}Starting Backend...${NC}"
cd "$SCRIPT_DIR/backend"
go run cmd/api/main.go &
BACKEND_PID=$!

# Start frontend
echo -e "${GREEN}Starting Frontend...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${YELLOW}Frontend: http://localhost:4000${NC}"
echo -e "${YELLOW}Backend:  http://localhost:8082${NC}"
echo -e "\nPress Ctrl+C to stop all services"

# Wait for all background processes
wait
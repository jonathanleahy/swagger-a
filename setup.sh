#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Setting up Swagger Editor${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    echo -e "${YELLOW}Current directory: $(pwd)${NC}"
    exit 1
fi

# Install frontend dependencies
echo -e "${GREEN}📦 Installing frontend dependencies...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${YELLOW}Frontend dependencies already installed${NC}"
fi

# Install backend dependencies
echo -e "${GREEN}📦 Installing backend dependencies...${NC}"
cd ../backend
go mod download

# Create necessary directories
mkdir -p tmp

echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${YELLOW}To start the development environment, run:${NC}"
echo -e "${YELLOW}  ./dev-all.sh${NC}"
echo -e "${YELLOW}Or to run services separately:${NC}"
echo -e "${YELLOW}  Frontend: cd frontend && npm run dev${NC}"
echo -e "${YELLOW}  Backend:  cd backend && go run cmd/api/main.go${NC}"
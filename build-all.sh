#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📦 Building Swagger Editor Production${NC}"

# Build frontend
echo -e "${YELLOW}Building Frontend...${NC}"
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Build backend
echo -e "${YELLOW}Building Backend...${NC}"
cd ../backend
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/api cmd/api/main.go
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend built successfully${NC}"

echo -e "${GREEN}🎉 Build complete!${NC}"
echo -e "Frontend dist: ./frontend/dist"
echo -e "Backend binary: ./backend/bin/api"
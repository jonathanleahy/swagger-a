#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Troubleshooting Swagger Editor Setup${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check Node.js
echo -e "${YELLOW}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "✅ Node.js installed: $NODE_VERSION"
    if [[ ! "$NODE_VERSION" =~ ^v1[68-9]\.|^v2[0-9]\. ]]; then
        echo -e "${RED}⚠️  Warning: Node.js version should be 16 or higher${NC}"
    fi
else
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo -e "${YELLOW}   Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

# Check npm
echo -e "${YELLOW}Checking npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "✅ npm installed: $NPM_VERSION"
else
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Check Go
echo -e "${YELLOW}Checking Go...${NC}"
if command -v go &> /dev/null; then
    GO_VERSION=$(go version)
    echo -e "✅ Go installed: $GO_VERSION"
else
    echo -e "${RED}❌ Go is not installed${NC}"
    echo -e "${YELLOW}   Please install Go from https://golang.org/${NC}"
    exit 1
fi

# Check directory structure
echo ""
echo -e "${YELLOW}Checking project structure...${NC}"
if [ -d "frontend" ] && [ -d "backend" ]; then
    echo -e "✅ Project directories exist"
else
    echo -e "${RED}❌ Missing project directories${NC}"
    echo -e "${YELLOW}   Current directory: $(pwd)${NC}"
    echo -e "${YELLOW}   Make sure you're in the project root directory${NC}"
    exit 1
fi

# Check frontend dependencies
echo ""
echo -e "${YELLOW}Checking frontend dependencies...${NC}"
if [ -d "frontend/node_modules" ]; then
    if [ -d "frontend/node_modules/@vitejs/plugin-react" ]; then
        echo -e "✅ Frontend dependencies installed"
    else
        echo -e "${RED}❌ Frontend dependencies incomplete${NC}"
        echo -e "${YELLOW}   Running npm install...${NC}"
        cd frontend && npm install
        cd ..
    fi
else
    echo -e "${RED}❌ Frontend dependencies not installed${NC}"
    echo -e "${YELLOW}   Installing now...${NC}"
    cd frontend && npm install
    cd ..
fi

# Check backend dependencies
echo ""
echo -e "${YELLOW}Checking backend dependencies...${NC}"
if [ -f "backend/go.mod" ]; then
    echo -e "✅ Backend go.mod exists"
    cd backend && go mod download && cd ..
    echo -e "✅ Backend dependencies downloaded"
else
    echo -e "${RED}❌ Backend go.mod missing${NC}"
fi

# Check ports
echo ""
echo -e "${YELLOW}Checking ports...${NC}"
if lsof -i:4000 &> /dev/null; then
    echo -e "${RED}⚠️  Port 4000 is in use${NC}"
    echo -e "${YELLOW}   Process using port 4000:${NC}"
    lsof -i:4000 | grep LISTEN
else
    echo -e "✅ Port 4000 is available"
fi

if lsof -i:8082 &> /dev/null; then
    echo -e "${RED}⚠️  Port 8082 is in use${NC}"
    echo -e "${YELLOW}   Process using port 8082:${NC}"
    lsof -i:8082 | grep LISTEN
else
    echo -e "✅ Port 8082 is available"
fi

echo ""
echo -e "${GREEN}🎉 Troubleshooting complete!${NC}"
echo ""
echo -e "${YELLOW}To run the application:${NC}"
echo -e "  ./run.sh"
echo -e "${YELLOW}Or:${NC}"
echo -e "  make dev"
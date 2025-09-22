#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Stopping all development services...${NC}"

# Kill processes on common ports
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:8082 | xargs kill -9 2>/dev/null

# Kill any remaining node/go processes related to the project
pkill -f "vite" 2>/dev/null
pkill -f "air" 2>/dev/null
pkill -f "swagger-editor" 2>/dev/null

echo -e "${GREEN}✅ All services stopped${NC}"
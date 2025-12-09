#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         C2C Marketplace - Starting Services               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created. Please update it with your configuration.${NC}"
fi

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null 2>&1; then
    echo -e "${RED}✗ Docker Compose is not available.${NC}"
    echo -e "${YELLOW}  Please install Docker Compose or use 'docker-compose' instead.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Stopping existing containers...${NC}"
docker compose down 2>/dev/null || true

echo ""
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
echo -e "${YELLOW}   This may take a few minutes on first run...${NC}"
echo ""

# Start services
if docker compose up --build -d; then
    echo ""
    echo -e "${GREEN}✓ Services started successfully!${NC}"
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  Services Running                          ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Frontend:  http://localhost:3000                         ║${NC}"
    echo -e "${GREEN}║  Backend:   http://localhost:8080                         ║${NC}"
    echo -e "${GREEN}║  MongoDB:   localhost:27017                               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}📊 Checking service status...${NC}"
    sleep 3
    docker compose ps
    echo ""
    echo -e "${YELLOW}📝 To view logs, run:${NC}"
    echo -e "   docker compose logs -f"
    echo ""
    echo -e "${YELLOW}🛑 To stop services, run:${NC}"
    echo -e "   docker compose down"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Failed to start services${NC}"
    echo -e "${YELLOW}  Check the logs with: docker compose logs${NC}"
    exit 1
fi

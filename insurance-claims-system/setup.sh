#!/bin/bash
# SafeGuard Insurance Claims Management System - Setup Script
# This script installs dependencies, sets up the database, and starts both servers.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SafeGuard Insurance - Setup Script    ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is required but not installed.${NC}"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL client is required but not installed.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites satisfied.${NC}"

# Set up environment
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo -e "${GREEN}.env file created. Please update with your database credentials if needed.${NC}"
fi

# Source environment variables
export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)

# Create database if it doesn't exist
echo -e "${YELLOW}Setting up database...${NC}"
DB_NAME="${DB_NAME:-safeguard_insurance}"
DB_USER="${DB_USER:-postgres}"

if psql -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${GREEN}Database '$DB_NAME' already exists.${NC}"
else
    echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
    createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || echo -e "${YELLOW}Could not create database automatically. Please create it manually.${NC}"
fi

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd "$SCRIPT_DIR/backend"
npm install

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
npm run db:migrate

# Seed database
echo -e "${YELLOW}Seeding database...${NC}"
npm run db:seed

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!                       ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "To start the application:"
echo -e "  Backend:  cd backend && npm run dev"
echo -e "  Frontend: cd frontend && npm run dev"
echo ""
echo -e "Or start both at once:"
echo -e "  Terminal 1: cd $SCRIPT_DIR/backend && npm run dev"
echo -e "  Terminal 2: cd $SCRIPT_DIR/frontend && npm run dev"
echo ""
echo -e "Demo Accounts:"
echo -e "  Policyholder:      john.doe@safeguard.com / Policyholder#2024!Secure"
echo -e "  Claims Adjuster:   adjuster.mike@safeguard.com / Adjuster#Mike2024!Sec"
echo -e "  Claims Manager:    manager.lisa@safeguard.com / Manager#Lisa2024!Sec!"
echo -e "  Compliance Officer: compliance.tom@safeguard.com / Compliance#Tom2024!S!"
echo -e "  Executive:         exec.patricia@safeguard.com / Executive#Pat2024!Se!"
echo ""
echo -e "${GREEN}Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}Backend API: http://localhost:3001${NC}"
echo -e "${GREEN}Health Check: http://localhost:3001/api/health${NC}"

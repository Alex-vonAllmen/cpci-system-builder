#!/bin/bash

# cpci-system-builder Productive Startup Script
# This script builds the frontend and starts the backend server in production mode.

set -e # Exit on error

# Directory resolution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "--- Starting Productive Deployment ---"
echo "Project Root: $PROJECT_ROOT"

# 1. Frontend Build
echo "--- [1/3] Building Frontend ---"
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
echo "Building frontend..."
npm run build

# 2. Backend Setup
echo "--- [2/3] Setting up Backend ---"
cd "$PROJECT_ROOT/backend"
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source "$PROJECT_ROOT/backend/venv/bin/activate"

echo "Installing backend dependencies..."
pip install -r requirements.txt

echo " ensuring database is initialized..."
python seed.py

# 3. Start Server
echo "--- [3/3] Starting Backend Server ---"
echo "Starting Uvicorn on 127.0.0.1:8000 with 4 workers..."
# Use exec to replace the shell with uvicorn process
exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4

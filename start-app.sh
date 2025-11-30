#!/bin/bash

# Function to kill background processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $(jobs -p)
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

echo "Starting cPCI System Builder..."

# Start Backend
echo "Starting Backend (Port 8000)..."
cd backend
# Check if venv exists, if so activate it
if [ -d "venv" ]; then
    source venv/bin/activate
fi
uvicorn app.main:app --reload &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend (Port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "App is running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

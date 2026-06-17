#!/bin/bash
# EBI 循证投资 — Quick Start (macOS / Linux)
# Starts Python backend + frontend HTTP server

set -e

echo "⚡ EBI 循证投资 — Starting up..."

# --- Python backend ---
echo ""
echo "[1/3] Setting up Python backend..."

# Check if venv exists, create if not
if [ ! -d "server/venv" ]; then
  echo "  Creating Python venv..."
  cd server
  python3 -m venv venv
  cd ..
fi

# Install deps
echo "  Installing Python dependencies..."
source server/venv/bin/activate
pip install -r server/requirements.txt --quiet

# Start backend in background
echo "  Starting backend on :8000..."
source server/venv/bin/activate
uvicorn server.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# --- Frontend HTTP server ---
echo ""
echo "[2/3] Starting frontend HTTP server on :8080..."
cd src
python3 -m http.server 8080 &
FRONTEND_PID=$!
cd ..
echo "  Frontend PID: $FRONTEND_PID"

# --- Done ---
echo ""
echo "✅ EBI 循证投资 is running!"
echo "   Frontend:  http://localhost:8080"
echo "   Backend API: http://localhost:8000"
echo "   API Docs:   http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

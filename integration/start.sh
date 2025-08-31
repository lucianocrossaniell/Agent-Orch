#!/bin/bash

# Agent Orchestration Integration Layer Startup Script

echo "🚀 Starting Agent Orchestration Integration Layer..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if pip is available
if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
    echo "❌ pip is required but not installed."
    exit 1
fi

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt || pip3 install -r requirements.txt
fi

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"

# Start the integration layer
echo "🔗 Starting integration layer on http://localhost:8000"
echo "📱 React UI should connect to this endpoint"
echo "📚 API documentation: http://localhost:8000/docs"
echo "🔌 WebSocket endpoint: ws://localhost:8000/ws"
echo ""
echo "Press Ctrl+C to stop the server"

cd src && python main.py
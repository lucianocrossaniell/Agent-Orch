#!/bin/bash

# 🤖 Single Agent - Simple Startup Script
# This script sets up and runs your AI agent

set -e  # Exit if any command fails

# Colors for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🤖 Single Agent Startup Script"
echo "=============================="

# Function to print colored messages
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Python is installed
print_step "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8 or newer."
    exit 1
fi
print_success "Python 3 found"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_step "Creating virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_success "Virtual environment already exists"
fi

# Activate virtual environment
print_step "Activating virtual environment..."
source venv/bin/activate
print_success "Virtual environment activated"

# Install dependencies
print_step "Installing Python packages..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
print_success "All packages installed"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_step "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit the .env file and add your OpenAI API key!"
    print_warning "You can get an API key from: https://platform.openai.com/api-keys"
    echo ""
    echo "1. Open the .env file in a text editor"
    echo "2. Replace 'your_openai_api_key_here' with your actual API key"
    echo "3. Save the file and run this script again"
    echo ""
    exit 1
fi

# Check if OpenAI API key is set
print_step "Checking OpenAI API key..."
source .env
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
    print_error "OpenAI API key not set in .env file"
    print_warning "Please edit .env and add your OpenAI API key"
    print_warning "Get one from: https://platform.openai.com/api-keys"
    exit 1
fi
print_success "OpenAI API key found"

# Start the agent
print_step "Starting the AI agent..."
echo ""
echo "🎉 Setup complete! Your agent is starting..."
echo ""
echo "📱 Open 'chat.html' in your browser to chat with your agent"
echo "📚 Visit http://localhost:8000/docs for API documentation"  
echo "🛑 Press Ctrl+C to stop the agent"
echo ""

# Run the main application
python main.py
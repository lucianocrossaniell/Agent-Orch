# 🐳 Dockerfile for Single Agent
# This builds a Docker container that runs your AI agent
# 
# To build: docker build -t single-agent .
# To run: docker run -p 8000:8000 --env-file .env single-agent

# Use Python 3.11 slim image (lightweight)
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create a non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Tell Docker which port the app uses
EXPOSE 8000

# Health check - test if the agent is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)" || exit 1

# Run the agent when the container starts
CMD ["python", "main.py"]
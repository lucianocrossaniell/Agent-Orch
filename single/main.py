# Main web server file - this creates the API that the chat interface talks to
# When you visit http://localhost:8000 in your browser, this code handles it

import logging
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Import our agent and settings
from single_agent import SingleAgent
from config import settings

# Set up logging so we can see what's happening
logging.basicConfig(level=getattr(logging, settings.log_level))
logger = logging.getLogger(__name__)

# Create the web application
app = FastAPI(
    title=f"{settings.agent_name} API",  # Shows up in the web docs
    description=settings.agent_description,
    version="1.0.0"
)

# Enable CORS so the HTML chat page can talk to this API
# This allows your chat.html file to make requests to the server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any website
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Try to create the agent when the server starts
try:
    agent = SingleAgent()
    logger.info("🤖 Agent initialized successfully!")
except Exception as e:
    logger.error(f"❌ Failed to initialize agent: {str(e)}")
    logger.error("💡 Make sure your .env file has a valid OPENAI_API_KEY")
    agent = None

# Define what the API requests and responses look like
class QueryRequest(BaseModel):
    """What a chat message from the user looks like"""
    query: str  # The user's question or message
    session_id: Optional[str] = None  # Optional session tracking

class QueryResponse(BaseModel):
    """What the agent's response looks like"""
    query: str  # The original question
    response: str  # The agent's answer
    session_id: Optional[str] = None  # Session tracking
    agent_name: str  # Which agent answered
    status: str  # "success" or "error"

# API ENDPOINTS - These are the URLs that the chat interface can call

@app.get("/")
async def root():
    """
    Simple health check - visit http://localhost:8000 to see this
    """
    return {
        "message": f"🤖 {settings.agent_name} is running!",
        "status": "healthy",
        "agent_available": agent is not None,
        "tip": "Try the chat interface at chat.html or visit /docs for API documentation"
    }

@app.get("/health")
async def health_check():
    """
    Detailed health check - used by the chat interface to see if agent is ready
    """
    if agent is None:
        raise HTTPException(
            status_code=503, 
            detail="Agent not initialized - check your OpenAI API key in .env file"
        )
    
    # Use BaseAgent's built-in health check
    health_status = agent.get_health_status()
    
    # Add additional info
    health_status["settings"] = {
        "port": settings.port,
        "model": settings.openai_model
    }
    
    return health_status

@app.post("/agent/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """
    Main chat endpoint - this is where the chat interface sends messages.
    Post a message here and get the agent's response back.
    """
    if agent is None:
        raise HTTPException(
            status_code=503, 
            detail="Agent not ready - check your OpenAI API key in .env file"
        )
    
    try:
        # Send the user's message to the agent and get a response
        # Use the new BaseAgent method process_task instead of process_query
        result = await agent.process_task(request.query, {"session_id": request.session_id})
        
        # Map BaseAgent response to our API response format
        response = QueryResponse(
            query=result["task"],
            response=result["result"],
            session_id=request.session_id,
            agent_name=result["agent_name"], 
            status=result["status"]
        )
        return response
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.get("/agent/info")
async def get_agent_info():
    """
    Get information about what the agent can do.
    Useful for debugging or displaying agent capabilities.
    """
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    return agent.get_agent_info()

@app.get("/agent/tools")
async def get_available_tools():
    """
    Get a list of tools the agent can use (like calculator, text processor).
    """
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    # Use BaseAgent's built-in method for getting tools
    return {
        "tools": agent.get_available_tools()
    }

@app.get("/agent/network-status")
async def get_network_status():
    """
    Get network-specific status information for orchestration.
    """
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    return {
        "agent_id": agent.agent_id,
        "network_status": agent.network_status,
        "network_ready": agent.network_status == "ready",
        "capabilities": {
            "inter_agent_messaging": True,
            "workflow_execution": True,
            "context_sharing": True
        },
        "endpoints": {
            "health": "/health",
            "info": "/agent/info", 
            "query": "/agent/query",
            "tools": "/agent/tools",
            "network_status": "/agent/network-status"
        }
    }

# This runs the web server when you execute: python main.py
if __name__ == "__main__":
    print(f"🚀 Starting {settings.agent_name} server...")
    print(f"📱 Chat interface: Open chat.html in your browser")
    print(f"📚 API documentation: http://localhost:{settings.port}/docs")
    print(f"❓ Health check: http://localhost:{settings.port}/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Allow connections from anywhere
        port=settings.port,  # Use the port from .env file (default 8000)
        reload=True,  # Restart automatically when code changes
        log_level=settings.log_level.lower()
    )
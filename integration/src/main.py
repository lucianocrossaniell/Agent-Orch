"""
Agent Orchestration Integration Layer

This is the main API server that:
1. Manages multiple SingleAgent instances
2. Routes messages between agents based on UI connections
3. Provides API endpoints for the React UI
4. Handles agent lifecycle (create, start, stop, delete)
5. Executes workflows across connected agents
"""

import logging
import asyncio
import uuid
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models import (
    AgentInstance, AgentConfig, CreateAgentRequest, UpdateAgentRequest,
    AgentQueryRequest, MessageRouteRequest, WorkflowExecutionRequest,
    AgentConnection, AgentStatus
)
from agent_manager import AgentManager
from message_router import MessageRouter

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global instances
agent_manager: AgentManager = None
message_router: MessageRouter = None
websocket_connections: List[WebSocket] = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic"""
    global agent_manager, message_router
    
    # Startup
    logger.info("🚀 Starting Agent Orchestration Integration Layer")
    agent_manager = AgentManager()
    message_router = MessageRouter(agent_manager)
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Agent Orchestration Integration Layer")
    if agent_manager:
        # Stop all running agents
        for agent_id in list(agent_manager.agents.keys()):
            await agent_manager.stop_agent(agent_id)

# Create FastAPI app
app = FastAPI(
    title="Agent Orchestration Integration Layer",
    description="API for managing and orchestrating multiple AI agents",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health and status endpoints
@app.get("/")
async def root():
    """Root endpoint with system status"""
    return {
        "message": "🤖 Agent Orchestration Integration Layer",
        "status": "running",
        "agents": len(agent_manager.agents) if agent_manager else 0,
        "connections": len(message_router.connections) if message_router else 0,
        "endpoints": {
            "agents": "/agents",
            "connections": "/connections", 
            "messages": "/messages",
            "workflows": "/workflows",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "timestamp": asyncio.get_event_loop().time(),
        "system": {
            "agent_manager": agent_manager is not None,
            "message_router": message_router is not None,
            "agents": len(agent_manager.agents) if agent_manager else 0,
            "connections": len(message_router.connections) if message_router else 0
        }
    }

# Agent management endpoints
@app.post("/agents", response_model=AgentInstance)
async def create_agent(request: CreateAgentRequest):
    """Create and start a new agent instance"""
    try:
        agent_id = str(uuid.uuid4())
        
        config = AgentConfig(
            id=agent_id,
            name=request.name,
            type=request.type,
            port=0,  # Will be assigned by agent_manager
            model=request.model,
            prompt=request.prompt,
            openai_api_key=request.openai_api_key
        )
        
        agent = await agent_manager.create_agent(config)
        
        # Notify WebSocket clients
        await broadcast_agent_update(agent)
        
        return agent
        
    except Exception as e:
        logger.error(f"Failed to create agent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agents", response_model=List[AgentInstance])
async def list_agents():
    """List all agent instances"""
    return await agent_manager.list_agents()

@app.get("/agents/{agent_id}", response_model=AgentInstance)
async def get_agent(agent_id: str):
    """Get specific agent details"""
    agent = await agent_manager.get_agent_status(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@app.put("/agents/{agent_id}")
async def update_agent(agent_id: str, request: UpdateAgentRequest):
    """Update agent configuration"""
    agent = await agent_manager.get_agent_status(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Update configuration
    if request.name:
        agent.config.name = request.name
    if request.model:
        agent.config.model = request.model  
    if request.prompt:
        agent.config.prompt = request.prompt
    if request.openai_api_key:
        agent.config.openai_api_key = request.openai_api_key
    
    # Restart agent if it's running to apply changes
    if agent.status == AgentStatus.RUNNING:
        await agent_manager.stop_agent(agent_id)
        await agent_manager.start_agent(agent_id)
    
    updated_agent = await agent_manager.get_agent_status(agent_id)
    await broadcast_agent_update(updated_agent)
    
    return updated_agent

@app.post("/agents/{agent_id}/start")
async def start_agent(agent_id: str):
    """Start an agent"""
    success = await agent_manager.start_agent(agent_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start agent")
    
    agent = await agent_manager.get_agent_status(agent_id)
    await broadcast_agent_update(agent)
    
    return {"status": "started", "agent_id": agent_id}

@app.post("/agents/{agent_id}/stop")
async def stop_agent(agent_id: str):
    """Stop an agent"""
    success = await agent_manager.stop_agent(agent_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to stop agent")
    
    agent = await agent_manager.get_agent_status(agent_id)
    await broadcast_agent_update(agent)
    
    return {"status": "stopped", "agent_id": agent_id}

@app.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent"""
    success = await agent_manager.delete_agent(agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Remove any connections involving this agent
    connections_to_remove = []
    for conn_id, conn in message_router.connections.items():
        if conn.from_agent == agent_id or conn.to_agent == agent_id:
            connections_to_remove.append(conn_id)
    
    for conn_id in connections_to_remove:
        message_router.remove_connection(conn_id)
    
    await broadcast_message({
        "type": "agent_deleted",
        "agent_id": agent_id,
        "connections_removed": connections_to_remove
    })
    
    return {"status": "deleted", "agent_id": agent_id}

@app.post("/agents/{agent_id}/query")
async def query_agent(agent_id: str, request: AgentQueryRequest):
    """Send a query to a specific agent"""
    try:
        response = await agent_manager.send_query_to_agent(agent_id, request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Connection management endpoints
@app.post("/connections")
async def create_connection(connection: AgentConnection):
    """Create a connection between agents"""
    message_router.add_connection(connection)
    
    await broadcast_message({
        "type": "connection_added",
        "connection": connection.dict()
    })
    
    return {"status": "created", "connection_id": connection.id}

@app.get("/connections")
async def list_connections():
    """List all connections"""
    return message_router.get_connections()

@app.delete("/connections/{connection_id}")
async def delete_connection(connection_id: str):
    """Delete a connection"""
    message_router.remove_connection(connection_id)
    
    await broadcast_message({
        "type": "connection_removed", 
        "connection_id": connection_id
    })
    
    return {"status": "deleted", "connection_id": connection_id}

# Message routing endpoints
@app.post("/messages/route")
async def route_message(request: MessageRouteRequest):
    """Route a message between agents"""
    try:
        result = await message_router.route_message(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/messages/broadcast")
async def broadcast_agent_message(request: dict):
    """Broadcast a message from one agent to all connected agents"""
    from_agent = request.get("from_agent")
    message = request.get("message")
    context = request.get("context")
    
    if not from_agent or not message:
        raise HTTPException(status_code=400, detail="from_agent and message are required")
    
    try:
        results = await message_router.broadcast_message(from_agent, message, context)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/messages/history")
async def get_message_history(limit: int = 100):
    """Get message routing history"""
    return message_router.get_message_history(limit)

# Workflow execution endpoints
@app.post("/workflows/execute")
async def execute_workflow(request: WorkflowExecutionRequest):
    """Execute a workflow across connected agents"""
    try:
        # Add connections to message router
        for connection in request.connections:
            message_router.add_connection(connection)
        
        # Execute workflow
        result = await message_router.execute_workflow(
            request.agents,
            request.initial_message, 
            request.context
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket connection for real-time updates"""
    await websocket.accept()
    websocket_connections.append(websocket)
    
    try:
        # Send initial state
        await websocket.send_json({
            "type": "initial_state",
            "agents": [agent.dict() for agent in await agent_manager.list_agents()],
            "connections": [conn.dict() for conn in message_router.get_connections()]
        })
        
        # Keep connection alive
        while True:
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        websocket_connections.remove(websocket)

# Helper functions
async def broadcast_agent_update(agent: AgentInstance):
    """Broadcast agent update to WebSocket clients"""
    await broadcast_message({
        "type": "agent_updated",
        "agent": agent.dict()
    })

async def broadcast_message(message: dict):
    """Broadcast message to all WebSocket clients"""
    if not websocket_connections:
        return
    
    disconnected = []
    for websocket in websocket_connections:
        try:
            await websocket.send_json(message)
        except:
            disconnected.append(websocket)
    
    # Remove disconnected clients
    for websocket in disconnected:
        websocket_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting Agent Orchestration Integration Layer...")
    print("📱 React UI should connect to: http://localhost:8000")
    print("📚 API documentation: http://localhost:8000/docs")
    print("🔌 WebSocket endpoint: ws://localhost:8000/ws")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
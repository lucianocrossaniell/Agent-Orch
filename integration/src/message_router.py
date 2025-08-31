import asyncio
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import uuid

from models import AgentConnection, MessageRouteRequest
from agent_manager import AgentManager

logger = logging.getLogger(__name__)

@dataclass
class RoutedMessage:
    id: str
    from_agent: str
    to_agent: str
    message: str
    context: Optional[Dict[str, Any]]
    timestamp: str
    status: str  # "pending", "sent", "delivered", "error"
    response: Optional[str] = None
    error: Optional[str] = None

class MessageRouter:
    """Routes messages between agents based on UI connections"""
    
    def __init__(self, agent_manager: AgentManager):
        self.agent_manager = agent_manager
        self.connections: Dict[str, AgentConnection] = {}
        self.message_history: Dict[str, RoutedMessage] = {}
        
    def add_connection(self, connection: AgentConnection):
        """Add a connection between agents"""
        self.connections[connection.id] = connection
        logger.info(f"Added connection: {connection.from_agent} -> {connection.to_agent}")
    
    def remove_connection(self, connection_id: str):
        """Remove a connection"""
        if connection_id in self.connections:
            del self.connections[connection_id]
            logger.info(f"Removed connection: {connection_id}")
    
    def get_connections(self) -> List[AgentConnection]:
        """Get all connections"""
        return list(self.connections.values())
    
    def get_connections_from_agent(self, agent_id: str) -> List[AgentConnection]:
        """Get all outbound connections from an agent"""
        return [
            conn for conn in self.connections.values() 
            if conn.from_agent == agent_id and conn.enabled
        ]
    
    def get_connections_to_agent(self, agent_id: str) -> List[AgentConnection]:
        """Get all inbound connections to an agent"""
        return [
            conn for conn in self.connections.values() 
            if conn.to_agent == agent_id and conn.enabled
        ]
    
    async def route_message(self, request: MessageRouteRequest) -> RoutedMessage:
        """Route a message from one agent to another"""
        # Create routed message record
        message_id = str(uuid.uuid4())
        routed_message = RoutedMessage(
            id=message_id,
            from_agent=request.from_agent,
            to_agent=request.to_agent,
            message=request.message,
            context=request.context,
            timestamp=asyncio.get_event_loop().time(),
            status="pending"
        )
        
        self.message_history[message_id] = routed_message
        
        try:
            # Check if connection exists
            connection = self._find_connection(request.from_agent, request.to_agent)
            if not connection:
                routed_message.status = "error"
                routed_message.error = f"No connection from {request.from_agent} to {request.to_agent}"
                return routed_message
            
            if not connection.enabled:
                routed_message.status = "error"  
                routed_message.error = f"Connection from {request.from_agent} to {request.to_agent} is disabled"
                return routed_message
            
            # Send message to target agent
            routed_message.status = "sent"
            
            from models import AgentQueryRequest
            query_request = AgentQueryRequest(
                query=request.message,
                context={
                    **(request.context or {}),
                    "from_agent": request.from_agent,
                    "message_id": message_id,
                    "routing_info": {
                        "connection_id": connection.id,
                        "from_handle": connection.from_handle,
                        "to_handle": connection.to_handle
                    }
                }
            )
            
            response = await self.agent_manager.send_query_to_agent(
                request.to_agent, 
                query_request
            )
            
            routed_message.status = "delivered"
            routed_message.response = response.get("response", "")
            
            logger.info(f"Message routed successfully: {request.from_agent} -> {request.to_agent}")
            
        except Exception as e:
            routed_message.status = "error"
            routed_message.error = str(e)
            logger.error(f"Failed to route message: {str(e)}")
        
        return routed_message
    
    async def broadcast_message(self, from_agent: str, message: str, context: Optional[Dict[str, Any]] = None) -> List[RoutedMessage]:
        """Broadcast a message to all connected agents"""
        connections = self.get_connections_from_agent(from_agent)
        results = []
        
        for connection in connections:
            request = MessageRouteRequest(
                from_agent=from_agent,
                to_agent=connection.to_agent,
                message=message,
                context=context
            )
            
            result = await self.route_message(request)
            results.append(result)
        
        return results
    
    async def execute_workflow(self, agents: List[str], initial_message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a workflow across connected agents"""
        if not agents:
            return {"error": "No agents specified"}
        
        workflow_id = str(uuid.uuid4())
        results = []
        current_message = initial_message
        current_context = context or {}
        current_context["workflow_id"] = workflow_id
        
        logger.info(f"Starting workflow {workflow_id} with agents: {agents}")
        
        # Execute workflow in sequence based on agent connections
        for i, agent_id in enumerate(agents):
            try:
                # Send message to current agent
                from models import AgentQueryRequest
                query_request = AgentQueryRequest(
                    query=current_message,
                    context={
                        **current_context,
                        "workflow_step": i + 1,
                        "total_steps": len(agents),
                        "previous_results": results[-1] if results else None
                    }
                )
                
                response = await self.agent_manager.send_query_to_agent(agent_id, query_request)
                
                step_result = {
                    "agent_id": agent_id,
                    "step": i + 1,
                    "query": current_message,
                    "response": response.get("response", ""),
                    "status": "success"
                }
                
                results.append(step_result)
                
                # Use agent's response as input for next agent
                current_message = response.get("response", current_message)
                current_context["previous_agent"] = agent_id
                
                # If there's a next agent, route the message
                if i < len(agents) - 1:
                    next_agent = agents[i + 1]
                    
                    # Check if there's a connection
                    connection = self._find_connection(agent_id, next_agent)
                    if connection and connection.enabled:
                        # Message will be sent in next iteration
                        logger.info(f"Workflow step {i+1} completed, routing to {next_agent}")
                    else:
                        logger.warning(f"No connection from {agent_id} to {next_agent}, continuing workflow anyway")
                
            except Exception as e:
                error_result = {
                    "agent_id": agent_id,
                    "step": i + 1,
                    "query": current_message,
                    "response": "",
                    "status": "error",
                    "error": str(e)
                }
                results.append(error_result)
                logger.error(f"Workflow step {i+1} failed: {str(e)}")
        
        workflow_result = {
            "workflow_id": workflow_id,
            "initial_message": initial_message,
            "agents": agents,
            "steps": results,
            "final_result": results[-1]["response"] if results else "",
            "status": "completed" if all(r.get("status") == "success" for r in results) else "partial_failure"
        }
        
        logger.info(f"Workflow {workflow_id} completed with status: {workflow_result['status']}")
        return workflow_result
    
    def get_message_history(self, limit: int = 100) -> List[RoutedMessage]:
        """Get recent message history"""
        messages = sorted(
            self.message_history.values(),
            key=lambda m: m.timestamp,
            reverse=True
        )
        return messages[:limit]
    
    def _find_connection(self, from_agent: str, to_agent: str) -> Optional[AgentConnection]:
        """Find a connection between two agents"""
        for connection in self.connections.values():
            if connection.from_agent == from_agent and connection.to_agent == to_agent:
                return connection
        return None
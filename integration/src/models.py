from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from enum import Enum

class AgentStatus(str, Enum):
    STOPPED = "stopped"
    STARTING = "starting" 
    RUNNING = "running"
    ERROR = "error"
    STOPPING = "stopping"

class AgentConfig(BaseModel):
    id: str
    name: str
    type: str = "SingleAgent"
    port: int
    model: str = "gpt-3.5-turbo"
    prompt: Optional[str] = None
    openai_api_key: str

class AgentInstance(BaseModel):
    id: str
    config: AgentConfig
    status: AgentStatus
    pid: Optional[int] = None
    url: Optional[str] = None
    error_message: Optional[str] = None
    last_health_check: Optional[str] = None

class AgentConnection(BaseModel):
    id: str
    from_agent: str
    to_agent: str
    from_handle: str
    to_handle: str
    enabled: bool = True

class MessageRouteRequest(BaseModel):
    from_agent: str
    to_agent: str
    message: str
    context: Optional[Dict[str, Any]] = None

class WorkflowExecutionRequest(BaseModel):
    workflow_id: str
    agents: List[str]
    connections: List[AgentConnection]
    initial_message: str
    context: Optional[Dict[str, Any]] = None

class CreateAgentRequest(BaseModel):
    name: str
    type: str = "SingleAgent"
    model: str = "gpt-3.5-turbo"
    prompt: Optional[str] = None
    openai_api_key: str

class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    prompt: Optional[str] = None
    openai_api_key: Optional[str] = None

class AgentQueryRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None
# BaseAgent - Foundation class for all microservice agents
# This is the core class that all specialized agents inherit from
# It provides common functionality like HTTP server, configuration, logging, etc.

import logging
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod

# LangChain imports - these are for building AI agents
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.tools import Tool
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Import our configuration settings
from config import settings

# Set up logging so we can see what's happening
logging.basicConfig(level=getattr(logging, settings.log_level))
logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """
    Base class for all microservice agents in the orchestration system.
    
    This class provides common functionality that all agents need:
    - OpenAI connection and configuration
    - Standard agent setup and execution
    - Common API patterns
    - Error handling and logging
    - Health checks and status reporting
    
    To create a new agent, inherit from this class and implement:
    - _initialize_tools(): Return list of tools specific to your agent
    - Optionally override other methods for custom behavior
    """
    
    def __init__(self, agent_id: Optional[str] = None):
        """Initialize the base agent with common functionality"""
        logger.info(f"Initializing {self.__class__.__name__}")
        
        # Network-specific setup
        self.agent_id = agent_id or self._generate_agent_id()
        self.network_status = "initializing"
        
        # Common setup that all agents need
        self.agent_name = self._get_agent_name()
        self.agent_description = self._get_agent_description()
        
        # Initialize the core components
        self.llm = self._initialize_llm()
        self.tools = self._initialize_tools()
        self.agent_executor = self._create_agent()
        
        # Network ready
        self.network_status = "ready"
        
        logger.info(f"{self.agent_name} (ID: {self.agent_id}) initialized successfully with {len(self.tools)} tools")
    
    def _generate_agent_id(self) -> str:
        """Generate a unique agent ID"""
        import uuid
        return str(uuid.uuid4())[:8]  # Short ID for readability
    
    def _get_agent_name(self) -> str:
        """Get the agent name - can be overridden by subclasses"""
        return getattr(settings, 'agent_name', self.__class__.__name__)
    
    def _get_agent_description(self) -> str:
        """Get the agent description - can be overridden by subclasses"""
        return getattr(settings, 'agent_description', f"A specialized {self.__class__.__name__} microservice")
    
    def _initialize_llm(self) -> ChatOpenAI:
        """
        Initialize the OpenAI connection.
        This is the same for all agents - they all use OpenAI for intelligence.
        """
        # Check if we have an API key
        if not settings.openai_api_key:
            raise ValueError(f"{self.agent_name}: OpenAI API key not provided - check your .env file")
            
        logger.info(f"Connecting to OpenAI with model: {settings.openai_model}")
        
        # Create connection to OpenAI
        return ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            temperature=0.7,  # How creative the responses are
            max_tokens=1000   # Maximum length of responses
        )
    
    @abstractmethod
    def _initialize_tools(self) -> List[Tool]:
        """
        Initialize tools specific to this agent.
        
        This MUST be implemented by each specialized agent.
        Return a list of LangChain Tools that this agent can use.
        
        Example:
            return [
                Tool(name="MyTool", func=my_function, description="What it does"),
                Tool(name="AnotherTool", func=another_function, description="What it does")
            ]
        """
        pass
    
    def _create_agent(self) -> AgentExecutor:
        """
        Create the complete agent by combining OpenAI + tools + conversation template.
        This is standard across all agents.
        """
        # Create the conversation template that tells the AI how to behave
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are {self.agent_name}, {self.agent_description}.
            
            You are a specialized microservice agent in a larger agent orchestration system.
            Your job is to use your available tools to complete specific tasks efficiently and accurately.
            
            When given a task:
            1. Analyze what tools you need to complete it
            2. Use the appropriate tools in the correct order
            3. Return clear, structured results
            4. If you cannot complete a task, explain why clearly
            
            Be concise, accurate, and focus on getting the job done."""),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        # Connect the AI, tools, and conversation template
        agent = create_openai_tools_agent(self.llm, self.tools, prompt)
        
        # Create the final agent executor
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,     # Show thinking process (helpful for debugging)
            max_iterations=5, # Allow more iterations for complex tasks
            handle_parsing_errors=True  # Keep working even if something goes wrong
        )
    
    async def process_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a task request - this is the main entry point for all agents.
        
        Args:
            task: The task description or instruction
            context: Optional context data from other agents
            
        Returns:
            Dict with task results, status, and metadata
        """
        try:
            logger.info(f"{self.agent_name} processing task: {task}")
            
            # Add context to the task if provided
            if context:
                enhanced_task = f"Task: {task}\nContext: {context}"
            else:
                enhanced_task = task
            
            # Send the task to the AI agent
            response = await self.agent_executor.ainvoke({
                "input": enhanced_task
            })
            
            # Package the response
            result = {
                "task": task,
                "result": response["output"],
                "agent_name": self.agent_name,
                "agent_type": self.__class__.__name__,
                "status": "success",
                "context": context
            }
            
            logger.info(f"{self.agent_name} completed task successfully")
            return result
            
        except Exception as e:
            # If something went wrong, return a detailed error
            logger.error(f"{self.agent_name} task failed: {str(e)}")
            return {
                "task": task,
                "result": f"Task failed: {str(e)}",
                "agent_name": self.agent_name,
                "agent_type": self.__class__.__name__,
                "status": "error",
                "context": context,
                "error": str(e)
            }
    
    def get_agent_info(self) -> Dict[str, Any]:
        """
        Get information about this agent's capabilities.
        Useful for agent discovery and orchestration.
        """
        return {
            "id": self.agent_id,
            "name": self.agent_name,
            "type": self.__class__.__name__,
            "description": self.agent_description,
            "tools": [
                {
                    "name": tool.name,
                    "description": tool.description
                }
                for tool in self.tools
            ],
            "status": "active",
            "network_status": self.network_status,
            "model": settings.openai_model,
            "capabilities": {
                "inter_agent_messaging": True,
                "workflow_execution": True,
                "context_sharing": True
            }
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """
        Get health status for monitoring and orchestration.
        """
        try:
            # Test if the agent can process a simple task
            tool_count = len(self.tools)
            
            return {
                "status": "healthy",
                "agent_id": self.agent_id,
                "agent_name": self.agent_name,
                "agent_type": self.__class__.__name__,
                "tools_loaded": tool_count,
                "openai_connected": bool(self.llm),
                "network_status": self.network_status,
                "ready": True,
                "network_ready": self.network_status == "ready"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "agent_id": self.agent_id,
                "agent_name": self.agent_name,
                "agent_type": self.__class__.__name__,
                "error": str(e),
                "network_status": "error",
                "ready": False,
                "network_ready": False
            }
    
    def get_available_tools(self) -> List[Dict[str, str]]:
        """
        Get detailed information about available tools.
        Useful for other agents to know what this agent can do.
        """
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "agent": self.agent_name
            }
            for tool in self.tools
        ]
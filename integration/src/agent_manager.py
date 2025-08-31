import asyncio
import subprocess
import os
import signal
import psutil
import logging
from typing import Dict, Optional, List
import httpx
from datetime import datetime

from models import AgentInstance, AgentConfig, AgentStatus, AgentQueryRequest

logger = logging.getLogger(__name__)

class AgentManager:
    """Manages lifecycle of SingleAgent instances"""
    
    def __init__(self):
        self.agents: Dict[str, AgentInstance] = {}
        self.base_port = 8001  # Start agent ports from 8001
        self.next_port = self.base_port
        
    async def create_agent(self, config: AgentConfig) -> AgentInstance:
        """Create and start a new agent instance"""
        try:
            # Assign port if not specified
            if not config.port:
                config.port = self.next_port
                self.next_port += 1
            
            # Create agent instance
            agent = AgentInstance(
                id=config.id,
                config=config,
                status=AgentStatus.STOPPED,
                url=f"http://localhost:{config.port}"
            )
            
            self.agents[config.id] = agent
            
            # Start the agent process
            await self.start_agent(config.id)
            
            return agent
            
        except Exception as e:
            logger.error(f"Failed to create agent {config.id}: {str(e)}")
            if config.id in self.agents:
                self.agents[config.id].status = AgentStatus.ERROR
                self.agents[config.id].error_message = str(e)
            raise
    
    async def start_agent(self, agent_id: str) -> bool:
        """Start an agent process"""
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not found")
        
        agent = self.agents[agent_id]
        
        if agent.status == AgentStatus.RUNNING:
            return True
        
        try:
            agent.status = AgentStatus.STARTING
            
            # Create environment variables for the agent
            env = os.environ.copy()
            env.update({
                'AGENT_NAME': agent.config.name,
                'AGENT_DESCRIPTION': f"Agent {agent.config.name}",
                'PORT': str(agent.config.port),
                'OPENAI_API_KEY': agent.config.openai_api_key,
                'OPENAI_MODEL': agent.config.model,
                'LOG_LEVEL': 'INFO'
            })
            
            # Write agent-specific .env file
            agent_dir = f"../single"  # Path to single agent directory
            env_file = os.path.join(agent_dir, f".env.{agent_id}")
            
            with open(env_file, 'w') as f:
                f.write(f"AGENT_NAME={agent.config.name}\n")
                f.write(f"AGENT_DESCRIPTION=Agent {agent.config.name}\n")
                f.write(f"PORT={agent.config.port}\n")
                f.write(f"OPENAI_API_KEY={agent.config.openai_api_key}\n")
                f.write(f"OPENAI_MODEL={agent.config.model}\n")
                f.write("LOG_LEVEL=INFO\n")
            
            # Start the agent process
            cmd = [
                "python", "main.py"
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                env=env,
                cwd=agent_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            agent.pid = process.pid
            agent.status = AgentStatus.RUNNING
            
            # Wait a moment and check if process is still running
            await asyncio.sleep(2)
            
            if process.returncode is not None:
                # Process died immediately
                stdout, stderr = await process.communicate()
                error_msg = f"Agent process died: {stderr.decode()}"
                agent.status = AgentStatus.ERROR
                agent.error_message = error_msg
                logger.error(f"Agent {agent_id} failed to start: {error_msg}")
                return False
            
            # Test health endpoint
            await self._wait_for_agent_ready(agent_id)
            
            logger.info(f"Agent {agent_id} started successfully on port {agent.config.port}")
            return True
            
        except Exception as e:
            agent.status = AgentStatus.ERROR
            agent.error_message = str(e)
            logger.error(f"Failed to start agent {agent_id}: {str(e)}")
            return False
    
    async def stop_agent(self, agent_id: str) -> bool:
        """Stop an agent process"""
        if agent_id not in self.agents:
            return False
        
        agent = self.agents[agent_id]
        
        if agent.status == AgentStatus.STOPPED:
            return True
        
        try:
            agent.status = AgentStatus.STOPPING
            
            if agent.pid:
                # Kill the process
                try:
                    process = psutil.Process(agent.pid)
                    process.terminate()
                    
                    # Wait for graceful shutdown
                    try:
                        process.wait(timeout=5)
                    except psutil.TimeoutExpired:
                        # Force kill if it doesn't stop gracefully
                        process.kill()
                        process.wait()
                        
                except psutil.NoSuchProcess:
                    # Process already dead
                    pass
            
            agent.status = AgentStatus.STOPPED
            agent.pid = None
            agent.error_message = None
            
            logger.info(f"Agent {agent_id} stopped")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop agent {agent_id}: {str(e)}")
            agent.status = AgentStatus.ERROR
            agent.error_message = str(e)
            return False
    
    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent instance"""
        if agent_id not in self.agents:
            return False
        
        # Stop the agent first
        await self.stop_agent(agent_id)
        
        # Remove from registry
        del self.agents[agent_id]
        
        # Clean up env file
        try:
            env_file = f"../single/.env.{agent_id}"
            if os.path.exists(env_file):
                os.remove(env_file)
        except Exception as e:
            logger.warning(f"Failed to clean up env file for {agent_id}: {str(e)}")
        
        logger.info(f"Agent {agent_id} deleted")
        return True
    
    async def get_agent_status(self, agent_id: str) -> Optional[AgentInstance]:
        """Get current status of an agent"""
        if agent_id not in self.agents:
            return None
        
        agent = self.agents[agent_id]
        
        # Update health check if agent is running
        if agent.status == AgentStatus.RUNNING:
            await self._update_health_status(agent_id)
        
        return agent
    
    async def list_agents(self) -> List[AgentInstance]:
        """List all agent instances"""
        # Update health status for all running agents
        for agent_id in self.agents:
            if self.agents[agent_id].status == AgentStatus.RUNNING:
                await self._update_health_status(agent_id)
        
        return list(self.agents.values())
    
    async def send_query_to_agent(self, agent_id: str, query: AgentQueryRequest) -> Dict:
        """Send a query to a specific agent"""
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not found")
        
        agent = self.agents[agent_id]
        
        if agent.status != AgentStatus.RUNNING:
            raise ValueError(f"Agent {agent_id} is not running (status: {agent.status})")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{agent.url}/agent/query",
                    json={
                        "query": query.query,
                        "session_id": f"integration_{agent_id}"
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            logger.error(f"Failed to query agent {agent_id}: {str(e)}")
            raise
    
    async def _wait_for_agent_ready(self, agent_id: str, max_attempts: int = 30) -> bool:
        """Wait for agent to be ready and responding to health checks"""
        agent = self.agents[agent_id]
        
        for attempt in range(max_attempts):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{agent.url}/health", timeout=5.0)
                    if response.status_code == 200:
                        agent.last_health_check = datetime.now().isoformat()
                        return True
            except:
                pass
            
            await asyncio.sleep(1)
        
        agent.status = AgentStatus.ERROR
        agent.error_message = "Agent failed to respond to health checks"
        return False
    
    async def _update_health_status(self, agent_id: str):
        """Update health status for a running agent"""
        agent = self.agents[agent_id]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{agent.url}/health", timeout=5.0)
                if response.status_code == 200:
                    agent.last_health_check = datetime.now().isoformat()
                    if agent.status != AgentStatus.RUNNING:
                        agent.status = AgentStatus.RUNNING
                        agent.error_message = None
                else:
                    agent.status = AgentStatus.ERROR
                    agent.error_message = f"Health check failed: {response.status_code}"
        except Exception as e:
            agent.status = AgentStatus.ERROR
            agent.error_message = f"Health check failed: {str(e)}"
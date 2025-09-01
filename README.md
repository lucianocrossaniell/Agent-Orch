# Agent Orchestration System

![Agent Orchestration System Screenshot](Screenshot%202025-08-23%20at%205.28.27%20PM.png)

A visual agent builder and orchestration platform that allows you to create, connect, and orchestrate multiple AI agents in complex workflows.

## What This Does

This system transforms the concept of single AI agents into a powerful multi-agent orchestration platform:

- **Visual Agent Builder**: Drag-and-drop interface to create and connect AI agents
- **Real Agent Management**: Each agent runs as an independent process with its own capabilities
- **Message Routing**: Agents communicate through configurable connections
- **Workflow Execution**: Run complex workflows across multiple connected agents
- **Live Monitoring**: Real-time status updates and health monitoring

## Architecture

```
┌─────────────────────┐    ┌────────────────────┐    ┌─────────────────────┐
│                     │    │                    │    │                     │
│   React UI          │◄──►│  Integration       │◄──►│  Agent Network      │
│   Visual Builder    │    │  Layer             │    │  (BaseAgent)        │
│   (agent-ui/)       │    │  (integration/)    │    │  (single/)          │
│                     │    │                    │    │                     │
│ • Drag & drop       │    │ • Agent lifecycle  │    │ • OpenAI powered    │
│ • Real-time updates │    │ • Message routing  │    │ • Modular tools     │
│ • Status monitoring │    │ • Workflow engine  │    │ • Network ready     │
│ • Configuration     │    │ • WebSocket hub    │    │ • Health endpoints  │
│                     │    │                    │    │                     │
└─────────────────────┘    └────────────────────┘    └─────────────────────┘
```

## Quick Start

### 1. Start the Integration Layer (Backend)

```bash
cd integration
pip install -r requirements.txt
./start.sh
```

The integration layer will start on http://localhost:8000

### 2. Start the React UI (Frontend)

```bash
cd agent-ui
npm install
npm run dev
```

The UI will be available at http://localhost:5173

### 3. Create Your First Agent Network

1. **Add Agents**: Click "Add Agent" to create AI agents with different models and capabilities
2. **Connect Agents**: Drag from blue handles (output) to red handles (input) to create message flows
3. **Configure Agents**: Click on agent names to configure models, prompts, and settings
4. **Execute Workflows**: Click "Execute Workflow" to run messages through your agent network

## Repository Structure

```
agent-orch/
├── agent-ui/          # React frontend - Visual agent builder
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── services/      # API integration
│   │   ├── hooks/         # React hooks for state management
│   │   └── types/         # TypeScript definitions
│   └── package.json
├── integration/       # Python backend - Orchestration layer
│   ├── src/
│   │   ├── main.py        # FastAPI server
│   │   ├── agent_manager.py   # Agent lifecycle management
│   │   ├── message_router.py  # Inter-agent communication
│   │   └── models.py      # Data models
│   ├── requirements.txt
│   └── start.sh
└── single/           # BaseAgent architecture - Individual agents
    ├── base_agent.py     # Core agent foundation
    ├── single_agent.py   # Example agent implementation
    ├── main.py           # Agent HTTP server
    ├── tools/            # Modular agent tools
    └── requirements.txt
```

## Key Features

### Visual Agent Builder

- **Intuitive Interface**: Drag and drop to create agent networks
- **Real-time Updates**: See agent status changes instantly
- **Connection Management**: Visual connections show message flow between agents

### Agent Lifecycle Management

- **Dynamic Creation**: Spawn new agent processes on demand
- **Health Monitoring**: Continuous health checks with status indicators
- **Resource Management**: Automatic cleanup and port management

### Message Routing & Workflows

- **Smart Routing**: Messages flow along visual connections
- **Workflow Engine**: Execute complex multi-agent workflows
- **Context Sharing**: Agents can share context and build on each other's work

### BaseAgent Architecture

- **Modular Design**: Easy to extend with new agent types
- **Tool System**: Pluggable tools for different capabilities
- **Network Ready**: Built-in support for orchestration and communication

## Development

### Creating New Agent Types

Extend the `BaseAgent` class to create specialized agents:

```python
from base_agent import BaseAgent
from langchain.tools import Tool

class MySpecialAgent(BaseAgent):
    def _get_agent_description(self) -> str:
        return "Specialized agent for X, Y, and Z tasks"

    def _initialize_tools(self) -> List[Tool]:
        return [
            Tool(name="MyTool", func=my_function, description="What it does"),
            # Add more tools...
        ]
```

### Adding New Tools

Create modular tools in the `single/tools/` directory:

```python
from langchain.tools import Tool

def create_my_tool():
    def my_tool_function(input_text: str) -> str:
        # Tool implementation
        return result

    return Tool(
        name="MyTool",
        func=my_tool_function,
        description="Description of what this tool does"
    )
```

### Extending the UI

The React UI is built with:

- **React + TypeScript**: Type-safe component development
- **React Flow**: Visual node-based editor
- **Tailwind CSS**: Utility-first styling
- **WebSocket Integration**: Real-time updates from backend

## API Documentation

When the integration layer is running, visit:

- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **WebSocket**: ws://localhost:8000/ws

## Monitoring & Debugging

### Agent Status Indicators

- 🟢 **Running**: Agent is healthy and processing requests
- 🟡 **Starting/Stopping**: Agent is transitioning states
- 🔴 **Error**: Agent has encountered an error
- ⚪ **Stopped**: Agent is not running

### Real-time Updates

The UI receives real-time updates via WebSocket for:

- Agent status changes
- New agent creation/deletion
- Connection modifications
- Workflow execution progress

### Health Monitoring

Each agent exposes health endpoints:

- `/health` - Basic health status
- `/agent/info` - Agent capabilities and configuration
- `/agent/network-status` - Network-specific status

## Contributing

This system is designed to be extensible. Key areas for contribution:

1. **New Agent Types**: Create specialized agents for different domains
2. **Additional Tools**: Expand agent capabilities with new tools
3. **UI Enhancements**: Improve the visual builder interface
4. **Workflow Features**: Add more sophisticated workflow capabilities
5. **Monitoring**: Enhanced observability and debugging tools

## License

This project demonstrates a complete agent orchestration system built on the BaseAgent architecture, showcasing how individual AI agents can be composed into powerful multi-agent workflows.

## Related

- Built on the **BaseAgent** microservice architecture
- Integrates with **OpenAI** and other LLM providers
- Uses **LangChain** for agent framework
- **FastAPI** for high-performance backend
- **React Flow** for visual workflow builder

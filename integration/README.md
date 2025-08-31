# Agent Orchestration Integration Layer

This is the central orchestration system that manages multiple AI agents and enables communication between them.

## Features

- **Agent Lifecycle Management**: Create, start, stop, and delete agent instances
- **Message Routing**: Route messages between agents based on UI connections
- **Workflow Execution**: Execute complex workflows across multiple agents
- **Real-time Updates**: WebSocket support for live UI updates
- **Health Monitoring**: Monitor agent health and status

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │◄──►│  Integration     │◄──►│  Agent          │
│   (Port 5173)   │    │  Layer           │    │  Instances      │
│                 │    │  (Port 8000)     │    │  (Port 8001+)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Message Router  │
                       │  & Workflow      │
                       │  Engine          │
                       └──────────────────┘
```

## API Endpoints

### Agent Management
- `POST /agents` - Create new agent
- `GET /agents` - List all agents  
- `GET /agents/{id}` - Get agent details
- `PUT /agents/{id}` - Update agent configuration
- `DELETE /agents/{id}` - Delete agent
- `POST /agents/{id}/start` - Start agent
- `POST /agents/{id}/stop` - Stop agent
- `POST /agents/{id}/query` - Send query to agent

### Connection Management
- `POST /connections` - Create connection between agents
- `GET /connections` - List all connections
- `DELETE /connections/{id}` - Delete connection

### Message Routing
- `POST /messages/route` - Route message between specific agents
- `POST /messages/broadcast` - Broadcast message to connected agents
- `GET /messages/history` - Get message routing history

### Workflow Execution
- `POST /workflows/execute` - Execute workflow across agents

### Real-time Updates
- `WebSocket /ws` - Real-time updates for UI

## Quick Start

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start Integration Layer**
   ```bash
   cd integration
   python src/main.py
   ```

3. **Start React UI**
   ```bash
   cd agent-ui
   npm install
   npm run dev
   ```

4. **Create Your First Agent**
   - Open the UI at http://localhost:5173
   - Click "Add Agent" 
   - Fill in agent details including OpenAI API key
   - Agent will be automatically started

5. **Connect Agents**
   - Drag from the blue handle (source) of one agent
   - Connect to the red handle (target) of another agent
   - This creates a message routing connection

6. **Execute Workflow**
   - Click "Execute Workflow"
   - Enter an initial message
   - Watch as the message flows through your connected agents

## Configuration

Environment variables:
- `PORT` - Integration layer port (default: 8000)
- `LOG_LEVEL` - Logging level (default: INFO)
- `DEBUG` - Enable debug mode (default: false)

## Development

The integration layer automatically manages agent lifecycle:

1. **Agent Creation**: Spawns new SingleAgent process with unique port
2. **Health Monitoring**: Continuously monitors agent health via HTTP
3. **Message Routing**: Routes messages based on UI connections
4. **Cleanup**: Automatically stops agents when deleted

Each agent runs as a separate process, enabling:
- Isolation between agents
- Independent scaling
- Fault tolerance
- Resource management

## Error Handling

- Agents that fail to start show error status in UI
- Failed message routing is logged and returned with error status  
- WebSocket reconnection for resilient UI updates
- Graceful shutdown of all agents on system exit
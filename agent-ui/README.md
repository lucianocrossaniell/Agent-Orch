# Agent Network Builder

A visual drag-and-drop interface for building and connecting AI agent networks using React and React Flow.
<img width="1439" height="816" alt="Screenshot 2025-08-23 at 5 28 27 PM" src="https://github.com/user-attachments/assets/99d215b0-e602-45f0-9992-ef4c4e74311f" />


## Features

- **Visual Agent Creation**: Add agent boxes to the canvas with a single click
- **Flexible Connections**: Connect agents using purple connection dots on all 4 sides (top, right, bottom, left)
- **Directional Arrows**: Arrows point in the exact direction you drag - from source dot to target dot
- **Agent Configuration**: Click on agent names to configure:
  - AI Model selection (GPT-4, GPT-3.5 Turbo, Claude 3 Sonnet, Claude 3 Haiku, Gemini Pro, Llama 2)
  - System prompts for each agent
- **Connection Management**: Select and delete connections with the Delete key
- **Universal Connectivity**: Any connection dot can connect to any other dot on any agent
- **Clean UI**: Modern interface with sliding configuration panel

## How to Use

### Adding Agents
1. Click the "**+ Add Agent**" button in the toolbar
2. Agent boxes will appear on the canvas with purple connection dots

### Creating Connections
1. Drag from any purple dot on one agent to any purple dot on another agent
2. The arrow will point from where you started dragging to where you ended
3. Connections work in all directions: top↔bottom, left↔right, diagonal, etc.

### Configuring Agents
1. Click on any agent's name to open the configuration panel
2. Select an AI model from the dropdown
3. Enter a system prompt for the agent
4. Click "Save Configuration"

### Managing Connections
1. Click on any connection line to select it
2. Press Delete or Backspace to remove the connection
3. Use "Clear All" to reset the entire canvas

## Tech Stack

- **React** - Frontend framework
- **TypeScript** - Type safety
- **React Flow** - Node-based visual editor
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── AgentConfigPanel.tsx    # Agent configuration sidebar
│   ├── AgentFlowNode.tsx       # Individual agent box component
│   ├── ReactFlowCanvas.tsx     # Main canvas with React Flow
│   └── Toolbar.tsx             # Top toolbar with controls
├── types/
│   └── index.ts                # TypeScript type definitions
├── App.tsx                     # Main application component
└── main.tsx                    # Application entry point
```

## Features in Detail

### Connection System
- **4-way connectivity**: Each agent has connection dots on all sides
- **Bidirectional**: Any dot can be a source or target
- **Visual feedback**: Dots highlight on hover
- **Precise connections**: Arrows connect to exact attachment points

### Agent Configuration
- **Sliding panel**: Configuration panel slides in from the right
- **Model selection**: Choose from popular AI models
- **Custom prompts**: Define unique system prompts per agent
- **Real-time updates**: Changes apply immediately

### User Experience
- **Intuitive drag-and-drop**: Natural connection creation
- **Keyboard shortcuts**: Delete key for connection removal
- **Visual indicators**: Clear connection direction with arrows
- **Responsive design**: Works on different screen sizes

## Contributing

This project uses modern React patterns with TypeScript for type safety and maintainability.

## License

MIT License

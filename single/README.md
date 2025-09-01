# 🤖 BaseAgent Foundation - Microservice Agent Architecture

A foundational framework for creating AI microservice agents that can be orchestrated together. This project provides a **BaseAgent** class that all specialized agents inherit from, plus an example **SingleAgent** implementation.

Perfect for building agent orchestration systems where multiple specialized agents work together!

## What This Framework Provides

### 🏗️ BaseAgent Foundation
- **Inheritance-based architecture** - Create new agents by extending BaseAgent
- **Common functionality** - HTTP server, OpenAI integration, error handling, health checks
- **Standardized API** - All agents follow the same patterns
- **Easy orchestration** - Agents can easily communicate with each other

### 🤖 Example SingleAgent
- **Calculator tools** - Performs mathematical calculations
- **Text analysis** - Analyzes text content and structure  
- **Chat interface** - Browser-based testing interface
- **Demonstration** - Shows how to build agents using BaseAgent

### 🚀 Future Ready
- **Scalable design** - Add new agent types in minutes
- **Microservice architecture** - Each agent runs independently
- **Orchestration ready** - Perfect foundation for multi-agent systems

## Quick Start (3 Steps)

### 1. Get an OpenAI API Key
1. Go to [OpenAI's website](https://platform.openai.com/api-keys)
2. Create an account if you don't have one
3. Create a new API key
4. Copy the key (it looks like: `sk-proj-...`)

### 2. Setup the Agent
```bash
# Run the setup script
./start.sh
```
The script will:
- Install Python packages
- Create a `.env` file
- Ask you to add your API key

### 3. Add Your API Key
1. Open the `.env` file in a text editor
2. Replace `your_openai_api_key_here` with your actual API key
3. Save the file
4. Run `./start.sh` again

## How to Use It

### Chat Interface (Easiest)
1. Run `./start.sh` to start the agent
2. Open `chat.html` in your web browser
3. Start chatting!

### Try These Example Messages:
- "Hello! What can you help me with?"
- "Calculate 15 * 23 + 7"
- "Analyze this text: 'The quick brown fox jumps over the lazy dog'"
- "What's the square root of 144?"
- "Can you help me with basic math?"

### API Documentation
Visit `http://localhost:8000/docs` to see all available API endpoints.

## Architecture & File Structure

### 🏗️ BaseAgent Architecture
```
BaseAgent (base_agent.py)
├── Common functionality for all agents
├── OpenAI integration and configuration  
├── Standard API patterns and error handling
├── Health checks and monitoring
└── Abstract methods for specialization

SingleAgent (single_agent.py)
├── Inherits from BaseAgent
├── Implements calculator and text processing tools
└── Example of how to create specialized agents
```

### 📁 File Structure
```
agent-microservice/
├── start.sh              # 🚀 Main startup script
├── chat.html             # 💬 Web chat testing interface
├── main.py               # 🌐 FastAPI web server
├── base_agent.py         # 🏗️ BaseAgent foundation class
├── single_agent.py       # 🤖 Example specialized agent
├── config.py             # ⚙️ Configuration management
├── tools/                # 🔧 Reusable tool modules
│   ├── __init__.py
│   ├── calculator.py     # Math calculation tool
│   └── text_processor.py # Text analysis tool
├── requirements.txt      # 📦 Python dependencies
├── .env.example          # 📋 Configuration template
└── Dockerfile           # 🐳 Container deployment
```

## Creating New Agents

The BaseAgent framework makes it incredibly easy to create new specialized agents:

### 1. Create a New Agent Class
```python
from base_agent import BaseAgent
from langchain.tools import Tool

class PDFAgent(BaseAgent):
    def _get_agent_description(self) -> str:
        return "Specialized agent for PDF generation and processing"
    
    def _initialize_tools(self) -> List[Tool]:
        return [
            Tool(
                name="GeneratePDF",
                func=self.generate_pdf,
                description="Generate a PDF from provided data"
            ),
            Tool(
                name="ReadPDF", 
                func=self.read_pdf,
                description="Extract text from PDF files"
            )
        ]
    
    def generate_pdf(self, data: str) -> str:
        # Your PDF generation logic here
        return "PDF generated successfully"
```

### 2. Update main.py
```python
from pdf_agent import PDFAgent  # Instead of SingleAgent
agent = PDFAgent()  # Use your new agent
```

### 3. That's it!
Your new agent automatically gets:
- ✅ HTTP server and API endpoints
- ✅ OpenAI integration 
- ✅ Error handling and logging
- ✅ Health checks and monitoring
- ✅ Standardized communication patterns

## Customization

### Change the Agent's Name
Edit `.env` file:
```bash
AGENT_NAME=MyPersonalAssistant
AGENT_DESCRIPTION=My custom AI helper
```

### Use Different AI Model
Edit `.env` file:
```bash
OPENAI_MODEL=gpt-3.5-turbo  # Faster and cheaper
# or
OPENAI_MODEL=gpt-4          # Smarter but slower
```

### Change Server Port
Edit `.env` file:
```bash
PORT=3000  # Use port 3000 instead of 8000
```

## Troubleshooting

### "OpenAI API key not provided"
- Make sure you copied your API key correctly to the `.env` file
- The key should start with `sk-proj-` or `sk-`
- Don't include quotes around the key

### "Agent not ready"
- Check that your API key is valid
- Make sure you have internet connection
- Verify you have credits in your OpenAI account

### "Module not found"
- Run the setup script again: `./start.sh`
- Make sure Python 3.8+ is installed

### Can't access the chat interface
- Make sure the agent is running (you should see "Starting SingleAgent server...")
- Try visiting `http://localhost:8000` first to check if the server is working
- Check if another program is using port 8000

## What's Next?

This single agent is designed to be the foundation for more advanced features:

- 🔗 **Multi-agent systems** - Multiple specialized agents working together
- 🌐 **Web deployment** - Put your agent online for others to use
- 🔧 **Custom tools** - Add your own special abilities
- 📊 **Memory systems** - Let the agent remember past conversations

## Need Help?

- Check the troubleshooting section above
- Look at the example messages in the chat interface
- Visit `http://localhost:8000/docs` for technical API details
- The agent logs helpful information when running - check the terminal output

## Requirements

- **Python 3.8+** (check with `python3 --version`)
- **Internet connection** (to reach OpenAI's servers)
- **OpenAI API key** (free tier available)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
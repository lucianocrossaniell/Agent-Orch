# The main AI agent that uses OpenAI to chat and use tools
# This file creates an agent that can do math, analyze text, and chat

import logging
from typing import Dict, Any, Optional

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

class SingleAgent:
    """
    This is the main AI agent class.
    It connects to OpenAI and has tools for math and text analysis.
    """
    
    def __init__(self):
        """Set up the agent when it's created"""
        self.llm = self._initialize_llm()  # Connect to OpenAI
        self.tools = self._initialize_tools()  # Set up the tools (calculator, text analyzer)
        self.agent_executor = self._create_agent()  # Put it all together
        
    def _initialize_llm(self) -> ChatOpenAI:
        """
        Connect to OpenAI's API.
        This is what makes the agent "smart" - it uses GPT-4 to understand and respond.
        """
        # Check if we have an API key
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not provided - check your .env file")
            
        # Create connection to OpenAI
        return ChatOpenAI(
            api_key=settings.openai_api_key,  # Your API key from .env file
            model=settings.openai_model,  # Which model to use (gpt-4 or gpt-3.5-turbo)
            temperature=0.7,  # How creative the responses are (0.0 = boring, 1.0 = very creative)
            max_tokens=1000  # Maximum length of responses
        )
    
    def _initialize_tools(self) -> list:
        """
        Set up the tools that the agent can use.
        Think of these as special abilities the agent has beyond just chatting.
        """
        
        def calculator(expression: str) -> str:
            """
            A calculator tool that can do math.
            For example: calculator("2 + 2") returns "The result is: 4"
            """
            try:
                # Use Python's eval to calculate math expressions
                # Note: This is safe here because we control the input
                result = eval(expression)
                return f"The result is: {result}"
            except Exception as e:
                return f"Error calculating: {str(e)}"
        
        def text_processor(text: str) -> str:
            """
            A text analysis tool that counts words and characters.
            For example: text_processor("Hello world") returns "Text analysis: 2 words, 11 characters"
            """
            word_count = len(text.split())  # Split by spaces and count
            char_count = len(text)  # Count all characters
            return f"Text analysis: {word_count} words, {char_count} characters"
        
        # Create a list of tools for the agent to use
        tools = [
            Tool(
                name="Calculator",
                func=calculator,
                description="Use this for math problems like '25 * 4' or '100 / 5'"
            ),
            Tool(
                name="TextProcessor", 
                func=text_processor,
                description="Use this to analyze text and count words/characters"
            )
        ]
        
        return tools
    
    def _create_agent(self) -> AgentExecutor:
        """
        Put together the AI brain (OpenAI) with the tools to create the complete agent.
        This is like assembling all the parts to make the agent work.
        """
        # Create a conversation template - this tells the AI how to behave
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are {settings.agent_name}, {settings.agent_description}. 
            You have access to tools to help you complete tasks. Use them when appropriate.
            Be helpful, accurate, and concise in your responses."""),
            ("human", "{input}"),  # This is where user messages go
            MessagesPlaceholder(variable_name="agent_scratchpad")  # This is where tool usage goes
        ])
        
        # Connect the AI, tools, and conversation template
        agent = create_openai_tools_agent(self.llm, self.tools, prompt)
        
        # Create the final agent executor that handles everything
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,  # Show what the agent is thinking (useful for debugging)
            max_iterations=3,  # Don't let it get stuck in loops
            handle_parsing_errors=True  # Keep working even if something goes wrong
        )
    
    async def process_query(self, query: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        This is the main function that handles user questions.
        It takes a question, sends it to the AI, and returns the answer.
        """
        try:
            logger.info(f"Processing query: {query}")
            
            # Send the question to the AI agent and get a response
            response = await self.agent_executor.ainvoke({
                "input": query  # The user's question
            })
            
            # Package up the response in a nice format
            result = {
                "query": query,  # The original question
                "response": response["output"],  # The AI's answer
                "session_id": session_id,  # Optional session tracking
                "agent_name": settings.agent_name,  # Which agent answered
                "status": "success"  # Everything worked!
            }
            
            logger.info(f"Query processed successfully")
            return result
            
        except Exception as e:
            # If something went wrong, return an error message instead of crashing
            logger.error(f"Error processing query: {str(e)}")
            return {
                "query": query,
                "response": f"Sorry, I had trouble processing that: {str(e)}",
                "session_id": session_id,
                "agent_name": settings.agent_name,
                "status": "error"
            }
    
    def get_agent_info(self) -> Dict[str, Any]:
        """
        Return information about what this agent can do.
        Useful for debugging or showing capabilities.
        """
        return {
            "name": settings.agent_name,
            "description": settings.agent_description,
            "tools": [tool.name for tool in self.tools],  # List of available tools
            "status": "active"
        }
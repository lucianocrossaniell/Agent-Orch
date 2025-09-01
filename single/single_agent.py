# SingleAgent - Example implementation of BaseAgent
# This shows how to create a specialized agent by inheriting from BaseAgent

from typing import List
from langchain.tools import Tool

# Import the base agent class and tools
from base_agent import BaseAgent
from tools import create_calculator_tool, create_text_processor_tool

class SingleAgent(BaseAgent):
    """
    Example implementation of a specialized agent.
    
    This agent inherits all the common functionality from BaseAgent
    and adds its own specific tools: calculator and text processing.
    
    This serves as both:
    1. A working agent that can do math and analyze text
    2. An example of how to create new agents by inheriting from BaseAgent
    """
    
    def _get_agent_description(self) -> str:
        """Override the default description with something specific to this agent"""
        return "A helpful AI agent that can calculate math problems and analyze text content"
    
    def _initialize_tools(self) -> List[Tool]:
        """
        Initialize the tools that this specific agent can use.
        
        This is where you define what makes this agent special!
        Each agent will implement this method differently.
        """
        # Use the modular tools from the tools package
        tools = [
            create_calculator_tool(),
            create_text_processor_tool()
        ]
        
        # You could also add agent-specific tools here:
        # tools.append(Tool(
        #     name="SpecialTool",
        #     func=my_special_function,
        #     description="What this special tool does"
        # ))
        
        return tools

# Example of how easy it is to create a new agent type:
#
# class PDFAgent(BaseAgent):
#     def _get_agent_description(self) -> str:
#         return "Specialized agent for PDF generation and processing"
#     
#     def _initialize_tools(self) -> List[Tool]:
#         return [
#             create_pdf_generator_tool(),
#             create_pdf_reader_tool(),
#             create_pdf_merger_tool()
#         ]
#
# class EmailAgent(BaseAgent):
#     def _get_agent_description(self) -> str:
#         return "Specialized agent for email operations"
#     
#     def _initialize_tools(self) -> List[Tool]:
#         return [
#             create_email_sender_tool(),
#             create_email_template_tool(),
#             create_email_parser_tool()
#         ]
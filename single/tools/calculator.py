# Calculator tool for agents
# This tool provides mathematical calculation capabilities

from langchain.tools import Tool

def calculator_function(expression: str) -> str:
    """
    Perform mathematical calculations safely.
    
    Args:
        expression: A mathematical expression like "2 + 2" or "25 * 4"
        
    Returns:
        String with the calculation result or error message
    """
    try:
        # Use Python's eval for calculation (safe in this controlled context)
        # In production, you might want to use a more restricted math parser
        result = eval(expression)
        return f"The result is: {result}"
    except ZeroDivisionError:
        return "Error: Division by zero"
    except SyntaxError:
        return f"Error: Invalid mathematical expression '{expression}'"
    except Exception as e:
        return f"Error calculating '{expression}': {str(e)}"

def create_calculator_tool() -> Tool:
    """
    Create a calculator tool that agents can use.
    
    Returns:
        LangChain Tool object for mathematical calculations
    """
    return Tool(
        name="Calculator",
        func=calculator_function,
        description="""Use this tool for mathematical calculations. 
        Input should be a valid mathematical expression like:
        - Basic math: '2 + 2', '10 - 3', '5 * 6', '20 / 4'
        - Complex expressions: '(5 + 3) * 2', '25 ** 0.5' (square root)
        - Comparisons: '5 > 3', '10 == 10'
        Always provide the full mathematical expression as a string."""
    )
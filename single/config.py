# Configuration file for the Single Agent
# This file reads settings from the .env file and makes them available to the app

import os
from pydantic_settings import BaseSettings

# Set environment variables early to fix MKL issues
os.environ.update({
    'MKL_NUM_THREADS': '1',
    'OMP_NUM_THREADS': '1', 
    'OPENBLAS_NUM_THREADS': '1',
    'NUMEXPR_NUM_THREADS': '1',
    'VECLIB_MAXIMUM_THREADS': '1',
    'MKL_THREADING_LAYER': 'GNU'
})

class Settings(BaseSettings):
    """
    Configuration settings for the agent.
    These values come from the .env file or environment variables.
    """
    
    # OpenAI API settings - REQUIRED to run the agent
    openai_api_key: str = ""  # Your OpenAI API key from openai.com
    openai_model: str = "gpt-4"  # Which AI model to use (gpt-4 or gpt-3.5-turbo)
    
    # Agent identity settings
    agent_name: str = "SingleAgent"  # What to call your agent
    agent_description: str = "A helpful AI agent that can calculate and analyze text"
    
    # Server settings
    port: int = 8000  # Which port the web server runs on (usually 8000)
    
    # Future features (not used yet, but ready for multi-agent setup)
    redis_url: str = "redis://localhost:6379"
    log_level: str = "INFO"  # How much detail to show in logs (DEBUG, INFO, WARNING, ERROR)
    
    # Threading configuration to fix MKL issues
    mkl_num_threads: str = "1"
    omp_num_threads: str = "1"
    openblas_num_threads: str = "1"
    numexpr_num_threads: str = "1"
    veclib_maximum_threads: str = "1"
    mkl_threading_layer: str = "GNU"
    
    class Config:
        env_file = ".env"  # Read settings from the .env file
        case_sensitive = False  # Allow both OPENAI_API_KEY and openai_api_key

# Create the settings object that other files will import
settings = Settings()
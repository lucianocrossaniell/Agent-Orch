import os
from typing import Optional

class Settings:
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Agent configuration
    BASE_AGENT_PORT: int = 8001
    AGENT_TIMEOUT: float = 30.0
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Development mode
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    RELOAD: bool = DEBUG
    
    # CORS
    ALLOWED_ORIGINS: list = ["*"] if DEBUG else ["http://localhost:3000", "http://localhost:5173"]

# Create settings instance
settings = Settings()
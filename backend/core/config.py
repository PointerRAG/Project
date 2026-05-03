"""
Application configuration using pydantic-settings.
Loads environment variables with type validation and default values.
"""
import os
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# Get the backend directory path
BACKEND_DIR = Path(__file__).parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignore extra env vars not defined in the model
    )
    
    # Application
    PROJECT_NAME: str = Field(default="PointerRAG Backend", description="Name of the project")
    DEBUG: bool = Field(default=False, description="Debug mode flag")
    
    # ChromaDB Configuration
    CHROMA_PERSIST_DIRECTORY: str = Field(
        default=str(BACKEND_DIR / "chroma_db"),
        description="Directory path for ChromaDB persistence"
    )
    
    # Embedding Model Configuration
    EMBEDDING_MODEL_NAME: str = Field(
        default="all-MiniLM-L6-v2",
        description="Name of the sentence-transformers model to use"
    )
    
    # CORS Configuration
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        description="Allowed CORS origins (comma-separated)"
    )
    
    # API Configuration
    API_V1_PREFIX: str = Field(default="/api/v1", description="API version 1 prefix")
    
    # Reranking Configuration
    SAVE_RERANKING_OUTPUT: bool = Field(default=False, description="Save reranking output to file")
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Return CORS origins as a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


# Global settings instance
settings = Settings()

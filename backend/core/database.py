"""
Database and resource management module.
Implements singleton pattern for ChromaDB client and embedding model warmup.
"""
import logging
from contextlib import asynccontextmanager
from typing import Optional

import chromadb
from sentence_transformers import SentenceTransformer

from .config import settings
from backend.services.generation_service import get_generation_service

logger = logging.getLogger(__name__)


class ResourceManager:
    """
    Singleton manager for ChromaDB client and embedding model.
    Prevents file lock errors and ensures efficient resource usage.
    """
    _instance: Optional["ResourceManager"] = None
    _chroma_client: Optional[chromadb.PersistentClient] = None
    _embedding_model: Optional[SentenceTransformer] = None
    _initialized: bool = False
    
    def __new__(cls) -> "ResourceManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls) -> "ResourceManager":
        """Get or create the singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def init_resources(self) -> None:
        """
        Initialize all resources during server startup.
        This 'warms up' the embedding model so the first request isn't slow.
        """
        if self._initialized:
            logger.info("Resources already initialized, skipping...")
            return
        
        logger.info("Initializing resources...")
        
        # Initialize ChromaDB client
        logger.info(f"Initializing ChromaDB at: {settings.CHROMA_PERSIST_DIRECTORY}")
        self._chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIRECTORY
        )
        
        # Warm up the embedding model
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}")
        self._embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        
        # Generate a dummy embedding to fully warm up the model
        logger.info("Warming up embedding model with dummy text...")
        _ = self._embedding_model.encode("Warmup text for model initialization")
        
        # Initialize Generation Model
        logger.info("Initializing Pointer-Generator model...")
        get_generation_service() # Forces lazy-loading config + model
        
        self._initialized = True
        logger.info("All resources initialized successfully!")
    
    def cleanup_resources(self) -> None:
        """Clean up resources during server shutdown."""
        logger.info("Cleaning up resources...")
        self._chroma_client = None
        self._embedding_model = None
        self._initialized = False
        logger.info("Resources cleaned up successfully!")
    
    @property
    def chroma_client(self) -> chromadb.PersistentClient:
        """Get the ChromaDB client, initializing if necessary."""
        if self._chroma_client is None:
            self.init_resources()
        return self._chroma_client
    
    @property
    def embedding_model(self) -> SentenceTransformer:
        """Get the embedding model, initializing if necessary."""
        if self._embedding_model is None:
            self.init_resources()
        return self._embedding_model


# Global resource manager instance
resource_manager = ResourceManager.get_instance()


def get_chroma_client() -> chromadb.PersistentClient:
    """
    Returns the singleton ChromaDB client.
    
    Returns:
        chromadb.PersistentClient: The persistent ChromaDB client instance.
    """
    return resource_manager.chroma_client


def get_embedding_model() -> SentenceTransformer:
    """
    Returns the singleton embedding model.
    
    Returns:
        SentenceTransformer: The sentence transformer model instance.
    """
    return resource_manager.embedding_model


def init_resources() -> None:
    """Initialize all resources (ChromaDB client and embedding model)."""
    resource_manager.init_resources()


def cleanup_resources() -> None:
    """Clean up all resources."""
    resource_manager.cleanup_resources()

# Core package
from .config import settings
from .database import (
    get_chroma_client,
    get_embedding_model,
    init_resources,
    cleanup_resources,
    resource_manager,
)

__all__ = [
    "settings",
    "get_chroma_client",
    "get_embedding_model",
    "init_resources",
    "cleanup_resources",
    "resource_manager",
]

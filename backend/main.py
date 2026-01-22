"""
FastAPI application entry point.
Configures the application with lifespan management, middleware, and routes.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.core.database import init_resources, cleanup_resources, resource_manager
from backend.api.v1.vector_routes import router as vector_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting application...")
    logger.info(f"Project: {settings.PROJECT_NAME}")
    logger.info(f"ChromaDB Path: {settings.CHROMA_PERSIST_DIRECTORY}")
    logger.info(f"Embedding Model: {settings.EMBEDDING_MODEL_NAME}")
    
    # Initialize resources (ChromaDB client and embedding model)
    init_resources()
    logger.info("Application startup complete!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    cleanup_resources()
    logger.info("Application shutdown complete!")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="RAG Backend API for PointerRAG - Document search and retrieval",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API routers
app.include_router(
    vector_router,
    prefix=settings.API_V1_PREFIX
)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with welcome message."""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": "/health"
    }


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint with detailed status.
    Returns the status of ChromaDB and embedding model.
    """
    try:
        chroma_ok = resource_manager._chroma_client is not None
        model_ok = resource_manager._embedding_model is not None
        
        return {
            "status": "healthy" if (chroma_ok and model_ok) else "degraded",
            "chroma_initialized": chroma_ok,
            "embedding_model_loaded": model_ok,
            "embedding_model_name": settings.EMBEDDING_MODEL_NAME,
            "project": settings.PROJECT_NAME
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


# API info endpoint
@app.get("/info", tags=["Info"])
async def api_info():
    """Get API information and configuration."""
    return {
        "project": settings.PROJECT_NAME,
        "api_version": "v1",
        "api_prefix": settings.API_V1_PREFIX,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "endpoints": {
            "search": f"{settings.API_V1_PREFIX}/vector/search",
            "add_documents": f"{settings.API_V1_PREFIX}/vector/documents",
            "delete_chat": f"{settings.API_V1_PREFIX}/vector/chat/{{chat_id}}",
            "collection_stats": f"{settings.API_V1_PREFIX}/vector/stats/{{chat_id}}"
        }
    }

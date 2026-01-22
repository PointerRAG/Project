"""
Pydantic schemas for vector API validation.
Defines request/response models for the RAG system.
"""
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


# ============================================================
# Metadata Models
# ============================================================

class DocumentMetadata(BaseModel):
    """Metadata schema for document chunks following production standards."""
    source_id: str = Field(..., description="Unique identifier for the source document")
    file_name: str = Field(..., description="Original filename of the document")
    page_label: Optional[str] = Field(None, description="Page number or label within the document")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When the document was ingested")
    
    class Config:
        json_schema_extra = {
            "example": {
                "source_id": "doc_001",
                "file_name": "architecture_guide.pdf",
                "page_label": "14",
                "timestamp": "2026-01-21T10:00:00Z"
            }
        }


# ============================================================
# Request Models
# ============================================================

class SearchRequest(BaseModel):
    """Request model for vector search."""
    chat_id: str = Field(..., description="UUID of the chat session")
    query: str = Field(..., min_length=1, description="Search query text")
    top_k: int = Field(default=5, ge=1, le=50, description="Number of results to return")
    
    class Config:
        json_schema_extra = {
            "example": {
                "chat_id": "uuid-123",
                "query": "How do I setup auth?",
                "top_k": 5
            }
        }


class AddDocumentRequest(BaseModel):
    """Request model for adding a single document."""
    text: str = Field(..., min_length=1, description="Document text content")
    metadata: DocumentMetadata = Field(..., description="Document metadata")
    document_id: Optional[str] = Field(None, description="Optional custom document ID")


class AddDocumentsRequest(BaseModel):
    """Request model for adding multiple documents to a chat collection."""
    chat_id: str = Field(..., description="UUID of the chat session")
    documents: List[AddDocumentRequest] = Field(..., min_length=1, description="List of documents to add")
    
    class Config:
        json_schema_extra = {
            "example": {
                "chat_id": "uuid-123",
                "documents": [
                    {
                        "text": "This is sample document content about authentication.",
                        "metadata": {
                            "source_id": "doc_001",
                            "file_name": "auth_guide.pdf",
                            "page_label": "1"
                        }
                    }
                ]
            }
        }


# ============================================================
# Response Models
# ============================================================

class SearchResult(BaseModel):
    """Single search result with text, similarity score, and metadata."""
    text: str = Field(..., description="Retrieved document text")
    score: float = Field(..., description="Similarity score (higher is better)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document metadata")
    document_id: str = Field(..., description="Unique identifier of the document")


class SearchResponse(BaseModel):
    """Response model for search operations."""
    chat_id: str = Field(..., description="Chat ID that was searched")
    query: str = Field(..., description="Original search query")
    results: List[SearchResult] = Field(default_factory=list, description="List of search results")
    total_results: int = Field(..., description="Total number of results returned")


class AddDocumentsResponse(BaseModel):
    """Response model for document addition."""
    chat_id: str = Field(..., description="Chat ID documents were added to")
    documents_added: int = Field(..., description="Number of documents successfully added")
    document_ids: List[str] = Field(..., description="IDs of the added documents")


class DeleteCollectionResponse(BaseModel):
    """Response model for collection deletion."""
    chat_id: str = Field(..., description="Chat ID that was deleted")
    success: bool = Field(..., description="Whether deletion was successful")
    message: str = Field(..., description="Status message")


class HealthCheckResponse(BaseModel):
    """Response model for health check endpoint."""
    status: str = Field(..., description="Service status")
    chroma_initialized: bool = Field(..., description="Whether ChromaDB is initialized")
    embedding_model_loaded: bool = Field(..., description="Whether embedding model is loaded")
    embedding_model_name: str = Field(..., description="Name of the embedding model")


class ErrorResponse(BaseModel):
    """Standard error response model."""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    detail: Optional[str] = Field(None, description="Additional error details")

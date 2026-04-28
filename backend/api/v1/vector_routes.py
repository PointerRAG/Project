"""
Vector API routes for RAG operations.
Provides endpoints for search, document management, and cleanup.
"""
import logging

from fastapi import APIRouter, HTTPException, Depends

from ...schemas.vector import (
    SearchRequest,
    SearchResponse,
    AddDocumentsRequest,
    AddDocumentsResponse,
    DeleteCollectionResponse,
    ErrorResponse,
)
from ...services.vector_service import get_vector_service, VectorService

logger = logging.getLogger(__name__)

# Create router with prefix and tags
router = APIRouter(prefix="/vector", tags=["Vector Operations"])


def get_service() -> VectorService:
    """Dependency to get vector service instance."""
    return get_vector_service()


@router.post(
    "/search",
    response_model=SearchResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    },
    summary="Search documents in a chat collection",
    description="Search for relevant documents in a chat-specific vector collection."
)
async def search_documents(
    request: SearchRequest,
    service: VectorService = Depends(get_service)
) -> SearchResponse:
    """
    Search for documents relevant to the query in a chat collection.
    
    - **chat_id**: UUID of the chat session
    - **query**: Search query text
    - **top_k**: Number of results to return (default: 5, max: 50)
    """
    try:
        # Perform search
        result = service.search_documents(
            chat_id=request.chat_id,
            query=request.query,
            top_k=request.top_k
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )


@router.post(
    "/documents",
    response_model=AddDocumentsResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    },
    summary="Add documents to a chat collection",
    description="Add documents with metadata to a chat-specific vector collection."
)
async def add_documents(
    request: AddDocumentsRequest,
    service: VectorService = Depends(get_service)
) -> AddDocumentsResponse:
    """
    Add documents to a chat collection for RAG retrieval.
    
    - **chat_id**: UUID of the chat session
    - **documents**: List of documents with text and metadata
    """
    try:
        # Extract texts, metadatas, and optional IDs
        texts = [doc.text for doc in request.documents]
        metadatas = [doc.metadata.model_dump() for doc in request.documents]
        document_ids = [
            doc.document_id if doc.document_id else None 
            for doc in request.documents
        ]
        
        # If any ID is None, let the service generate all IDs
        if None in document_ids:
            document_ids = None
        
        # Add documents
        result = service.add_documents(
            chat_id=request.chat_id,
            texts=texts,
            metadatas=metadatas,
            document_ids=document_ids
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Add documents error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add documents: {str(e)}"
        )


@router.delete(
    "/chat/{chat_id}",
    response_model=DeleteCollectionResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Collection not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    },
    summary="Delete a chat collection",
    description="Delete all documents associated with a chat. Use for cleanup."
)
async def delete_chat_collection(
    chat_id: str,
    service: VectorService = Depends(get_service)
) -> DeleteCollectionResponse:
    """
    Delete a chat's document collection.
    
    - **chat_id**: UUID of the chat session to delete
    """
    try:
        # Delete collection
        result = service.delete_collection(chat_id)
        
        if not result.success:
            raise HTTPException(
                status_code=404,
                detail=result.message
            )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete collection error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete collection: {str(e)}"
        )


@router.get(
    "/stats/{chat_id}",
    summary="Get collection statistics",
    description="Get statistics about a chat's document collection."
)
async def get_collection_stats(
    chat_id: str,
    service: VectorService = Depends(get_service)
):
    """
    Get statistics for a chat collection.
    
    - **chat_id**: UUID of the chat session
    """
    try:
        return service.get_collection_stats(chat_id)
    except Exception as e:
        logger.error(f"Get stats error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stats: {str(e)}"
        )


@router.delete(
    "/document/{chat_id}",
    summary="Delete all chunks for a specific document",
    description="Delete all chunks belonging to a specific document upload from a chat collection.",
)
async def delete_document_by_storage_key(
    chat_id: str,
    storage_key: str,
    service: VectorService = Depends(get_service),
):
    """
    Delete all vector chunks for a given storage key from a chat collection.

    - **chat_id**: UUID of the chat session
    - **storage_key**: The unique storage key assigned during ingestion
    """
    try:
        result = service.delete_documents_by_storage_key(chat_id, storage_key)
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Deletion failed"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete document error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(e)}"
        )

"""
Ingestion API routes for document upload and processing.
Provides endpoint for file upload, parsing, chunking, and storage.
"""
import logging
import uuid

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends

from datetime import datetime
from ...schemas.ingestion import IngestResponse, IngestError
from ...services.ingestion_service import (
    get_ingestion_service,
    IngestionService,
    SUPPORTED_EXTENSIONS,
)

logger = logging.getLogger(__name__)

# Maximum file size: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024

# Create router with prefix and tags
router = APIRouter(prefix="/ingest", tags=["Document Ingestion"])


def get_service() -> IngestionService:
    """Dependency to get ingestion service instance."""
    return get_ingestion_service()


@router.post(
    "",
    response_model=IngestResponse,
    responses={
        400: {"model": IngestError, "description": "Bad request"},
        415: {"model": IngestError, "description": "Unsupported media type"},
        413: {"model": IngestError, "description": "File too large"},
        500: {"model": IngestError, "description": "Internal server error"},
    },
    summary="Ingest a document for RAG",
    description=(
        "Upload a document (PDF, TXT, or MD) to be parsed, chunked, "
        "and stored in the vector database for RAG retrieval."
    ),
)
async def ingest_document(
    chat_id: str = Query(..., description="UUID of the chat session"),
    file: UploadFile = File(..., description="Document file to ingest"),
    service: IngestionService = Depends(get_service),
) -> IngestResponse:
    """
    Ingest a document into a chat-specific collection.
    
    - **chat_id**: UUID of the chat session (query parameter)
    - **file**: Document file (PDF, TXT, or MD)
    
    The document will be:
    1. Parsed to extract text
    2. Split into overlapping chunks
    3. Embedded and stored in ChromaDB
    4. Chat document count updated in SQL
    """
    filename = file.filename or "unknown"
    
    # Validate file extension
    if not service.is_supported_file(filename):
        logger.warning(f"Unsupported file type: {filename}")
        raise HTTPException(
            status_code=415,
            detail={
                "error": "UNSUPPORTED_FILE_TYPE",
                "message": f"File type not supported: {filename}",
                "detail": f"Supported types: {', '.join(SUPPORTED_EXTENSIONS)}"
            }
        )
    
    try:
        # Read file content with size check
        file_bytes = await file.read()
        
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "FILE_TOO_LARGE",
                    "message": f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)}MB",
                    "detail": f"Uploaded file size: {len(file_bytes) // (1024*1024)}MB"
                }
            )
        
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "EMPTY_FILE",
                    "message": "Uploaded file is empty",
                    "detail": None
                }
            )
        
        # Generate a unique storage key for this upload
        storage_key = uuid.uuid4().hex
        
        logger.info(f"Ingesting {filename} ({len(file_bytes)} bytes) for chat {chat_id} [key={storage_key}]")
        
        # Process the file
        result = service.ingest_file(
            chat_id=chat_id,
            file_bytes=file_bytes,
            filename=filename,
            storage_key=storage_key
        )
        
        logger.info(
            f"Successfully ingested {filename}: "
            f"{result.chunks_created} chunks from {result.pages_processed} pages"
        )
        
        # SQL updates are now handled by Next.js
        return result
        
    except ValueError as e:
        # Parsing or processing errors
        logger.error(f"Document processing error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "PROCESSING_ERROR",
                "message": str(e),
                "detail": "The document could not be processed"
            }
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Unexpected errors
        logger.exception(f"Unexpected error during ingestion: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred during ingestion",
                "detail": str(e)
            }
        )
    finally:
        # Ensure file handle is closed
        await file.close()


@router.get(
    "/supported-types",
    summary="Get supported file types",
    description="Returns the list of supported file extensions for ingestion."
)
async def get_supported_types():
    """Get the list of supported file types for document ingestion."""
    return {
        "supported_extensions": list(SUPPORTED_EXTENSIONS),
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "description": "Supported document types for RAG ingestion"
    }

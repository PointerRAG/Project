"""
Pydantic schemas for document ingestion API.
Defines request/response models for the file upload and processing pipeline.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================
# Response Models
# ============================================================

class IngestResponse(BaseModel):
    """Successful response for document ingestion."""
    chat_id: str = Field(..., description="Chat ID the documents were ingested into")
    filename: str = Field(..., description="Original filename of the uploaded document")
    chunks_created: int = Field(..., description="Number of text chunks created from the document")
    document_ids: List[str] = Field(..., description="List of document IDs for the created chunks")
    pages_processed: int = Field(default=1, description="Number of pages processed (for PDFs)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "chat_id": "uuid-123",
                "filename": "architecture_guide.pdf",
                "chunks_created": 15,
                "document_ids": ["arch_guide_chunk_0", "arch_guide_chunk_1"],
                "pages_processed": 5
            }
        }


class IngestError(BaseModel):
    """Error response for document ingestion failures."""
    error: str = Field(..., description="Error type identifier")
    message: str = Field(..., description="Human-readable error message")
    detail: Optional[str] = Field(None, description="Additional error details for debugging")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "UNSUPPORTED_FILE_TYPE",
                "message": "The uploaded file type is not supported",
                "detail": "Only PDF, TXT, and MD files are currently supported"
            }
        }

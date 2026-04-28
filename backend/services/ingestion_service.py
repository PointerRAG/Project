"""
Document ingestion service for RAG pipeline.
Handles PDF parsing, text extraction, chunking, and storage orchestration.
"""
import logging
import re
import uuid
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .vector_service import get_vector_service, VectorService
from ..schemas.ingestion import IngestResponse

logger = logging.getLogger(__name__)


# ============================================================
# Constants
# ============================================================

# Supported file extensions
SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}

# Chunking configuration (tokens roughly = chars / 4)
# 600 chars ≈ 150 tokens, overlap of 150 chars ≈ 37.5 tokens (25%)
CHUNK_SIZE = 600
CHUNK_OVERLAP = 150

# Separators for RecursiveCharacterTextSplitter (prioritized)
CHUNK_SEPARATORS = [
    "\n\n",      # Paragraph breaks
    "\n",        # Line breaks
    ". ",        # Sentence ends
    "! ",        # Exclamation ends
    "? ",        # Question ends
    "; ",        # Semicolon breaks
    ", ",        # Clause breaks
    " ",         # Word breaks
    "",          # Character-level (last resort)
]


# ============================================================
# Ingestion Service
# ============================================================

class IngestionService:
    """
    Production-ready document ingestion service.
    Handles parsing, chunking, and storage of uploaded documents.
    """
    
    def __init__(self, vector_service: Optional[VectorService] = None):
        """
        Initialize the ingestion service.
        
        Args:
            vector_service: Optional VectorService instance for dependency injection.
                           If not provided, uses the singleton instance.
        """
        self._vector_service = vector_service
        self._text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=CHUNK_SEPARATORS,
            length_function=len,
            is_separator_regex=False,
        )
    
    @property
    def vector_service(self) -> VectorService:
        """Lazy-load vector service if not injected."""
        if self._vector_service is None:
            self._vector_service = get_vector_service()
        return self._vector_service
    
    # --------------------------------------------------------
    # Text Cleaning Utilities
    # --------------------------------------------------------
    
    def _clean_text(self, text: str) -> str:
        """
        Clean extracted text by normalizing whitespace and characters.
        
        Args:
            text: Raw extracted text.
            
        Returns:
            Cleaned text with normalized spacing.
        """
        if not text:
            return ""
        
        # Replace multiple whitespace with single space
        text = re.sub(r'\s+', ' ', text)
        
        # Remove control characters except newlines
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        
        # Normalize unicode characters
        text = text.replace('\u2019', "'")  # Right single quote
        text = text.replace('\u2018', "'")  # Left single quote
        text = text.replace('\u201c', '"')  # Left double quote
        text = text.replace('\u201d', '"')  # Right double quote
        text = text.replace('\u2014', '-')  # Em dash
        text = text.replace('\u2013', '-')  # En dash
        
        return text.strip()
    
    # --------------------------------------------------------
    # PDF Parsing
    # --------------------------------------------------------
    
    def parse_pdf(self, file_bytes: bytes) -> Tuple[str, int, List[Dict[str, Any]]]:
        """
        Extract text from PDF while preserving page structure.
        
        Args:
            file_bytes: Raw bytes of the PDF file.
            
        Returns:
            Tuple of (full_text, page_count, page_texts) where page_texts
            contains per-page metadata.
            
        Raises:
            ValueError: If PDF cannot be parsed.
        """
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            logger.error(f"Failed to open PDF: {e}")
            raise ValueError(f"Cannot parse PDF file: {str(e)}")
        
        full_text_parts = []
        page_texts = []
        
        try:
            for page_num, page in enumerate(doc):
                try:
                    blocks = page.get_text("blocks")
                    # Extract text from text blocks (block_type == 0)
                    text = "\n\n".join([str(b[4]) for b in blocks if len(b) >= 7 and b[6] == 0])
                    cleaned = self._clean_text(text)
                    
                    if cleaned:
                        full_text_parts.append(cleaned)
                        page_texts.append({
                            "page_number": page_num + 1,
                            "text": cleaned,
                            "char_count": len(cleaned)
                        })
                except Exception as e:
                    logger.warning(f"Failed to extract text from page {page_num + 1}: {e}")
                    continue
            
            page_count = len(doc)
        finally:
            doc.close()
        
        full_text = "\n\n".join(full_text_parts)
        
        if not full_text.strip():
            raise ValueError("PDF contains no extractable text (may be scanned/image-only)")
        
        logger.info(f"Extracted {len(full_text)} characters from {page_count} pages")
        return full_text, page_count, page_texts
    
    # --------------------------------------------------------
    # Text File Parsing
    # --------------------------------------------------------
    
    def parse_text_file(self, file_bytes: bytes) -> Tuple[str, int]:
        """
        Parse a plain text or markdown file.
        
        Args:
            file_bytes: Raw bytes of the text file.
            
        Returns:
            Tuple of (text_content, page_count) where page_count is always 1.
            
        Raises:
            ValueError: If file cannot be decoded.
        """
        # Try UTF-8 first, then fall back to other encodings
        encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']
        
        text = None
        for encoding in encodings:
            try:
                text = file_bytes.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if text is None:
            raise ValueError("Cannot decode text file - unsupported encoding")
        
        cleaned = self._clean_text(text)
        
        if not cleaned:
            raise ValueError("Text file is empty or contains no readable content")
        
        logger.info(f"Parsed text file with {len(cleaned)} characters")
        return cleaned, 1
    
    # --------------------------------------------------------
    # Text Chunking
    # --------------------------------------------------------
    
    def chunk_text(
        self,
        text: str,
        filename: str
    ) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks with metadata.
        
        Args:
            text: Full text content to chunk.
            filename: Source filename for metadata.
            
        Returns:
            List of chunk dictionaries with text and metadata.
        """
        # Use langchain splitter
        chunks = self._text_splitter.split_text(text)
        
        if not chunks:
            logger.warning("Text splitting produced no chunks")
            return []
        
        # Prepare chunks with metadata
        result = []
        timestamp = datetime.utcnow().isoformat()
        
        for idx, chunk_text in enumerate(chunks):
            # Generate unique ID for each chunk
            chunk_id = f"{filename.replace('.', '_')}_chunk_{idx}"
            
            result.append({
                "id": chunk_id,
                "text": chunk_text,
                "metadata": {
                    "source_id": filename,
                    "file_name": filename,
                    "chunk_index": idx,
                    "total_chunks": len(chunks),
                    "timestamp": timestamp,
                }
            })
        
        logger.info(f"Created {len(result)} chunks from {len(text)} characters")
        return result
    
    # --------------------------------------------------------
    # Main Ingestion Pipeline
    # --------------------------------------------------------
    
    def ingest_file(
        self,
        chat_id: str,
        file_bytes: bytes,
        filename: str
    ) -> IngestResponse:
        """
        Full ingestion pipeline: parse → chunk → store.
        
        Args:
            chat_id: Target chat/collection ID.
            file_bytes: Raw file bytes.
            filename: Original filename (used for extension detection).
            
        Returns:
            IngestResponse with ingestion statistics.
            
        Raises:
            ValueError: If file type is unsupported or parsing fails.
        """
        # Validate file extension
        ext = self._get_extension(filename)
        if ext not in SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type: {ext}. "
                f"Supported types: {', '.join(SUPPORTED_EXTENSIONS)}"
            )
        
        # Parse based on file type
        page_count = 1
        if ext == ".pdf":
            text, page_count, _ = self.parse_pdf(file_bytes)
        else:
            text, page_count = self.parse_text_file(file_bytes)
        
        # Chunk the text
        chunks = self.chunk_text(text, filename)
        
        if not chunks:
            raise ValueError("Document produced no text chunks")
        
        # Prepare data for vector storage
        texts = [c["text"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]
        document_ids = [c["id"] for c in chunks]
        
        # Store in vector database
        logger.info(f"Storing {len(chunks)} chunks for chat {chat_id}")
        add_response = self.vector_service.add_documents(
            chat_id=chat_id,
            texts=texts,
            metadatas=metadatas,
            document_ids=document_ids
        )
        
        # Verify storage
        expected = len(chunks)
        actual = add_response.documents_added
        if expected != actual:
            logger.warning(
                f"Chunk count mismatch: expected {expected}, stored {actual}"
            )
        else:
            logger.info(f"Successfully stored {actual} chunks")
        
        return IngestResponse(
            chat_id=chat_id,
            filename=filename,
            file_size=len(file_bytes),
            chunks_created=actual,
            document_ids=add_response.document_ids,
            pages_processed=page_count
        )
    
    # --------------------------------------------------------
    # Utilities
    # --------------------------------------------------------
    
    @staticmethod
    def _get_extension(filename: str) -> str:
        """Extract lowercase file extension from filename."""
        if "." not in filename:
            return ""
        return "." + filename.rsplit(".", 1)[1].lower()
    
    @staticmethod
    def is_supported_file(filename: str) -> bool:
        """Check if a file extension is supported."""
        ext = IngestionService._get_extension(filename)
        return ext in SUPPORTED_EXTENSIONS


# ============================================================
# Singleton Instance
# ============================================================

_ingestion_service: Optional[IngestionService] = None


def get_ingestion_service() -> IngestionService:
    """Get the singleton ingestion service instance."""
    global _ingestion_service
    if _ingestion_service is None:
        _ingestion_service = IngestionService()
    return _ingestion_service

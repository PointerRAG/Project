"""
Vector service module for RAG operations.
Provides dynamic collection management and vector search capabilities.
"""
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from chromadb import Collection

from ..core.database import get_chroma_client, get_embedding_model
from ..schemas.vector import (
    SearchResult,
    SearchResponse,
    AddDocumentsResponse,
    DeleteCollectionResponse,
    DocumentMetadata,
)

logger = logging.getLogger(__name__)


class VectorService:
    """
    Production-ready vector service for RAG operations.
    Manages chat-specific collections and provides search capabilities.
    """
    
    COLLECTION_PREFIX = "chat_"
    
    def __init__(self):
        """Initialize the vector service."""
        self._client = None
        self._model = None
    
    @property
    def client(self):
        """Lazy-load ChromaDB client."""
        if self._client is None:
            self._client = get_chroma_client()
        return self._client
    
    @property
    def model(self):
        """Lazy-load embedding model."""
        if self._model is None:
            self._model = get_embedding_model()
        return self._model
    
    def _get_collection_name(self, chat_id: str) -> str:
        """
        Generate collection name for a chat.
        
        Args:
            chat_id: UUID of the chat session.
            
        Returns:
            Collection name in format 'chat_{chat_id}'.
        """
        return f"{self.COLLECTION_PREFIX}{chat_id}"
    
    def get_collection(self, chat_id: str) -> Collection:
        """
        Get or create a collection for a specific chat.
        
        Args:
            chat_id: UUID of the chat session.
            
        Returns:
            ChromaDB collection for the chat.
        """
        collection_name = self._get_collection_name(chat_id)
        logger.info(f"Getting or creating collection: {collection_name}")
        return self.client.get_or_create_collection(name=collection_name)
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text.
        
        Args:
            text: Text to embed.
            
        Returns:
            List of floats representing the embedding.
        """
        return self.model.encode(text).tolist()
    
    def add_documents(
        self,
        chat_id: str,
        texts: List[str],
        metadatas: List[Dict[str, Any]],
        document_ids: Optional[List[str]] = None
    ) -> AddDocumentsResponse:
        """
        Add documents to a chat-specific collection.
        
        Args:
            chat_id: UUID of the chat session.
            texts: List of document texts.
            metadatas: List of metadata dictionaries for each document.
            document_ids: Optional list of custom document IDs.
            
        Returns:
            AddDocumentsResponse with details of added documents.
        """
        collection = self.get_collection(chat_id)
        
        # Generate IDs if not provided
        if document_ids is None:
            document_ids = [str(uuid.uuid4()) for _ in texts]
        
        # Ensure all metadata has required fields and convert datetime to string
        processed_metadatas = []
        for metadata in metadatas:
            processed = dict(metadata)
            if "timestamp" not in processed:
                processed["timestamp"] = datetime.utcnow().isoformat()
            elif isinstance(processed.get("timestamp"), datetime):
                processed["timestamp"] = processed["timestamp"].isoformat()
            processed_metadatas.append(processed)
        
        # Generate embeddings
        logger.info(f"Generating embeddings for {len(texts)} documents")
        embeddings = [self.generate_embedding(text) for text in texts]
        
        # Add to collection
        logger.info(f"Adding {len(texts)} documents to collection chat_{chat_id}")
        collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=processed_metadatas,
            ids=document_ids
        )
        
        return AddDocumentsResponse(
            chat_id=chat_id,
            documents_added=len(texts),
            document_ids=document_ids
        )
    
    def search_documents(
        self,
        chat_id: str,
        query: str,
        top_k: int = 5
    ) -> SearchResponse:
        """
        Search for documents in a chat-specific collection.
        
        Args:
            chat_id: UUID of the chat session.
            query: Search query text.
            top_k: Number of results to return.
            
        Returns:
            SearchResponse with matching documents and scores.
        """
        collection = self.get_collection(chat_id)
        
        # Generate query embedding
        logger.info(f"Searching collection chat_{chat_id} with query: {query[:50]}...")
        
        # Add instruction for BGE models to improve retrieval quality
        instruction = "Represent this sentence for searching relevant passages: "
        instructed_query = f"{instruction}{query}"
        
        query_embedding = self.generate_embedding(instructed_query)
        
        # Query the collection
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"]
        )
        
        # Convert to response format
        search_results = []
        if results and results.get("documents") and results["documents"][0]:
            documents = results["documents"][0]
            metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(documents)
            distances = results["distances"][0] if results.get("distances") else [0.0] * len(documents)
            ids = results["ids"][0] if results.get("ids") else [str(i) for i in range(len(documents))]
            
            for doc, meta, dist, doc_id in zip(documents, metadatas, distances, ids):
                # Convert distance to similarity score (ChromaDB returns L2 distance)
                # Smaller distance = higher similarity, so we invert it
                similarity_score = 1.0 / (1.0 + dist)
                
                search_results.append(SearchResult(
                    text=doc,
                    score=similarity_score,
                    metadata=meta or {},
                    document_id=doc_id
                ))
        
        logger.info(f"Found {len(search_results)} results for query")
        
        return SearchResponse(
            chat_id=chat_id,
            query=query,
            results=search_results,
            total_results=len(search_results)
        )
    
    def delete_collection(self, chat_id: str) -> DeleteCollectionResponse:
        """
        Delete a chat-specific collection.
        Used for cleanup when a chat is deleted.
        
        Args:
            chat_id: UUID of the chat session.
            
        Returns:
            DeleteCollectionResponse with deletion status.
        """
        collection_name = self._get_collection_name(chat_id)
        
        try:
            logger.info(f"Deleting collection: {collection_name}")
            self.client.delete_collection(name=collection_name)
            return DeleteCollectionResponse(
                chat_id=chat_id,
                success=True,
                message=f"Collection {collection_name} deleted successfully"
            )
        except Exception as e:
            logger.error(f"Error deleting collection {collection_name}: {e}")
            return DeleteCollectionResponse(
                chat_id=chat_id,
                success=False,
                message=f"Failed to delete collection: {str(e)}"
            )
    
    def collection_exists(self, chat_id: str) -> bool:
        """
        Check if a collection exists for a chat.
        
        Args:
            chat_id: UUID of the chat session.
            
        Returns:
            True if collection exists, False otherwise.
        """
        collection_name = self._get_collection_name(chat_id)
        try:
            collections = self.client.list_collections()
            return any(c.name == collection_name for c in collections)
        except Exception:
            return False
    
    def get_collection_stats(self, chat_id: str) -> Dict[str, Any]:
        """
        Get statistics for a chat collection.
        
        Args:
            chat_id: UUID of the chat session.
            
        Returns:
            Dictionary with collection statistics.
        """
        collection = self.get_collection(chat_id)
        return {
            "chat_id": chat_id,
            "collection_name": self._get_collection_name(chat_id),
            "document_count": collection.count()
        }


# Singleton instance
_vector_service: Optional[VectorService] = None


def get_vector_service() -> VectorService:
    """Get the singleton vector service instance."""
    global _vector_service
    if _vector_service is None:
        _vector_service = VectorService()
    return _vector_service

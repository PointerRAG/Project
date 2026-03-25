import logging
import torch
from typing import List
from sentence_transformers import CrossEncoder

logger = logging.getLogger(__name__)

class RerankService:
    def __init__(self):
        self._model = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._model_name = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    def load_model(self):
        if self._model is None:
            logger.info(f"Loading Cross-Encoder model: {self._model_name} on {self._device}")
            # CrossEncoder automatically downloads and loads the model from Hugging Face
            self._model = CrossEncoder(self._model_name, device=self._device)
            logger.info("Reranker model loaded successfully.")

    def rerank_documents(self, query: str, documents: List[str], top_k: int = 3) -> List[str]:
        """
        Reranks the list of documents using the cross-encoder and returns the top_k.
        """
        if not documents:
            return []
            
        if self._model is None:
            self.load_model()
            
        # CrossEncoder expects a list of pairs: [[query, doc1], [query, doc2], ...]
        pairs = [[query, doc] for doc in documents]
        
        # Predict scores
        logger.info(f"Reranking {len(documents)} documents for query: '{query}'")
        scores = self._model.predict(pairs)
        
        # Sort documents by score in descending order
        doc_score_pairs = list(zip(documents, scores))
        doc_score_pairs.sort(key=lambda x: x[1], reverse=True)
        
        # Return top K documents
        return [doc for doc, score in doc_score_pairs[:top_k]]

# Singleton instance
_rerank_service = None

def get_rerank_service() -> RerankService:
    global _rerank_service
    if _rerank_service is None:
        _rerank_service = RerankService()
    return _rerank_service

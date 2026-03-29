import logging
import re
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

def _post_process_context(text: str) -> str:
    """Enhance structure of numbered lists for the generation model."""
    # Matches a number followed by a dot, preceded by start of string or whitespace
    processed = re.sub(r'(^|\s)(\d+)[\.\)]\s+', r'\1\n[List Item \2]: ', text)
    # Clean up any excessive newlines we might have accidentally created
    processed = processed.replace('\n\n[List Item', '\n[List Item').strip()
    return processed

from backend.services.vector_service import get_vector_service
from backend.services.generation_service import get_generation_service

router = APIRouter(prefix="/model", tags=["Model"])
logger = logging.getLogger(__name__)

class GenerateRequest(BaseModel):
    chat_id: str
    query: str

@router.post("/generate")
def generate_answer(request: GenerateRequest) -> Dict[str, Any]:
    """Perform RAG and generate an answer for the given query."""
    try:
        vector_service = get_vector_service()
        # Single retrieval pass: fetch broader candidates, then post-process and rerank.
        search_results = vector_service.search_documents(
            request.chat_id,
            request.query,
            top_k=10,
        )

        # Post-process all rerank candidates for consistency.
        retrieved_texts = [
            _post_process_context(doc.text)
            for doc in search_results.results
        ]
        
        if retrieved_texts:
            # Rerank down to top 3
            from backend.services.rerank_service import get_rerank_service
            rerank_service = get_rerank_service()
            top_docs = rerank_service.rerank_documents(request.query, retrieved_texts, top_k=3)
            context_str = "\n\n".join(top_docs)
        else:
            top_docs = []
            context_str = ""

        
        if context_str:
            generation_service = get_generation_service()
            ai_content = generation_service.generate_answer(request.query, context_str)
        else:
            ai_content = "I do not have enough relevant context to answer this query."

        return {"answer": ai_content}
    except Exception as e:
        logger.error(f"Generate error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate answer")

@router.delete("/{chat_id}")
def delete_chat_vector_collection(chat_id: str):
    """Delete the vector collection for a specific chat."""
    try:
        vector_service = get_vector_service()
        vector_service.delete_collection(chat_id)
        return {"status": "success", "message": "Vector collection deleted"}
    except Exception as e:
        logger.warning(f"Failed to delete vector collection for chat {chat_id}: {e}")
        return {"status": "warning", "message": "Failed to delete from vector DB, or it didn't exist"}

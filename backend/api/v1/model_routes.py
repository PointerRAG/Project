import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
        # Search for documents relevant to the query in the chat's collection
        search_results = vector_service.search_documents(request.chat_id, request.query, top_k=3)
        context_str = "\n\n".join([doc.text for doc in search_results.results])
        
        if context_str:
            generation_service = get_generation_service()
            ai_content = generation_service.generate_answer(request.query, context_str)
        else:
            ai_content = "I couldn't find any documents context relevant to your question."

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

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
        # Search for documents relevant to the query in the chat's collection

        search_results = vector_service.search_documents(request.chat_id, request.query, top_k=3)
        
        # Apply post-processing to each document's text beforehand
        for doc in search_results.results:
            doc.text = _post_process_context(doc.text)
        
        # Save top 3 retrieved documents to a text file
        try:
            with open(r"d:\pointerRAG\retrieved_docs.txt", "w", encoding="utf-8") as f:
                f.write(f"Query: {request.query}\n")
                f.write("="*40 + "\n\n")
                for i, doc in enumerate(search_results.results, 1):
                    f.write(f"--- Document {i} ---\n")
                    f.write(f"{doc.text}\n\n")
        except Exception as file_err:
            logger.error(f"Failed to write retrieved docs to file: {file_err}")

        context_str = "\n\n".join([doc.text for doc in search_results.results])

        search_results = vector_service.search_documents(request.chat_id, request.query, top_k=10)
        
        # Extract initial retrieved texts
        retrieved_texts = [doc.text for doc in search_results.results]
        
        if retrieved_texts:
            # Rerank down to top 3
            from backend.services.rerank_service import get_rerank_service
            rerank_service = get_rerank_service()
            top_docs = rerank_service.rerank_documents(request.query, retrieved_texts, top_k=3)
            context_str = "\n\n".join(top_docs)
        else:
            top_docs = []
            context_str = ""

        
        with open("retrieved_docs.txt", "w", encoding="utf-8") as f:
            f.write(f"Query: {request.query}\n\n")
            # Write the top 3 documents to a text file for verification
            for i, doc in enumerate(top_docs):
                f.write(f"--- Document {i+1} ---\n{doc}\n\n")
        
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

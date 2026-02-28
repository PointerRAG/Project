import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import desc

from backend.core.sql_database import get_db
from backend.core.models import Chat as ChatModel, Message as MessageModel
from backend.schemas.chat import Chat, ChatCreate, MessageCreate, Message, ChatSummary
from backend.services.vector_service import get_vector_service

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=Chat)
def create_chat(chat: ChatCreate, db: Session = Depends(get_db)):
    """Create a new chat session."""
    try:
        title = chat.title if chat.title else "New Chat"
        db_chat = ChatModel(title=title)
        db.add(db_chat)
        db.commit()
        db.refresh(db_chat)
        
        # Convert to Pydantic schema
        return db_chat
    except Exception as e:
        logger.error(f"Error creating chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create chat: {str(e)}")

@router.get("/", response_model=List[ChatSummary])
def get_chats(db: Session = Depends(get_db)):
    """List all chats."""
    chats = db.query(ChatModel).order_by(desc(ChatModel.updatedAt)).all()
    
    # Enrich with last message summary
    result = []
    for c in chats:
        last_msg = ""
        if c.messages:
            # Assumes messages are loaded or we query them. 
            # Since back_populates is used, accessing c.messages loads them.
            # To optimize, we might want to query separately, but this is fine for now.
            sorted_msgs = sorted(c.messages, key=lambda m: m.createdAt, reverse=True)
            if sorted_msgs:
                last_msg = sorted_msgs[0].content
                
        result.append(ChatSummary(
            id=c.id,
            title=c.title,
            updatedAt=c.updatedAt,
            documentCount=c.documentCount,
            lastMessage=last_msg
        ))
    return result

@router.get("/{chat_id}", response_model=Chat)
def get_chat(chat_id: str, db: Session = Depends(get_db)):
    """Get specific chat details."""
    chat = db.query(ChatModel).filter(ChatModel.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@router.post("/{chat_id}/message", response_model=Message)
def send_message(chat_id: str, message: MessageCreate, db: Session = Depends(get_db)):
    """Send a message to the chat and get AI response."""
    chat = db.query(ChatModel).filter(ChatModel.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # 1. Save User Message
    user_msg_model = MessageModel(
        chatId=chat_id,
        role="user",
        content=message.content
    )
    db.add(user_msg_model)
    db.commit() # Commit to get ID and timestamp
    
    # 2. Get Context (RAG)
    try:
            vector_service = get_vector_service()
            # Search for relevant documents
            search_results = vector_service.search_documents(chat_id, message.content, top_k=3)
            context_str = "\n\n".join([doc.text for doc in search_results.results])
            
            # 3. Generate AI Response
            # STUB: For now, just echoing or using a simple template. 
            # In a real app, call OpenAI/Gemini/Ollama here.
            ai_content = f"I found {len(search_results.results)} relevant documents.\n\nHere is what I found:\n{context_str}"
            
            if not context_str:
                ai_content = "I couldn't find any relevant documents to answer your question."

    except Exception as e:
        logger.error(f"RAG error: {e}")
        ai_content = "Sorry, I encountered an error while processing your request."

    # 4. Save AI Message
    ai_msg_model = MessageModel(
        chatId=chat_id,
        role="assistant",
        content=ai_content
    )
    db.add(ai_msg_model)
    
    # Update Chat timestamp
    chat.updatedAt = datetime.utcnow()
    db.add(chat)
    
    db.commit()
    db.refresh(ai_msg_model)
    
    return ai_msg_model

@router.delete("/{chat_id}")
def delete_chat(chat_id: str, db: Session = Depends(get_db)):
    """Delete a chat and its vector collection."""
    chat = db.query(ChatModel).filter(ChatModel.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    # Delete from SQL (Cascade should handle messages)
    db.delete(chat)
    db.commit()
    
    # Delete from Vector DB
    try:
        vector_service = get_vector_service()
        vector_service.delete_collection(chat_id)
    except Exception as e:
        logger.warning(f"Failed to delete vector collection for chat {chat_id}: {e}")
        # Build succeeded, so we don't fail the request just for vector cleanup
        
    return {"status": "success", "message": "Chat deleted"}

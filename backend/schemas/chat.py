from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class MessageBase(BaseModel):
    role: str
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: str
    createdAt: datetime
    chatId: str

    class Config:
        from_attributes = True

class ChatBase(BaseModel):
    title: Optional[str] = None

class ChatCreate(ChatBase):
    pass

class Chat(BaseModel):
    id: str
    title: str
    createdAt: datetime
    updatedAt: datetime
    documentCount: int
    messages: List[Message] = []
    lastMessage: Optional[str] = None # Computed field

    class Config:
        from_attributes = True

class ChatSummary(BaseModel):
    id: str
    title: str
    updatedAt: datetime
    documentCount: int
    lastMessage: Optional[str] = None

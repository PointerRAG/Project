import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .sql_database import Base

class Chat(Base):
    __tablename__ = "Chat"  # Matches Prisma model name

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    userId = Column(String, default="guest", index=True)
    documentCount = Column(Integer, default=0)

    # Relationships
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "Message" # Matches Prisma model name

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    role = Column(String, nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    chatId = Column(String, ForeignKey("Chat.id"), nullable=False, index=True)

    # Relationships
    chat = relationship("Chat", back_populates="messages")

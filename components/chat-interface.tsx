"use client"

import { useState } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatArea } from "./chat-area"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

// Mock chat data structure
export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export interface Chat {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  documentCount: number
  messages: Message[]
}

// this mocks the backend messages history
const mockChats: Chat[] = [
  {
    id: "1",
    title: "Product Requirements Document",
    lastMessage: "Can you summarize the key features?",
    timestamp: "2 hours ago",
    documentCount: 3,
    messages: [
      {
        id: "1",
        role: "assistant",
        content: "Hello! I'm your AI assistant. I can help you with your Product Requirements Document.",
        timestamp: "10:30 AM",
      },
      {
        id: "2",
        role: "user",
        content: "Can you summarize the key features?",
        timestamp: "10:32 AM",
      },
    ]
  },
  {
    id: "2",
    title: "Financial Analysis Q1 2024",
    lastMessage: "What are the revenue trends?",
    timestamp: "1 day ago",
    documentCount: 5,
    messages: [
      {
        id: "1",
        role: "assistant",
        content: "Hello! I've analyzed the Q1 2024 financial data.",
        timestamp: "09:00 AM",
      },
      {
        id: "2",
        role: "user",
        content: "What are the revenue trends?",
        timestamp: "09:05 AM",
      },
    ]
  },
  {
    id: "3",
    title: "Customer Research Insights",
    lastMessage: "Show me the top pain points",
    timestamp: "3 days ago",
    documentCount: 2,
    messages: [
      {
        id: "1",
        role: "user",
        content: "Show me the top pain points",
        timestamp: "3 days ago",
      },
      {
        id: "2",
        role: "assistant",
        content: "Based on the research, the top pain points are...",
        timestamp: "3 days ago",
      }
    ]
  },
]

export function ChatInterface() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(mockChats[0]?.id || null)
  const [chats, setChats] = useState<Chat[]>(mockChats)

  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      lastMessage: "",
      timestamp: "Just now",
      documentCount: 0,
      messages: []
    }
    setChats([newChat, ...chats])
    setCurrentChatId(newChat.id)
  }

  const handleDeleteChat = (chatId: string) => {
    setChats(chats.filter((chat) => chat.id !== chatId))
    if (currentChatId === chatId) {
      setCurrentChatId(chats[0]?.id || null)
    }
  }

  // Future Integration: This function will be replaced/enhanced to call the backend API
  const handleSendMessage = async (content: string) => {
    if (!currentChatId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    // Update local state immediately (optimistic update)
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: content, // Update sidebar preview
          timestamp: "Just now"
        }
      }
      return chat;
    }));

    // Simulate AI Response (To be replaced by real API call)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "This is a demo response. In the future, this will come from the backend.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, aiResponse]
          }
        }
        return chat;
      }));
    }, 1000);
  }

  const currentChat = chats.find((chat) => chat.id === currentChatId)

  return (
    <SidebarProvider defaultOpen>
      <ResizablePanelGroup direction="horizontal" className="h-full w-full overflow-hidden bg-background">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={40} className="hidden md:block">
          <ChatSidebar
            chats={chats}
            currentChatId={currentChatId}
            onSelectChat={setCurrentChatId}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
          />
        </ResizablePanel>
        <ResizableHandle withHandle className="hidden md:flex" />
        <ResizablePanel defaultSize={80}>
          <ChatArea
            currentChat={currentChat}
            messages={currentChat?.messages || []}
            onSendMessage={handleSendMessage}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  )
}

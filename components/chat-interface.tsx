"use client"

import { useState } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatArea } from "./chat-area"
import { SidebarProvider } from "@/components/ui/sidebar"

// Mock chat data structure
export interface Chat {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  documentCount: number
}

// This would come from your database in a real app
const mockChats: Chat[] = [
  {
    id: "1",
    title: "Product Requirements Document",
    lastMessage: "Can you summarize the key features?",
    timestamp: "2 hours ago",
    documentCount: 3,
  },
  {
    id: "2",
    title: "Financial Analysis Q1 2024",
    lastMessage: "What are the revenue trends?",
    timestamp: "1 day ago",
    documentCount: 5,
  },
  {
    id: "3",
    title: "Customer Research Insights",
    lastMessage: "Show me the top pain points",
    timestamp: "3 days ago",
    documentCount: 2,
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

  const currentChat = chats.find((chat) => chat.id === currentChatId)

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <ChatSidebar
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={setCurrentChatId}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
        />
        <ChatArea currentChat={currentChat} />
      </div>
    </SidebarProvider>
  )
}

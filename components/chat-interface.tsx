"use client";

import { useState, useEffect } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatArea } from "./chat-area";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

// Toggle this value to manually experiment with the sidebar width
const SIDEBAR_WIDTH = "300px";

// Types matching Backend Pydantic Schemas
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // Display string or ISO date from backend
}

export interface Chat {
  id: string;
  title: string;
  lastMessage: string | null;
  timestamp: string; // Display string or ISO date
  documentCount: number;
  messages: Message[];
}

export function ChatInterface() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all chats on mount
  useEffect(() => {
    fetchChats();
  }, []);

  // Fetch chats list
  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        // Map backend summary to frontend Chat object
        const mappedChats = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          lastMessage: c.lastMessage,
          timestamp: new Date(c.updatedAt).toLocaleDateString(), // Format date
          documentCount: c.documentCount,
          messages: [], // Summary doesn't have messages
        }));
        setChats(mappedChats);
        // If no chat selected and chats exist, select first
        if (!currentChatId && mappedChats.length > 0) {
          fetchChatDetails(mappedChats[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  };

  // Fetch specific chat details (messages)
  const fetchChatDetails = async (chatId: string) => {
    try {
      setIsLoading(true);
      setCurrentChatId(chatId);

      const res = await fetch(`/api/chat/${chatId}`);
      if (res.ok) {
        const data = await res.json();

        // Update the specific chat in the list with full messages
        setChats((prev) =>
          prev.map((c) => {
            if (c.id === chatId) {
              return {
                ...c,
                messages: data.messages.map((m: any) => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  timestamp: new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })),
                documentCount: data.documentCount,
              };
            }
            return c;
          }),
        );
      }
    } catch (error) {
      console.error("Failed to fetch chat details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async (title: string = "New Chat") => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (res.ok) {
        const newChatData = await res.json();
        const newChat: Chat = {
          id: newChatData.id,
          title: newChatData.title,
          lastMessage: null,
          timestamp: "Just now",
          documentCount: 0,
          messages: [],
        };
        setChats([newChat, ...chats]);
        setCurrentChatId(newChat.id);
      }
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chat/${chatId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setChats(chats.filter((chat) => chat.id !== chatId));
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          // Optionally select next available
          const remaining = chats.filter((chat) => chat.id !== chatId);
          if (remaining.length > 0) {
            fetchChatDetails(remaining[0].id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentChatId) return;

    // Optimistic User Message
    const optimisticMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, optimisticMsg],
            lastMessage: content,
            timestamp: "Just now",
          };
        }
        return chat;
      }),
    );

    try {
      const res = await fetch(`/api/chat/${currentChatId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content }),
      });

      if (res.ok) {
        const aiMsgData = await res.json();
        const aiMsg: Message = {
          id: aiMsgData.id,
          role: aiMsgData.role, // should be 'assistant'
          content: aiMsgData.content,
          timestamp: new Date(aiMsgData.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        // Add assistant response to state
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id === currentChatId) {
              return {
                ...chat,
                messages: [...chat.messages, aiMsg],
              };
            }
            return chat;
          }),
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // TODO: Handle error UI (undo optimistic update?)
    }
  };

  const handleDocumentUploaded = (chatId: string) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, documentCount: chat.documentCount + 1 };
        }
        return chat;
      }),
    );
  };

  const currentChat = chats.find((chat) => chat.id === currentChatId);

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": SIDEBAR_WIDTH,
        } as React.CSSProperties
      }
    >
      <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-background">
        <div className="relative h-full w-(--sidebar-width) shrink-0">
          <ChatSidebar
            chats={chats}
            currentChatId={currentChatId}
            onSelectChat={fetchChatDetails} // Fetch details on select
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
          />
        </div>
        <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <ChatArea
            currentChat={currentChat}
            messages={currentChat?.messages || []}
            onSendMessage={handleSendMessage}
            onDocumentUploaded={handleDocumentUploaded}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

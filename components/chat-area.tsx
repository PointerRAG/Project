"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, FileUp, Paperclip, File, X, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
// Import Message from chat-interface to match
import type { Chat, Message } from "./chat-interface"
import { useSidebar } from "@/components/ui/sidebar"

interface ChatAreaProps {
  currentChat: Chat | undefined
  messages: Message[]
  onSendMessage: (content: string) => void
}

interface UploadedDocument {
  id: string
  name: string
  size: string
}

export function ChatArea({ currentChat, messages, onSendMessage }: ChatAreaProps) {
  const { state, toggleSidebar } = useSidebar()
  const [input, setInput] = useState("")
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    onSendMessage(input)
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Show optimistic UI updates immediately
    const newDocuments: UploadedDocument[] = Array.from(files).map((file) => ({
      id: Date.now().toString() + file.name,
      name: file.name,
      size: (file.size / 1024).toFixed(2) + " KB",
    }))

    setDocuments([...documents, ...newDocuments])

    // Upload to backend
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("chat_id", currentChat?.id || "default-chat")

      try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/ingest", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("File uploaded successfully:", data)
      } catch (error) {
        console.error("Error uploading file:", error)
        // Optionally handle error state here (e.g., mark document as failed)
      }
    }
  }

  const handleRemoveDocument = (docId: string) => {
    setDocuments(documents.filter((doc) => doc.id !== docId))
  }

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
            <FileUp className="size-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-balance">No chat selected</h2>
          <p className="text-muted-foreground text-balance">
            Start a new conversation or select an existing chat from the sidebar
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {state === "collapsed" && (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
                <PanelLeft className="size-5" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-card-foreground">{currentChat.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {documents.length === 0
                  ? "No documents uploaded"
                  : `${documents.length} ${documents.length === 1 ? "document" : "documents"} uploaded`}
              </p>
            </div>
          </div>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
            <FileUp className="size-4" />
            Upload Documents
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt,.md"
          />
        </div>

        {/* Document chips */}
        {documents.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm group">
                <File className="size-4 text-muted-foreground" />
                <span className="text-accent-foreground max-w-[200px] truncate">{doc.name}</span>
                <span className="text-muted-foreground text-xs">({doc.size})</span>
                <button
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 px-4 md:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6 h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 opacity-50 select-none">
              <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10 mb-6">
                <FileUp className="size-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ready to assist</h3>
              <p className="max-w-sm text-sm text-balance">
                Upload your documents to get started with RAG-powered analysis, or simply start typing to chat.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                    <span className="text-primary-foreground text-sm font-semibold">AI</span>
                  </div>
                )}
                <div
                  className={cn("flex flex-col gap-1 max-w-[80%]", message.role === "user" ? "items-end" : "items-start")}
                >
                  <Card
                    className={cn(
                      "px-4 py-3 shadow-sm",
                      message.role === "user" ? "bg-primary text-primary-foreground border-primary" : "bg-card",
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </Card>
                  <span className="text-xs text-muted-foreground px-1">{message.timestamp}</span>
                </div>
                {message.role === "user" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <span className="text-accent-foreground text-sm font-semibold">U</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-card px-4 md:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="min-h-[56px] max-h-[200px] resize-none pr-12 bg-background"
                rows={1}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-2 bottom-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="size-4" />
              </Button>
            </div>
            <Button onClick={handleSend} size="icon" className="size-[56px] shrink-0" disabled={!input.trim()}>
              <Send className="size-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}

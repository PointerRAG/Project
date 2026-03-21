"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, FileUp, Paperclip, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Chat as ChatLayout } from "@/components/chat/chat";
import {
  ChatHeader,
  ChatHeaderAddon,
  ChatHeaderMain,
} from "@/components/chat/chat-header";
import { ChatMessages } from "@/components/chat/chat-messages";
import {
  ChatEvent,
  ChatEventAddon,
  ChatEventBody,
  ChatEventContent,
  ChatEventTime,
  ChatEventTitle,
} from "@/components/chat/chat-event";
import {
  ChatToolbar,
  ChatToolbarAddon,
  ChatToolbarButton,
  ChatToolbarTextarea,
} from "@/components/chat/chat-toolbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
// Import Message from chat-interface to match
import type { Chat as ChatModel, Message } from "./chat-interface";
import { authClient } from "@/lib/auth-client";

interface ChatAreaProps {
  currentChat: ChatModel | undefined;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onDocumentUploaded?: (chatId: string) => void;
}

interface UploadedDocument {
  id: string;
  name: string;
  size: string;
}

export function ChatArea({
  currentChat,
  messages,
  onSendMessage,
  onDocumentUploaded,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const { data: session } = authClient.useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const userName = session?.user?.name?.trim() || "User";
  const userImage = session?.user?.image || undefined;
  const nameParts = userName.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts[0]?.[0] || "U";
  const lastInitial =
    nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : "";
  const userInitials = `${firstInitial}${lastInitial}`.toUpperCase();

  const parseTimestamp = (timestamp: string): number | null => {
    const ms = Date.parse(timestamp);
    return Number.isNaN(ms) ? null : ms;
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Show optimistic UI updates immediately
    const newDocuments: UploadedDocument[] = Array.from(files).map((file) => ({
      id: Date.now().toString() + file.name,
      name: file.name,
      size: (file.size / 1024).toFixed(2) + " KB",
    }));

    setDocuments([...documents, ...newDocuments]);

    // Upload to backend
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chat_id", currentChat?.id || "default-chat");

      try {
        const response = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          try {
             const errorData = await response.json();
             throw new Error(`Upload failed: ${errorData.error || errorData.details || response.statusText}`);
          } catch(e) {
             throw new Error(`Upload failed: ${response.statusText}`);
          }
        }

        const data = await response.json();
        console.log("File uploaded successfully:", data);

        // Notify parent to increment the persistent document count
        if (currentChat?.id && onDocumentUploaded) {
          onDocumentUploaded(currentChat.id);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        // Optionally handle error state here (e.g., mark document as failed)
      }
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments(documents.filter((doc) => doc.id !== docId));
  };

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background h-full">
        <div className="text-center max-w-md px-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
            <FileUp className="size-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-balance">
            No chat selected
          </h2>
          <p className="text-muted-foreground text-balance">
            Start a new conversation or select an existing chat from the sidebar
          </p>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout className="min-h-0 bg-background">
      <ChatHeader className="border-b border-border bg-card px-4 py-3 md:px-6">
        <ChatHeaderMain>
          <div>
            <h1 className="text-xl font-semibold text-card-foreground">
              {currentChat.title}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {currentChat.documentCount === 0
                ? "No documents uploaded"
                : `${currentChat.documentCount} ${currentChat.documentCount === 1 ? "document" : "documents"} uploaded`}
            </p>
          </div>
        </ChatHeaderMain>
        <ChatHeaderAddon>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="gap-2"
          >
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
        </ChatHeaderAddon>
      </ChatHeader>

      {documents.length > 0 && (
        <div className="border-b border-border bg-card px-4 py-3 md:px-6">
          <div className="flex flex-wrap gap-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm"
              >
                <File className="size-4 text-muted-foreground" />
                <span className="max-w-50 truncate text-accent-foreground">
                  {doc.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({doc.size})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="ml-1 size-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ChatMessages
        ref={messagesContainerRef}
        className="min-h-0 flex-col px-4 md:px-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-100 flex-col items-center justify-center p-8 text-center opacity-50 select-none">
            <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10">
              <FileUp className="size-10 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Ready to assist</h3>
            <p className="max-w-sm text-sm text-balance">
              Upload your documents to get started with RAG-powered analysis, or
              simply start typing to chat.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-0.5 py-2">
            {messages.map((message, index, allMessages) => {
              const nextMessage = allMessages[index + 1];
              const ts = parseTimestamp(message.timestamp);
              const nextTs = nextMessage
                ? parseTimestamp(nextMessage.timestamp)
                : null;

              const sameRoleAsNext = message.role === nextMessage?.role;
              const showDateDivider =
                ts !== null &&
                (nextTs === null ||
                  new Date(ts).toDateString() !==
                    new Date(nextTs).toDateString());

              return (
                <React.Fragment key={message.id}>
                  <ChatEvent
                    className={cn(
                      "group rounded-md px-2 py-1.5 hover:bg-accent/40",
                      message.role === "user" && "flex-row-reverse",
                    )}
                  >
                    <ChatEventAddon
                      className={cn(
                        "pt-0.5",
                        message.role === "user" && "justify-center",
                      )}
                    >
                      {sameRoleAsNext ? (
                        <div className="invisible size-8" />
                      ) : (
                        <Avatar className="rounded-sm" size="default">
                          {message.role === "user" && (
                            <AvatarImage src={userImage} alt={userName} />
                          )}
                          <AvatarFallback
                            className={cn(
                              "rounded-sm text-sm font-semibold",
                              message.role === "assistant"
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent text-accent-foreground",
                            )}
                          >
                            {message.role === "assistant" ? "AI" : userInitials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </ChatEventAddon>

                    <ChatEventBody
                      className={cn(
                        "max-w-[80%]",
                        message.role === "user" ? "items-end" : "items-start",
                      )}
                    >
                      {!sameRoleAsNext && (
                        <ChatEventTitle
                          className={cn(
                            "mb-1 text-xs text-muted-foreground",
                            message.role === "user" && "flex-row-reverse",
                          )}
                        >
                          <span className="font-medium">
                            {message.role === "assistant" ? "AI" : "You"}
                          </span>
                          {ts !== null ? (
                            <ChatEventTime timestamp={ts} format="time" />
                          ) : (
                            <span>{message.timestamp}</span>
                          )}
                        </ChatEventTitle>
                      )}

                      <ChatEventContent
                        className={cn(
                          "rounded-lg border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                          message.role === "user"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-card",
                        )}
                      >
                        {message.content}
                      </ChatEventContent>
                    </ChatEventBody>
                  </ChatEvent>

                  {showDateDivider && ts !== null && (
                    <ChatEvent className="my-2 items-center gap-1">
                      <Separator className="flex-1" />
                      <ChatEventTime
                        timestamp={ts}
                        format="longDate"
                        className="min-w-max text-xs font-semibold text-muted-foreground"
                      />
                      <Separator className="flex-1" />
                    </ChatEvent>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </ChatMessages>

      <ChatToolbar className="border-t border-border bg-card px-2 md:px-4">
        <ChatToolbarAddon align="inline-start">
          <ChatToolbarButton
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach document"
          >
            <Paperclip className="size-4" />
          </ChatToolbarButton>
        </ChatToolbarAddon>

        <ChatToolbarTextarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={handleSend}
          placeholder="Type your message... (Shift+Enter for new line)"
          className="max-h-50 bg-background"
        />

        <ChatToolbarAddon align="inline-end">
          <ChatToolbarButton
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </ChatToolbarButton>
        </ChatToolbarAddon>
      </ChatToolbar>

      <p className="px-4 pb-2 text-center text-xs text-muted-foreground md:px-6">
        AI can make mistakes. Verify important information.
      </p>
    </ChatLayout>
  );
}

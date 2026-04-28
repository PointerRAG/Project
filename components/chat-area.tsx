"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Send, FileUp, Paperclip, File, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  formatChatLongDate,
  formatChatTime,
  getStableDayKey,
  parseTimestampToMs,
} from "@/lib/date-format";
// Import shared types
import type { Chat as ChatModel, Message } from "@/lib/types";
import { sendMessageAction, deleteDocumentAction } from "@/lib/actions/chat";
import { toast } from "sonner";
import { Greeting } from "@/components/greeting";

interface ChatAreaProps {
  currentChat: ChatModel | undefined;
  messages: Message[];
  currentUser: {
    name: string;
    image?: string | null;
  };
}

interface UploadedDocument {
  id: string;
  name: string;
  size: string;
  filename: string;
  uploading?: boolean;
}

export function ChatArea({
  currentChat,
  messages,
  currentUser,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);
  const [isGenerating, setIsGenerating] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Reset internal state when navigating between chats
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages, currentChat?.id]);

  const userName = currentUser.name?.trim() || "User";
  const userImage = currentUser.image || undefined;
  const nameParts = userName.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts[0]?.[0] || "U";
  const lastInitial =
    nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : "";
  const userInitials = `${firstInitial}${lastInitial}`.toUpperCase();

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [localMessages]);

  const handleSendMessage = async (content: string) => {
    if (!currentChat || isGenerating) return;

    const optimisticMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, optimisticMsg]);
    setIsGenerating(true);

    try {
      const result = await sendMessageAction(currentChat.id, content);

      if (result.success && result.message) {
        setLocalMessages((prev) => [...prev, result.message as Message]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message", {
        description: "Could not reach the server. Please try again.",
      });
    } finally {
      setIsGenerating(false);
      // Removed router.refresh() because the Server Action handles revalidation natively!
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    handleSendMessage(input);
    setInput("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

    // Filter out oversized files and show a toast for each rejected one
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`"${file.name}" is too large`, {
          description: `Files must be under ${(MAX_SIZE_BYTES / (1024 * 1024)).toFixed(2)} MB. This file is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`,
        });
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      // Reset the input so the same file can be re-selected after rejection
      e.target.value = "";
      return;
    }

    // Show optimistic UI updates immediately and keep stable IDs for rollback.
    const uploadQueue = validFiles.map((file, index) => ({
      file,
      optimisticDocument: {
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        size: (file.size / 1024).toFixed(2) + " KB",
        filename: file.name,
        uploading: true,
      } satisfies UploadedDocument,
    }));

    setDocuments((prev) => [
      ...prev,
      ...uploadQueue.map((item) => item.optimisticDocument),
    ]);

    // Upload to backend via streaming API route
    for (const { file, optimisticDocument } of uploadQueue) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const uploadPromise = fetch(
          `/api/upload?chatId=${encodeURIComponent(currentChat?.id || "default-chat")}`,
          { method: "POST", body: formData },
        ).then(async (response) => {
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const error = new Error(err.error || "Upload failed");
            (error as any).detail = err.detail || null;
            throw error;
          }
          return response.json();
        });

        toast.promise(uploadPromise, {
          loading: `Uploading "${file.name}"...`,
          success: (data) => {
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === optimisticDocument.id ? { ...d, uploading: false } : d,
              ),
            );
            router.refresh();
            return {
              message: `"${file.name}" uploaded successfully`,
              description: `${data?.result?.chunks_created ?? 0} chunks created from ${data?.result?.pages_processed ?? 0} pages`,
            };
          },
          error: (err) => {
            setDocuments((prev) =>
              prev.filter((d) => d.id !== optimisticDocument.id),
            );
            return {
              message: `Failed to upload "${file.name}"`,
              description:
                err.detail || err.message || "An unexpected error occurred",
            };
          },
        });

        await uploadPromise;
      } catch {
        console.error("Failed to upload file");
      }
    }

    // Reset input
    e.target.value = "";
  };

  const handleRemoveDocument = async (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    // Remove from UI immediately
    setDocuments(documents.filter((d) => d.id !== docId));
    // Delete from backend collection
    if (doc && currentChat) {
      try {
        await deleteDocumentAction(currentChat.id, doc.filename);
        router.refresh();
      } catch (error) {
        console.error("Failed to delete document from collection:", error);
        toast.error(`Failed to remove "${doc.name}"`, {
          description: "Could not delete the document. Please try again.",
        });
      }
    }
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
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="border-b border-border bg-card px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
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
          </div>

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
        </div>
      </div>

      {documents.length > 0 && (
        <div className="border-b border-border bg-card px-4 py-3 md:px-6">
          <div className="flex flex-wrap gap-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm"
              >
                {doc.uploading ? (
                  <Loader2 className="size-4 text-muted-foreground animate-spin" />
                ) : (
                  <File className="size-4 text-muted-foreground" />
                )}
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

      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 md:px-6"
      >
        {localMessages.length === 0 ? (
          <div className="flex h-full min-h-100 flex-col items-center justify-center p-8 text-center select-none">
            <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10">
              <FileUp className="size-10 text-primary" />
            </div>
            <Greeting userName={userName} />
            <p className="max-w-sm text-sm text-balance text-muted-foreground">
              Upload your documents to get started with RAG-powered analysis, or
              simply start typing to chat.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-0.5 py-2">
            {localMessages.map((message, index, allMessages) => {
              const prevMessage = allMessages[index - 1];
              const nextMessage = allMessages[index + 1];
              const ts = parseTimestampToMs(message.timestamp);
              const prevTs = prevMessage
                ? parseTimestampToMs(prevMessage.timestamp)
                : null;
              const nextTs = nextMessage
                ? parseTimestampToMs(nextMessage.timestamp)
                : null;

              const sameRoleAsNext = message.role === nextMessage?.role;
              const showDateDivider =
                ts !== null &&
                (prevTs === null ||
                  getStableDayKey(ts) !== getStableDayKey(prevTs));

              return (
                <React.Fragment key={message.id}>
                  {showDateDivider && ts !== null && (
                    <div className="my-2 flex items-center gap-1">
                      <Separator className="flex-1" />
                      <span
                        className="min-w-max text-xs font-semibold text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {formatChatLongDate(ts)}
                      </span>
                      <Separator className="flex-1" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "group flex gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40",
                      message.role === "user" && "flex-row-reverse",
                    )}
                  >
                    <div
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
                    </div>

                    <div
                      className={cn(
                        "flex max-w-[80%] flex-col",
                        message.role === "user" ? "items-end" : "items-start",
                      )}
                    >
                      {!sameRoleAsNext && (
                        <div
                          className={cn(
                            "mb-1 flex items-center gap-2 text-xs text-muted-foreground",
                            message.role === "user" && "flex-row-reverse",
                          )}
                        >
                          <span className="font-medium">
                            {message.role === "assistant" ? "AI" : "You"}
                          </span>
                          {ts !== null ? (
                            <span suppressHydrationWarning>
                              {formatChatTime(ts)}
                            </span>
                          ) : (
                            <span>{message.timestamp}</span>
                          )}
                        </div>
                      )}

                      <div
                        className={cn(
                          "rounded-lg border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                          message.role === "user"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-card",
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {isGenerating && (
              <div className="group mt-2 flex gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40">
                <div className="pt-0.5">
                  <Avatar className="rounded-sm" size="default">
                    <AvatarFallback className="rounded-sm text-sm font-semibold bg-primary text-primary-foreground">
                      AI
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex max-w-[80%] flex-col items-start">
                  <div className="mb-1 text-xs text-muted-foreground">
                    <span className="font-medium">AI</span>
                  </div>
                  <div className="rounded-lg border bg-card px-5 py-4 text-sm leading-relaxed shadow-sm">
                    <div className="flex space-x-1 items-center h-4">
                      <div
                        className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"
                        style={{ animationDelay: "-0.3s" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"
                        style={{ animationDelay: "-0.15s" }}
                      ></div>
                      <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-20 bg-background px-2 pb-3 pt-2 backdrop-blur md:px-4">
        <Card className="mx-auto w-full max-w-3xl gap-0 rounded-4xl border-0 bg-card py-3 shadow-xl">
          <div className="px-3 md:px-5">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={isGenerating}
              placeholder={
                isGenerating ? "AI is generating..." : "Ask me anything..."
              }
              className="h-10 border-0 bg-card dark:bg-card px-0 text-2xl shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none"
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 px-3 md:px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach document"
              className="h-11 rounded-full px-4"
            >
              <Paperclip className="size-4" strokeWidth={1.8} />
              Attach
            </Button>

            <Button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              aria-label="Send message"
              size="icon"
              className="size-11 rounded-full"
            >
              <Send className="size-4.5" />
            </Button>
          </div>
        </Card>

        <p className="px-4 pt-3 text-center text-xs text-muted-foreground md:px-6">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

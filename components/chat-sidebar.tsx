"use client"

import { useState } from "react"
import { MessageSquarePlus, LogOut, Search, MoreVertical, Trash2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Chat } from "./chat-interface"
import { ModeToggle } from "@/components/mode-toggle"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

interface ChatSidebarProps {
  chats: Chat[]
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: (title: string) => void
  onDeleteChat: (chatId: string) => void
}

export function ChatSidebar({ chats, currentChatId, onSelectChat, onNewChat, onDeleteChat }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false)
  const [newChatTitle, setNewChatTitle] = useState("")

  const filteredChats = chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
  const router = useRouter();
  const handleLogout = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
          },
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  const handleCreateChat = () => {
    if (newChatTitle.trim()) {
      onNewChat(newChatTitle.trim())
    } else {
      onNewChat("New Chat")
    }
    setIsNewChatDialogOpen(false)
    setNewChatTitle("")
  }

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">Pointer RAG</span>
          </div>
          <div className="flex items-center gap-1">
            <ModeToggle />
            <SidebarTrigger />
          </div>
        </div>

        <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0" size="lg">
              <MessageSquarePlus className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">New Chat</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Chat</DialogTitle>
              <DialogDescription>
                Provide a name for your new conversation.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="title" className="mb-2 block text-sm font-medium">Chat Title</Label>
              <Input
                id="title"
                placeholder="Enter chat title..."
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateChat();
                  }
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewChatDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateChat}>Create Chat</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarHeader>

      <SidebarContent className="flex flex-col p-2 min-h-0">
        <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-sidebar-accent/50"
            />
          </div>
        </div>

        <Separator className="my-2 group-data-[collapsible=icon]:hidden" />

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-1 p-2">
            {filteredChats.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
                {searchQuery ? "No chats found" : "No chats yet"}
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={cn(
                    "group relative flex w-full flex-col gap-1 rounded-lg p-3 text-left transition-colors",
                    "hover:bg-sidebar-accent",
                    currentChatId === chat.id && "bg-sidebar-accent",
                    "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:items-center"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 w-full group-data-[collapsible=icon]:justify-center">
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                      <p className="truncate font-medium text-sm text-sidebar-foreground">{chat.title}</p>
                    </div>
                    {/* Icon for collapsed state representing the chat */}
                    <div className="hidden group-data-[collapsible=icon]:block">
                      <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-medium">
                        {chat.title.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 group-data-[collapsible=icon]:hidden"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteChat(chat.id)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    <span>{chat.timestamp}</span>
                    {chat.documentCount > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                        {chat.documentCount} {chat.documentCount === 1 ? "doc" : "docs"}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
                U
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">User Name</span>
                <span className="truncate text-xs">user@example.com</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

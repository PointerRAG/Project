"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  MessageSquarePlus,
  LogOut,
  Search,
  MoreVertical,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Chat } from "@/lib/types";
import { ModeToggle } from "@/components/mode-toggle";
import { authClient } from "@/lib/auth-client";
import { useRouter, useParams } from "next/navigation";
import { createChatAction, deleteChatAction } from "@/lib/actions/chat";

interface ChatSidebarProps {
  chats: Chat[];
  currentUser: {
    name: string;
    email: string;
    image?: string | null;
  };
}

export function ChatSidebar({ chats, currentUser }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isDeletingChatId, setIsDeletingChatId] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const currentChatId = params?.chatId as string | undefined;

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
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
  };

  const handleCreateChat = async () => {
    if (isCreatingChat) return;
    const title = newChatTitle.trim() || "New Chat";
    setIsCreatingChat(true);

    try {
      const result = await createChatAction(title);
      if (result.success) {
        setIsNewChatDialogOpen(false);
        setNewChatTitle("");
        router.push(`/chat/${result.id}`);
      }
    } catch (error) {
      console.error("Failed to create new chat:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred creating chat",
      );
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (isDeletingChatId === chatId) return;
    setIsDeletingChatId(chatId);
    try {
      const result = await deleteChatAction(chatId);
      if (result.success) {
        if (currentChatId === chatId) {
          router.push("/chat");
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred deleting chat",
      );
    } finally {
      setIsDeletingChatId(null);
    }
  };

  const userName = currentUser.name?.trim() || "User";
  const userEmail = currentUser.email?.trim() || "No email";
  const userImage = currentUser.image || undefined;
  const nameParts = userName.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts[0]?.[0] || "U";
  const lastInitial =
    nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : "";
  const userInitials = `${firstInitial}${lastInitial}`.toUpperCase();

  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Pointer RAG
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ModeToggle />
          </div>
        </div>

        <Dialog
          open={isNewChatDialogOpen}
          onOpenChange={setIsNewChatDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
              size="lg"
            >
              <MessageSquarePlus className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                New Chat
              </span>
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
              <Label htmlFor="title" className="mb-2 block text-sm font-medium">
                Chat Title
              </Label>
              <Input
                id="title"
                placeholder="Enter chat title..."
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                disabled={isCreatingChat}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreatingChat) {
                    e.preventDefault();
                    handleCreateChat();
                  }
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsNewChatDialogOpen(false)}
                disabled={isCreatingChat}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateChat} disabled={isCreatingChat}>
                {isCreatingChat ? "Creating..." : "Create Chat"}
              </Button>
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
          <SidebarGroup className="p-2">
            {filteredChats.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
                {searchQuery ? "No chats found" : "No chats yet"}
              </div>
            ) : (
              <SidebarMenu>
                {filteredChats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      isActive={currentChatId === chat.id}
                      onClick={() => router.push(`/chat/${chat.id}`)}
                      className={cn(
                        "h-auto items-start gap-1.5 p-3",
                        "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0",
                      )}
                    >
                      <div className="flex w-full items-start justify-between gap-2 group-data-[collapsible=icon]:justify-center">
                        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                          <p className="truncate font-medium text-sm text-sidebar-foreground">
                            {chat.title}
                          </p>
                        </div>
                        <div className="hidden group-data-[collapsible=icon]:block">
                          <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-medium">
                            {chat.title.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full items-center justify-between text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                        <span>{chat.timestamp}</span>
                        {chat.documentCount > 0 && (
                          <SidebarMenuBadge className="static h-auto min-w-0 px-2 py-0.5 text-[10px] text-primary">
                            {chat.documentCount}{" "}
                            {chat.documentCount === 1 ? "doc" : "docs"}
                          </SidebarMenuBadge>
                        )}
                      </div>
                    </SidebarMenuButton>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction
                          showOnHover
                          onClick={(e) => e.stopPropagation()}
                          className="group-data-[collapsible=icon]:hidden"
                        >
                          <MoreVertical className="size-4" />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(chat.id);
                          }}
                          disabled={isDeletingChatId === chat.id}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          {isDeletingChatId === chat.id
                            ? "Deleting..."
                            : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="default"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-auto py-1"
                >
                  <Avatar className="rounded-sm" size="default">
                    <AvatarImage src={userImage} alt={userName} />
                    <AvatarFallback className="rounded-sm bg-primary text-primary-foreground font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs">{userEmail}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="end"
                side="top"
              >
                <DropdownMenuLabel className="truncate">
                  {userName}
                </DropdownMenuLabel>
                <DropdownMenuLabel className="-mt-2 truncate text-xs font-normal text-muted-foreground">
                  {userEmail}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="size-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* Spacer matching the height of the right-side disclaimer text */}
        <div className="h-5" />
      </SidebarFooter>
    </Sidebar>
  );
}

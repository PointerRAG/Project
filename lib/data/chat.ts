import { prisma } from "@/lib/prisma";
import type { Chat, Message } from "@/lib/types";

export async function getUserChats(userId: string): Promise<Chat[]> {
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return chats.map((c: any) => ({
    id: c.id,
    title: c.title,
    timestamp: new Date(c.updatedAt).toISOString(),
    documentCount: c.documentCount,
    lastMessage: c.messages.length > 0 ? c.messages[0].content : null,
    messages: [],
  }));
}

export async function getChatById(
  chatId: string,
  userId: string,
): Promise<Chat | null> {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!chat) {
    return null;
  }

  const messages: Message[] = chat.messages.map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.createdAt).toISOString(),
  }));

  return {
    id: chat.id,
    title: chat.title,
    lastMessage:
      messages.length > 0 ? messages[messages.length - 1].content : null,
    timestamp: new Date(chat.updatedAt).toISOString(),
    documentCount: chat.documentCount,
    messages,
  };
}

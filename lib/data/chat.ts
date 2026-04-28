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
      _count: {
        select: { documents: true },
      },
    },
  });

  return chats.map((c: any) => ({
    id: c.id,
    title: c.title,
    timestamp: new Date(c.updatedAt).toISOString(),
    documentCount: c._count.documents,
    lastMessage: c.messages.length > 0 ? c.messages[0].content : null,
    documents: [],
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
      documents: {
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { documents: true },
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
    documentCount: chat._count.documents,
    documents: chat.documents.map((d: any) => ({
      id: d.id,
      name: d.name,
      size: Number(d.size),
      createdAt: new Date(d.createdAt).toISOString(),
    })),
    messages,
  };
}

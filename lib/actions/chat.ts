"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function createChatAction(title: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const chat = await prisma.chat.create({
    data: {
      title,
      userId: session.user.id,
    },
  });

  revalidatePath("/chat");
  return { success: true, id: chat.id };
}

export async function deleteChatAction(chatId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Unauthorized or Chat not found");
  }

  await prisma.chat.delete({
    where: { id: chatId },
  });

  try {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    await fetch(`${backendUrl}/api/v1/model/${chatId}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Failed to delete vector collection", err);
  }

  revalidatePath("/chat");
  return { success: true };
}

const BACKEND_API_BASE = process.env.BACKEND_API_BASE ?? "http://127.0.0.1:8000/api/v1";

export async function sendMessageAction(chatId: string, content: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Unauthorized or Chat not found");
  }

  if (!content) {
    throw new Error("Content is required");
  }

  // Save User message
  await prisma.message.create({
    data: {
      role: "user",
      content,
      chatId,
    },
  });

  // Call Python backend
  const response = await fetch(`${BACKEND_API_BASE}/model/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, query: content }),
  });

  if (!response.ok) {
    console.error("Python backend error:", await response.text());
    const failMessage = await prisma.message.create({
      data: {
        role: "assistant",
        content: "Sorry, the model service is currently unavailable.",
        chatId,
      },
    });
    revalidatePath(`/chat`);
    return {
      success: true,
      message: {
        id: failMessage.id,
        role: failMessage.role,
        content: failMessage.content,
        timestamp: new Date(failMessage.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    };
  }

  const result = await response.json();
  const aiContent = result.answer || "Sorry, I couldn't generate an answer.";

  // Save AI message
  const aiMessage = await prisma.message.create({
    data: {
      role: "assistant",
      content: aiContent,
      chatId,
    },
  });

  // Update chat timestamp
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/chat`);
  return {
    success: true,
    message: {
      id: aiMessage.id,
      role: aiMessage.role,
      content: aiMessage.content,
      timestamp: new Date(aiMessage.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  };
}

export async function uploadDocumentAction(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const chatId = formData.get("chat_id") as string;
  const file = formData.get("file");

  if (!chatId || !file) {
    throw new Error("chat_id and file are required");
  }

  // Verify chat ownership
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Chat not found or unauthorized");
  }

  // Forward the file to Python ML backend
  const response = await fetch(`${BACKEND_API_BASE}/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Python ingestion error:", errText);
    throw new Error(`Backend processing failed: ${errText}`);
  }

  const result = await response.json();

  // Increment document count in Next.js Prisma
  await prisma.chat.update({
    where: { id: chatId },
    data: {
      documentCount: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  revalidatePath("/chat");
  return { success: true, result };
}

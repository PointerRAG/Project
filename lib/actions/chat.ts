"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE ?? "http://127.0.0.1:8000/api/v1";

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
    await fetch(`${BACKEND_API_BASE}/model/${chatId}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Failed to delete vector collection", err);
  }

  revalidatePath("/chat");
  return { success: true };
}

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

  let aiContent = "Sorry, the model service is currently unavailable.";

  try {
    const response = await fetch(`${BACKEND_API_BASE}/model/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, query: content }),
    });

    if (response.ok) {
      const result = await response.json();
      aiContent = result.answer || "Sorry, I couldn't generate an answer.";
    } else {
      console.error("Python backend error:", await response.text());
    }
  } catch (err) {
    console.error("Failed to communicate with Python backend:", err);
  }

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
      timestamp: new Date(aiMessage.createdAt).toISOString(),
    },
  };
}




export async function deleteDocumentAction(chatId: string, filename: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Verify chat ownership
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Chat not found or unauthorized");
  }

  // Tell the Python backend to delete all chunks for this filename
  const url = `${BACKEND_API_BASE}/vector/document/${chatId}?filename=${encodeURIComponent(filename)}`;
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Python delete error:", errText);
    throw new Error(`Backend deletion failed: ${errText}`);
  }

  // Decrement document count in Prisma (floor at 0)
  await prisma.chat.update({
    where: { id: chatId },
    data: {
      documentCount: { decrement: 1 },
      updatedAt: new Date(),
    },
  });

  revalidatePath("/chat");
  return { success: true };
}

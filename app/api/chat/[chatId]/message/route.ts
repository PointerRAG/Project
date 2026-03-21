import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const BACKEND_API_BASE = process.env.BACKEND_API_BASE ?? "http://127.0.0.1:8000/api/v1";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId }
    });

    if (!chat || chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const body = await request.json();
    if (!body.content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Save User message
    await prisma.message.create({
      data: {
        role: "user",
        content: body.content,
        chatId
      }
    });

    // Call Python backend
    const response = await fetch(`${BACKEND_API_BASE}/model/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, query: body.content })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Python backend error:", err);
      // Even if AI fails, we might want to return an AI message indicating failure
      const failMessage = await prisma.message.create({
        data: { role: "assistant", content: "Sorry, the model service is currently unavailable.", chatId }
      });
      return NextResponse.json(failMessage);
    }

    const result = await response.json();
    const aiContent = result.answer || "Sorry, I couldn't generate an answer.";

    // Save AI message
    const aiMessage = await prisma.message.create({
      data: {
        role: "assistant",
        content: aiContent,
        chatId
      }
    });

    // Update chat timestamp
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json(aiMessage);
  } catch (error) {
    console.error("Error processing message:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

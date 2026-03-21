import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE ?? "http://127.0.0.1:8000/api/v1";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const chatId = formData.get("chat_id") as string;
    const file = formData.get("file");

    if (!chatId || !file) {
      return NextResponse.json(
        { error: "chat_id and file are required" },
        { status: 400 },
      );
    }

    // Verify chat ownership
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat || chat.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Chat not found or unauthorized" },
        { status: 404 },
      );
    }

    // Forward the file to Python ML backend
    const response = await fetch(`${BACKEND_API_BASE}/ingest`, {
      method: "POST",
      body: formData, // passing the exact same form data
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Python ingestion error:", errText);
      return NextResponse.json(
        { error: "Backend processing failed", details: errText },
        { status: response.status },
      );
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Ingestion proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE ?? "http://127.0.0.1:8000/api/v1";

/**
 * Streaming upload proxy – authenticates the user, verifies chat
 * ownership, then pipes the raw request body directly to the Python
 * backend without buffering the file into Node.js memory.
 */
export async function POST(request: NextRequest) {
  // 1. Authenticate
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Read chatId from query params
  const chatId = request.nextUrl.searchParams.get("chatId");

  if (!chatId) {
    return NextResponse.json(
      { error: "chatId query parameter is required" },
      { status: 400 },
    );
  }

  // 3. Verify chat ownership
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat || chat.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Chat not found or unauthorized" },
      { status: 403 },
    );
  }

  // 4. Stream the request body directly to the Python backend.
  //    The verified chatId is passed as a query param so the backend
  //    derives the target chat solely from the server-verified value.
  const contentType = request.headers.get("content-type");
  const backendUrl = `${BACKEND_API_BASE}/ingest?chat_id=${encodeURIComponent(chatId)}`;

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl, {
      method: "POST",
      body: request.body,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      // @ts-expect-error -- Node 18+ supports duplex for streaming request bodies
      duplex: "half",
    });
  } catch (error) {
    console.error("Python ingestion transport error:", error);
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }

  if (!backendResponse.ok) {
    const errText = await backendResponse.text();
    console.error("Python ingestion error:", errText);

    // Python errors follow: { detail: { error, message, detail } }
    const parsed = (() => { try { return JSON.parse(errText); } catch { return null; } })();

    const backendDetail = parsed?.detail;
    return NextResponse.json(
      {
        error: backendDetail?.message || "Backend processing failed",
        detail: backendDetail?.detail || null,
      },
      { status: backendResponse.status },
    );
  }

  let result;
  try {
    result = await backendResponse.json();
  } catch {
    console.error("Failed to parse Python backend response as JSON");
    return NextResponse.json(
      { error: "Invalid response from backend" },
      { status: 502 },
    );
  }

  // 5. Create a Document record in Prisma
  const filename = result?.filename || "unknown";
  const fileSize = result?.file_size || 0;

  await prisma.document.create({
    data: {
      name: filename,
      filename: filename,
      size: fileSize,
      chatId,
    },
  });

  revalidatePath("/chat");

  return NextResponse.json({ success: true, result });
}

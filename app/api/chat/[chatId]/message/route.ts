import { proxyToBackend } from "@/app/api/_utils/backend";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  const body = await request.text();

  return proxyToBackend(`/chat/${chatId}/message`, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
    },
    body,
  });
}

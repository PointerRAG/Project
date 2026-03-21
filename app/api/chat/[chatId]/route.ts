import { proxyToBackend } from "@/app/api/_utils/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  return proxyToBackend(`/chat/${chatId}`);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;

  return proxyToBackend(`/chat/${chatId}`, {
    method: "DELETE",
  });
}

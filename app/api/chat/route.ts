import { proxyToBackend } from "@/app/api/_utils/backend";

export async function GET() {
  return proxyToBackend("/chat/");
}

export async function POST(request: Request) {
  const body = await request.text();

  return proxyToBackend("/chat/", {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
    },
    body,
  });
}

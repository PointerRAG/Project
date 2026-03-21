import { NextResponse } from "next/server";

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE ?? "http://127.0.0.1:8000/api/v1";

function toBackendUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_API_BASE}${normalizedPath}`;
}

export async function proxyToBackend(
  path: string,
  init?: RequestInit,
): Promise<NextResponse> {
  try {
    const upstream = await fetch(toBackendUrl(path), {
      cache: "no-store",
      ...init,
    });

    const body = await upstream.arrayBuffer();
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");

    if (contentType) {
      headers.set("content-type", contentType);
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Backend request failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}

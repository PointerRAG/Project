import { proxyToBackend } from "@/app/api/_utils/backend";

export async function POST(request: Request) {
  const formData = await request.formData();

  return proxyToBackend("/ingest", {
    method: "POST",
    body: formData,
  });
}

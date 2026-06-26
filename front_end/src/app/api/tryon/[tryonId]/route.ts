import { NextRequest, NextResponse } from "next/server";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || "http://server:8080";

export async function GET(
  req: NextRequest,
  { params }: { params: { tryonId: string } }
) {
  const authHeader = req.headers.get("authorization") || "";
  try {
    const resp = await fetch(
      `${GO_BACKEND_URL}/api/tryon/${encodeURIComponent(params.tryonId)}`,
      {
        method: "GET",
        headers: { Authorization: authHeader },
        cache: "no-store",
      }
    );
    const data = await resp.json().catch(() => ({ error: "Bad gateway" }));
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ error: "خطا در دریافت پرو" }, { status: 502 });
  }
}

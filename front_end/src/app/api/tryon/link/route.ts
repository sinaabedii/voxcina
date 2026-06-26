import { NextRequest, NextResponse } from "next/server";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || "http://server:8080";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  try {
    const body = await req.text();
    const resp = await fetch(`${GO_BACKEND_URL}/api/tryon/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body,
    });
    const data = await resp.json().catch(() => ({ error: "Bad gateway" }));
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ error: "خطا در اتصال پرو" }, { status: 502 });
  }
}

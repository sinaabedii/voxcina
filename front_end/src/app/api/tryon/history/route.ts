import { NextRequest, NextResponse } from "next/server";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || "http://server:8080";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const url = new URL(req.url);
  const qs = url.search;
  try {
    const resp = await fetch(`${GO_BACKEND_URL}/api/tryon/history${qs}`, {
      method: "GET",
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    const data = await resp.json().catch(() => ({ error: "Bad gateway" }));
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ error: "خطا در دریافت تاریخچه" }, { status: 502 });
  }
}

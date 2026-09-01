import { NextRequest, NextResponse } from "next/server";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || "http://server:8080";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const authHeader = req.headers.get("authorization") || "";
  try {
    const resp = await fetch(
      `${GO_BACKEND_URL}/api/tryon/sessions/${encodeURIComponent(chatId)}`,
      {
        method: "GET",
        headers: { Authorization: authHeader },
        cache: "no-store",
      }
    );
    const data = await resp.json().catch(() => ({ error: "Bad gateway" }));
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ error: "خطا در دریافت جلسه" }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const authHeader = req.headers.get("authorization") || "";
  try {
    const resp = await fetch(
      `${GO_BACKEND_URL}/api/tryon/sessions/${encodeURIComponent(chatId)}`,
      {
        method: "DELETE",
        headers: { Authorization: authHeader },
      }
    );
    const data = await resp.json().catch(() => ({ error: "Bad gateway" }));
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ error: "خطا در حذف جلسه" }, { status: 502 });
  }
}

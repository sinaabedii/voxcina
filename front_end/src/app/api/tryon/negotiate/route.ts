import { NextRequest, NextResponse } from "next/server";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || "http://server:8080";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const authHeader = req.headers.get("authorization") || "";

    const resp = await fetch(`${GO_BACKEND_URL}/api/tryon/negotiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body,
      signal: AbortSignal.timeout(120000),
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    if (err?.name === "AbortError" || err?.name === "TimeoutError") {
      return NextResponse.json(
        { error: "زمان مذاکره به پایان رسید. لطفاً دوباره تلاش کنید." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "خطا در ارتباط با سرویس مذاکره" },
      { status: 502 }
    );
  }
}

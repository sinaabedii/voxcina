import { NextRequest, NextResponse } from "next/server";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || "http://server:8080";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const authHeader = req.headers.get("authorization") || "";

    const resp = await fetch(`${GO_BACKEND_URL}/api/tryon/chat-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body,
      signal: AbortSignal.timeout(120000),
    });

    if (!resp.ok || !resp.body) {
      return NextResponse.json(
        { error: "خطا در ارتباط با سرویس گفتگو" },
        { status: resp.status || 502 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = resp.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch {
          controller.error(new Error("stream read error"));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    if (err?.name === "AbortError" || err?.name === "TimeoutError") {
      return NextResponse.json(
        { error: "زمان گفتگو به پایان رسید" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "خطا در ارتباط با سرویس گفتگو" },
      { status: 502 }
    );
  }
}

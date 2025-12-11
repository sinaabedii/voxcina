import { NextRequest, NextResponse } from "next/server";

// Base URL for the Postex API (override via POSTEX_URL)
const POSTEX_BASE_URL = process.env.POSTEX_URL || "https://api.postex.ir";
// API key for Postex, provided via Docker / .env as POSTEX_API_KEY
const API_KEY = process.env.POSTEX_API_KEY || "";

export async function GET(request: NextRequest, { params }: { params: Promise<{ "province-code": string }> }) {
  try {
    const { "province-code": provinceCode } = await params;
    const { search } = request.nextUrl;
    const targetUrl = `${POSTEX_BASE_URL}/api/v1/locality/cities/${provinceCode}${search}`;

    const backendResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
      },
    });

    const data = await backendResponse.json();

    return NextResponse.json(data, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
    });
  } catch (error) {
    console.error("Error in cities proxy:", error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

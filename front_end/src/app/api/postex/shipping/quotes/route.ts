import { NextRequest, NextResponse } from "next/server";
import {
  transformPostexResponse,
  createPostexQuoteRequest,
  PostexResponse,
} from "@/services/shipping/postex-provider";
import { ShippingQuoteParams, ShippingMethod } from "@/services/shipping/types";

// Base URL for the Postex API (override via POSTEX_URL)
const POSTEX_BASE_URL = process.env.POSTEX_URL || "https://api.postex.ir";
// API key for Postex, provided via Docker / .env as POSTEX_API_KEY
const API_KEY = process.env.POSTEX_API_KEY || "";

// Force this route to be dynamic (not statically generated)
export const dynamic = "force-dynamic";

/**
 * POST /api/postex/shipping/quotes
 * Fetches shipping quotes from Postex API and returns normalized shipping methods
 * Requirements: 3.1, 3.2, 3.3, 2.3
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { toCityCode, itemCount, totalValue } = body as ShippingQuoteParams;

    // Validate required parameters
    if (!toCityCode || typeof toCityCode !== "number") {
      return NextResponse.json(
        { error: "کد شهر نامعتبر است", code: "INVALID_CITY_CODE" },
        { status: 400 }
      );
    }

    if (!itemCount || typeof itemCount !== "number" || itemCount < 1) {
      return NextResponse.json(
        { error: "تعداد آیتم نامعتبر است", code: "INVALID_ITEM_COUNT" },
        { status: 400 }
      );
    }

    if (totalValue === undefined || typeof totalValue !== "number" || totalValue < 0) {
      return NextResponse.json(
        { error: "مقدار کل نامعتبر است", code: "INVALID_TOTAL_VALUE" },
        { status: 400 }
      );
    }

    // Create Postex request payload
    const postexRequest = createPostexQuoteRequest({
      toCityCode,
      itemCount,
      totalValue,
    });

    // Proxy request to Postex API
    const targetUrl = `${POSTEX_BASE_URL}/api/v1/shipping/quotes`;

    const postexResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postexRequest),
    });

    // Handle Postex API errors
    if (!postexResponse.ok) {
      const errorText = await postexResponse.text();
      console.error("Postex API error:", postexResponse.status, errorText);

      if (postexResponse.status >= 500) {
        return NextResponse.json(
          { error: "خطا در سرویس ارسال", code: "POSTEX_SERVER_ERROR" },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: "خطا در دریافت روش‌های ارسال", code: "POSTEX_API_ERROR" },
        { status: postexResponse.status }
      );
    }

    // Parse and transform response
    const postexData: PostexResponse = await postexResponse.json();

    // Transform to normalized shipping methods
    const methods: ShippingMethod[] = transformPostexResponse(postexData);

    // Handle empty response
    if (methods.length === 0) {
      return NextResponse.json(
        {
          methods: [],
          message: "روش ارسالی برای این مقصد یافت نشد",
        },
        { status: 200 }
      );
    }

    // Sort by price ascending (Requirements: 2.3)
    const sortedMethods = methods.sort((a, b) => a.price - b.price);

    return NextResponse.json({
      methods: sortedMethods,
      count: sortedMethods.length,
    });
  } catch (error) {
    console.error("Error in shipping quotes proxy:", error);

    // Check for network/timeout errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        { error: "خطا در اتصال به سرویس ارسال", code: "NETWORK_ERROR" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "خطای داخلی سرور", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

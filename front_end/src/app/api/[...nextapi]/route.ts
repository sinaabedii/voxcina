import { NextRequest, NextResponse } from "next/server";

// Define the base URL of your Go backend
const GO_BACKEND_URL = process.env.GO_BACKEND_URL || "http://localhost:8080";

async function handler(
  req: NextRequest,
  { params }: { params: { nextapi: string[] } }
) {
  try {
    // 1. Extract request details
    const method = req.method;
    const pathSegments = params.nextapi || [];
    const originalPath = pathSegments.join("/");
    const searchParams = req.nextUrl.search;

    // 2. Forward to Go backend
    const targetUrl = `${GO_BACKEND_URL}/api/${originalPath}${searchParams}`;

    // 3. Prepare headers for forwarding
    const headersToForward = new Headers();
    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.startsWith("x-") && // Filter Next.js internal headers
        lowerKey !== "host" &&
        lowerKey !== "connection" &&
        lowerKey !== "keep-alive" &&
        lowerKey !== "transfer-encoding"
      ) {
        headersToForward.append(key, value);
      }
    });
    headersToForward.set('Origin', req.nextUrl.origin);

    // 4. Forward the request
    const fetchOptions: RequestInit = {
      method: method,
      headers: headersToForward,
      body: (method !== "GET" && method !== "HEAD") ? req.body : undefined,
      // @ts-ignore - duplex is required but node types might lag
      duplex: 'half',
    };

    const backendResponse = await fetch(targetUrl, fetchOptions);

    // 5. Prepare response headers
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      responseHeaders.append(key, value);
    });
    responseHeaders.set('Access-Control-Allow-Origin', req.nextUrl.origin);
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');

    // 6. Return the response
    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error(`[API Proxy Error] ${req.method} ${req.url}:`, error);
    const isFetchError = error instanceof TypeError && error.message.includes('fetch failed');
    const status = isFetchError ? 502 : 500;
    const message = isFetchError ? "Backend service unavailable" : "Proxy error";

    return NextResponse.json(
      { error: message, details: error instanceof Error ? error.message : String(error) },
      { status: status }
    );
  }
}

// Export the single handler for all relevant HTTP methods
export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };

// // Old code below (commented out or removed)
// // import { products } from "@/data/products";
// // import { categories } from "@/data/categories";
// //
// // export async function GET(...) { ... }
// // export async function POST(...) { ... }

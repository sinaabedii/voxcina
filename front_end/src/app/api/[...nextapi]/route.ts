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
    const searchParams = req.nextUrl.search; // Keep the original search string

    // 2. Map Next.js path to Go backend path
    let backendPath = originalPath;
    if (originalPath.startsWith("auth/")) {
      backendPath = `users/${originalPath.substring(5)}`; // auth/login -> users/login
    } else if (originalPath === "cart/add") {
      backendPath = "cart"; // cart/add -> cart (assuming POST implies add)
    } else if (originalPath === "order/create") {
      backendPath = "checkout"; // order/create -> checkout
    } else if (method === "GET" && originalPath === "search") {
        // Special case for GET /search?q=... -> GET /products/search?q=...
        backendPath = "products/search";
    }
    // Add more specific mappings if needed

    const targetUrl = `${GO_BACKEND_URL}/api/${backendPath}${searchParams}`;

    // 3. Prepare headers for forwarding
    //    - Filter out host/Next.js specific headers
    //    - Copy relevant headers (e.g., Content-Type, Authorization)
    const headersToForward = new Headers();
    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.startsWith("x-") && // Filter Next.js internal headers
        lowerKey !== "host" &&
        lowerKey !== "connection" &&
        lowerKey !== "keep-alive" &&
        lowerKey !== "transfer-encoding"
        // Add other headers to filter if necessary
      ) {
        headersToForward.append(key, value);
      }
    });
    // Add origin if needed for CORS on the backend
    headersToForward.set('Origin', req.nextUrl.origin);


    // 4. Forward the request
    const fetchOptions: RequestInit = {
      method: method,
      headers: headersToForward,
      // Pass body only for relevant methods
      body: (method !== "GET" && method !== "HEAD") ? req.body : undefined,
      // IMPORTANT: Duplex required for streaming request bodies
      // @ts-ignore - duplex is required but node types might lag
      duplex: 'half',
      // Keepalive might be useful depending on setup
      // keepalive: true,
    };

    const backendResponse = await fetch(targetUrl, fetchOptions);

    // 5. Prepare response headers for the client
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
        // Filter backend-specific headers if necessary
        responseHeaders.append(key, value);
    });

    // Allow CORS from the frontend origin
    responseHeaders.set('Access-Control-Allow-Origin', req.nextUrl.origin);
    responseHeaders.set('Access-Control-Allow-Credentials', 'true'); // If using cookies/auth headers

    // 6. Return the response from the backend
    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error(`[API Proxy Error] ${req.method} ${req.url}:`, error);
    // Determine if it's a fetch error (network issue) or other error
    const isFetchError = error instanceof TypeError && error.message.includes('fetch failed');
    const status = isFetchError ? 502 : 500; // Bad Gateway for network errors, Internal Server Error otherwise
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

import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/utils/config";

/**
 * This API route serves as a direct proxy for image files stored on the backend.
 * It's particularly useful for Next.js Image component which needs a direct URL to optimize.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Create the path from the segments
  const path = params.path?.join("/") || "";
  const backendUrl = getBackendUrl();
  const imageUrl = `${backendUrl}/uploads/${path}`;
  
  console.log(`Proxying image request to: ${imageUrl}`);
  
  try {
    const response = await fetch(imageUrl, {
      method: "GET",
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.error(`Backend returned error status: ${response.status}`);
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: response.status }
      );
    }

    // Get content type from response
    const contentType = response.headers.get("content-type") || "image/jpeg";
    
    // Stream the image content
    const arrayBuffer = await response.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 }
    );
  }
} 
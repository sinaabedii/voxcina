import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle direct uploads paths - redirect these to the backend
  if (pathname.startsWith('/uploads/')) {
    const backendUrl = process.env.GO_BACKEND_URL || 'http://localhost:8080'
    return NextResponse.rewrite(new URL(`${backendUrl}${pathname}`, request.url))
  }

  // Check if this is a Next.js image optimization request for an upload path
  if (pathname.startsWith('/_next/image') && request.nextUrl.searchParams.has('url')) {
    const url = request.nextUrl.searchParams.get('url')
    if (url?.startsWith('/uploads/')) {
      // For image optimization requests of backend images,
      // we need to make sure the original image is accessible
      const backendUrl = process.env.GO_BACKEND_URL || 'http://localhost:8080'
      const originalImageUrl = `${backendUrl}${url}`
      
      // We don't rewrite here - we let Next.js handle it with our config
      // but we can log for debugging
      console.log(`Image optimization request for: ${originalImageUrl}`)
    }
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/uploads/:path*',
    '/_next/image'
  ],
} 
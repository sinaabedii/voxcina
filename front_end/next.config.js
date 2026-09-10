/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Experimental optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'], // Tree-shake icons (96 files use this)
    // `inlineCss: true` was removed here on purpose — do not put it back.
    // It is a win only when the stylesheet is small enough to be "critical CSS".
    // Ours is 199 KB, and React embeds it once as <style> plus twice more inside
    // the RSC flight payload, so every document carried ~597 KB of CSS: /about
    // was 657 KB of which 90% was the same stylesheet three times over.
    // Worse for LCP, the <style> block sat *ahead* of the hero <link rel=preload>
    // in a 204 KB <head>, so the preload scanner could not discover the LCP
    // image until ~205 KB of HTML had arrived. As an external stylesheet the
    // <link> is discovered in the first KB, is fetched in parallel, and is then
    // cached across every route instead of being re-sent per navigation.
  },

  // Drop Next's hard-coded legacy polyfill module (vercel/next.js#86785): every
  // API it shims is Baseline-supported by the ESM-capable browsers that load
  // this chunk, but Next injects it unconditionally regardless of browserslist.
  // src/lib/empty-polyfill-module.js replaces it. If an upgrade moves the
  // internal path, this alias silently stops matching — after any Next bump,
  // grep built chunks for "trimStart" (or watch the Lighthouse audit reappear).
  turbopack: {
    resolveAlias: {
      '../build/polyfills/polyfill-module': './src/lib/empty-polyfill-module.js',
      'next/dist/build/polyfills/polyfill-module': './src/lib/empty-polyfill-module.js',
    },
  },

  // Enable compression
  compress: true,
  
  // Disable source maps in production for faster builds
  productionBrowserSourceMaps: false,
  
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'server',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'voxcina.com',
        pathname: '/**',
      }
    ],
    formats: ['image/avif', 'image/webp'],
    // Every (src, width, quality) pair is a separate sharp encode, and an AVIF
    // encode of a full-resolution upload measures 2-3s. Fewer buckets means a
    // far higher cache hit rate on the LCP image. 750 sat 10% from 828 and 1200
    // sat 7% from 1280, so both were dropped; 1280 was added because the widest
    // slot on the site is the hero at max-w-7xl (1280px) and, with no matching
    // bucket, a 1280px slot and any DPR-3 phone were both rounding up to 1920.
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 85],
    minimumCacheTTL: 604800, // Cache for 1 week
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    const isProduction = process.env.NODE_ENV === 'production';
    const backendUrl = process.env.GO_BACKEND_URL || (isProduction ? 'http://server:8080' : 'http://localhost:8080');
    
    return [
      // Static file uploads from Go backend
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
      // Postex shipping routes stay in Next.js (handled by /api/postex/*)
      {
        source: '/api/postex/:path*',
        has: [{ type: 'header', key: 'x-skip-rewrite' }],
        destination: '/api/postex/:path*',
      },
      // All other /api/* routes (auth, products, orders, etc.) → Go backend
      // This includes OTP endpoints: /api/auth/signup/send-otp, /api/auth/check-otp, etc.
      // Note: /api/tryon/negotiate and /api/tryon/negotiate-stream are handled by Next.js API routes (need longer timeout / streaming)
      {
        source: '/api/:path((?!postex|tryon/negotiate|tryon/negotiate-stream).*)',
        destination: `${backendUrl}/api/:path*`,
      }
    ];
  },
  async redirects() {
    return [
      {
        source: '/category/:slug',
        destination: '/categories/:slug',
        permanent: true,
      },
      {
        source: '/product/:slug',
        destination: '/products/:slug',
        permanent: true,
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000',
          },
        ],
      },
      // No /uploads/ rule here on purpose: `headers()` matches on path only,
      // so it stamped `immutable` onto 404s too and a CDN would then serve a
      // missing image as broken for a year. The Go backend sets Cache-Control
      // per status instead (middlewares.UploadsCacheControl).
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // The home page is ISR'd (revalidate = 600) and renders no per-user
        // state server-side (cart/account UI is client-side), so its HTML can
        // be cached at the CDN edge. Next stamps `cache-control: max-age=0`
        // on ISR HTML by default, which made the CDN re-fetch it from the
        // origin on every visitor request. A short s-maxage plus
        // stale-while-revalidate keeps repeats at the edge while staying
        // fresh, and the browser itself still revalidates (max-age=0 is what
        // s-maxage+SWR leaves for it).
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'max-age=0, s-maxage=120, stale-while-revalidate=540',
          },
        ],
      },
    ];
  }
};

// Bundle analyzer: off unless ANALYZE=true, so normal builds are unaffected.
// Run `npm run analyze` to get treemaps of what actually ships per route in
// .next/analyze/. Note the current desktop Lighthouse gap was never bundle
// size -- it was infinite CSS animations (see AnimatedBackground.tsx) -- so
// measure before cutting anything here.
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
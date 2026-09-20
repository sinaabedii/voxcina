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
      // SnappPay / Searchwise product feed (backend: snappayfeed/).
      // In production nginx answers this path directly from Go (exact-match
      // `location = /wp-json/v1/product/feed`), so this rewrite is the
      // fallback: it covers local dev and any environment without that nginx
      // block. Remove it together with snappayfeed/ — see its README.md.
      {
        source: '/wp-json/v1/product/feed',
        destination: `${backendUrl}/api/snappay/feed`,
      },
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
      // /api/revalidate is Next's own cache-purge endpoint (secret/admin gated) — never proxy it to Go.
      {
        source: '/api/:path((?!postex|revalidate|tryon/negotiate|tryon/negotiate-stream).*)',
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
      {
        // Everything below here renders no per-user state on the server and
        // sets no cookie, so one visitor's HTML is every visitor's HTML for
        // the same URL — these pages are safe for a shared cache to hold.
        // Next still sends `Cache-Control: private, no-cache, no-store` for
        // any dynamically rendered route, which forbids that, so each origin
        // round trip is paid again by every visitor. For a reader on a
        // congested international path that round trip is the page load.
        //
        // The header is overridden rather than the route being switched to
        // ISR *on purpose*. `export const revalidate` was tried first and is
        // inert here: these routes have no `generateStaticParams`, so Next 16
        // keeps rendering them on demand and the `no-store` stands (verified
        // against `next start`, three consecutive requests). Forcing them
        // static instead would opt their `useSearchParams()` children out of
        // SSR — the trade that cost us the LCP image on the product page, see
        // the note in (shop)/products/[productId]/page.tsx. Overriding only
        // the response header leaves rendering byte-for-byte as it is.
        //
        // These pages put their filter/variant state in the query string, so
        // the CDN must key on it. ArvanCloud's cache level is "With
        // QueryString" and the `/*` page rule has "Apply QueryString" on.
        // Do not turn either off.
        source: '/products',
        headers: [
          {
            key: 'Cache-Control',
            value: 'max-age=0, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        // Product detail carries price and stock, so it gets the shortest
        // window: s-maxage matches CACHE_TIMES.PRODUCT_DETAIL, which already
        // bounds how stale the data behind it can be, and the stale window is
        // kept tight rather than Next's default of a year.
        //
        // `?variant`/`?color` deep links do change this HTML — ProductActions
        // reads them through useSearchParams and they are server-rendered
        // while the route is dynamic — which is the second reason the query
        // string has to stay in the cache key. A mismatch would be cosmetic
        // and self-healing (hydration re-reads the real URL), but the bare
        // canonical URL is the one that matters and it caches cleanly.
        source: '/products/:productId',
        headers: [
          {
            key: 'Cache-Control',
            value: 'max-age=0, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
      {
        // `trending` is its own statically prerendered route and already
        // carries the header Next generated for it; excluded so this rule
        // does not shadow it.
        source: '/categories/:categorySlug((?!trending$).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'max-age=0, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/blog',
        headers: [
          {
            key: 'Cache-Control',
            value: 'max-age=0, s-maxage=300, stale-while-revalidate=3600',
          },
        ],
      },
      {
        // A published post is immutable in practice; it gets the longest
        // window of the set. Admin edits do not wait it out — /api/revalidate
        // drops the blog tags on demand.
        source: '/blog/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'max-age=0, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/brands/:brandSlug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'max-age=0, s-maxage=600, stale-while-revalidate=3600',
          },
        ],
      },
      {
        source: '/collection/:collectionValue',
        headers: [
          {
            key: 'Cache-Control',
            value: 'max-age=0, s-maxage=300, stale-while-revalidate=1800',
          },
        ],
      },
    ];
  }
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Experimental optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'], // Tree-shake icons (96 files use this)
    inlineCss: true, // Inline critical CSS (fixes render-blocking CSS on first visit)
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
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
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
    ];
  }
};

module.exports = nextConfig;
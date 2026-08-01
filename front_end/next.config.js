/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,

  // Experimental optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'], // Tree-shake icons (96 files use this)
  },

  // Don't fail builds on lint errors (lint runs via `npm run lint` separately)
  eslint: {
    ignoreDuringBuilds: true,
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
    minimumCacheTTL: 604800, // Cache for 1 week
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  i18n: {
    locales: ['fa'],
    defaultLocale: 'fa',
    localeDetection: false,
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
      {
        source: '/uploads/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
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
        source: '/_next/static/(.*)',
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
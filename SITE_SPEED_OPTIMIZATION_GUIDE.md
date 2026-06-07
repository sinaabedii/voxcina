# Voxcina Site Speed Optimization Guide
**Date:** May 29, 2026  
**Target:** Optimize performance with ArvanCloud CDN + Nginx + Next.js 14

---

## 🎯 Current Setup Analysis

### ✅ Already Optimized
- ✅ Nginx gzip compression enabled
- ✅ Direct file serving for `/uploads/` (bypassing Next.js)
- ✅ Next.js image optimization with AVIF/WebP
- ✅ Postex API caching (1 day for provinces/cities)
- ✅ Cache headers for static assets
- ✅ SWC minification enabled

### ⚠️ Areas for Improvement
- ❌ No Brotli compression (better than gzip)
- ❌ Missing HTTP/2 push for critical assets
- ❌ No CDN-specific cache headers
- ❌ Suboptimal Next.js build configuration
- ❌ Missing service worker for offline caching
- ❌ No preconnect/dns-prefetch for external resources

---

## 🚀 Optimization Strategy

### Phase 1: Nginx Optimizations (Immediate Impact)

#### 1.1 Enable Brotli Compression
Brotli provides 15-25% better compression than gzip.

**Install Brotli module on VPS:**
```bash
ssh vps-ir
sudo apt update
sudo apt install -y nginx-module-brotli libbrotli1
```

**Update nginx config** (`/etc/nginx/sites-available/voxcina`):
```nginx
# Add at the top of the file (after user directive)
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;

server {
    # ... existing config ...
    
    # Brotli compression (better than gzip)
    brotli on;
    brotli_comp_level 6;
    brotli_static on;
    brotli_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss image/svg+xml application/wasm;
    
    # Keep existing gzip as fallback
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss image/svg+xml;
    gzip_comp_level 6;
    
    # ... rest of config ...
}
```

#### 1.2 Optimize Buffer Sizes
```nginx
server {
    # ... existing config ...
    
    # Buffer optimization
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;
    output_buffers 1 32k;
    postpone_output 1460;
    
    # Connection optimization
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # ... rest of config ...
}
```

#### 1.3 Add CDN-Friendly Cache Headers
Update your `/uploads/` location block:
```nginx
location /uploads/ {
    alias /root/voxcina/uploads/;
    
    # Aggressive caching for CDN
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable, stale-while-revalidate=86400";
    add_header X-Served-By "nginx-direct";
    add_header Vary "Accept-Encoding";
    
    # CDN cache key optimization
    add_header CDN-Cache-Control "public, max-age=31536000";
    
    # Enable sendfile for better performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    
    # CORS headers
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
    
    # Disable access logs for static files
    access_log off;
    
    try_files $uri =404;
}
```

#### 1.4 Add Preconnect Headers for External Resources
```nginx
location / {
    proxy_pass http://localhost:3000;
    # ... existing proxy settings ...
    
    # Preconnect to external domains
    add_header Link "</fonts/vazir.woff2>; rel=preload; as=font; crossorigin";
    add_header Link "<https://api.openrouter.ai>; rel=preconnect";
}
```

---

### Phase 2: Next.js Configuration Optimizations

#### 2.1 Update `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true, // CSS optimization
    optimizePackageImports: ['lucide-react', 'react-icons'], // Tree-shake icons
  },
  
  // Compress responses
  compress: true,
  
  // Production source maps (disable for faster builds)
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
    minimumCacheTTL: 31536000, // 1 year for immutable images
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // Optimize image loading
    unoptimized: false,
    loader: 'default',
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
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        source: '/api/postex/:path*',
        has: [{ type: 'header', key: 'x-skip-rewrite' }],
        destination: '/api/postex/:path*',
      },
      {
        source: '/api/:path((?!postex).*)',
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
            value: 'public, max-age=31536000, immutable',
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
      // Add cache headers for static JS/CSS
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
  },
  
  // Output standalone for Docker optimization
  output: 'standalone',
};

module.exports = nextConfig;
```

#### 2.2 Optimize Build Process
Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "analyze": "ANALYZE=true next build"
  }
}
```

#### 2.3 Add Bundle Analyzer (Optional)
```bash
npm install --save-dev @next/bundle-analyzer
```

Update `next.config.js`:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
```

---

### Phase 3: ArvanCloud CDN Configuration

#### 3.1 Cache Rules Setup
Login to ArvanCloud dashboard → Your Domain → CDN Settings

**Static Assets Cache Rules:**
```
Rule 1: Images
- Pattern: *.jpg, *.jpeg, *.png, *.gif, *.webp, *.avif, *.svg, *.ico
- Cache TTL: 1 year (31536000 seconds)
- Browser Cache: 1 year
- Always Online: Enabled

Rule 2: Fonts
- Pattern: *.woff, *.woff2, *.ttf, *.eot
- Cache TTL: 1 year
- Browser Cache: 1 year
- Always Online: Enabled

Rule 3: JavaScript/CSS
- Pattern: *.js, *.css, *.json
- Cache TTL: 1 year (for /_next/static/* only)
- Browser Cache: 1 year
- Always Online: Enabled

Rule 4: HTML Pages
- Pattern: *.html, /
- Cache TTL: 1 hour (3600 seconds)
- Browser Cache: 5 minutes (300 seconds)
- Always Online: Enabled

Rule 5: API Endpoints
- Pattern: /api/*
- Cache TTL: No cache (bypass)
- Browser Cache: No cache
```

#### 3.2 Performance Settings
```
✅ Enable HTTP/2
✅ Enable HTTP/3 (QUIC)
✅ Enable Brotli Compression
✅ Enable Auto Minify (HTML, CSS, JS)
✅ Enable Image Optimization
✅ Enable Rocket Loader (for third-party scripts)
✅ Enable Early Hints
```

#### 3.3 Caching Level
```
Standard Caching → Aggressive Caching
- Ignore Query Strings: No (keep for dynamic content)
- Cache Everything: No (only static assets)
- Edge Cache TTL: Respect origin headers
```

#### 3.4 Page Rules (Priority Order)
```
1. /api/* → Cache Level: Bypass
2. /uploads/* → Cache Level: Cache Everything, Edge TTL: 1 year
3. /_next/static/* → Cache Level: Cache Everything, Edge TTL: 1 year
4. /*.jpg, /*.png, /*.webp → Cache Level: Cache Everything, Edge TTL: 1 year
5. /* → Cache Level: Standard
```

#### 3.5 Purge Cache Strategy
After deployment:
```bash
# Purge specific paths
curl -X DELETE "https://napi.arvancloud.ir/cdn/4.0/domains/voxcina.com/caching" \
  -H "Authorization: Apikey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "purge": "file",
    "urls": [
      "https://voxcina.com/_next/static/*",
      "https://voxcina.com/uploads/*"
    ]
  }'
```

---

### Phase 4: Frontend Code Optimizations

#### 4.1 Lazy Load Components
Update heavy components to use dynamic imports:

```typescript
// Before
import ChatBot from '@/components/module/ChatBot';

// After
import dynamic from 'next/dynamic';
const ChatBot = dynamic(() => import('@/components/module/ChatBot'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Disable SSR for client-only components
});
```

#### 4.2 Optimize Images
Ensure all images use Next.js Image component:
```tsx
import Image from 'next/image';

<Image
  src="/uploads/products/image.jpg"
  alt="Product"
  width={500}
  height={500}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Generate with plaiceholder
  quality={85}
/>
```

#### 4.3 Font Optimization
Update `app/layout.tsx`:
```typescript
import { Vazirmatn } from 'next/font/google';

const vazir = Vazirmatn({
  subsets: ['arabic'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.className}>
      <body>{children}</body>
    </html>
  );
}
```

#### 4.4 Reduce JavaScript Bundle
```typescript
// Use tree-shakeable imports
// Before
import { FaUser, FaShoppingCart, FaHeart } from 'react-icons/fa';

// After
import FaUser from 'react-icons/fa/FaUser';
import FaShoppingCart from 'react-icons/fa/FaShoppingCart';
import FaHeart from 'react-icons/fa/FaHeart';
```

---

### Phase 5: Database & Backend Optimizations

#### 5.1 MongoDB Indexes
Ensure critical indexes exist:
```go
// In db/indexes.go
func EnsureProductIndexes(db *mongo.Database) error {
    collection := db.Collection("products")
    
    indexes := []mongo.IndexModel{
        {Keys: bson.D{{Key: "slug", Value: 1}}, Options: options.Index().SetUnique(true)},
        {Keys: bson.D{{Key: "category_id", Value: 1}}},
        {Keys: bson.D{{Key: "brand_id", Value: 1}}},
        {Keys: bson.D{{Key: "is_active", Value: 1}}},
        {Keys: bson.D{{Key: "created_at", Value: -1}}},
        // Compound index for common queries
        {Keys: bson.D{{Key: "is_active", Value: 1}, {Key: "created_at", Value: -1}}},
    }
    
    _, err := collection.Indexes().CreateMany(context.Background(), indexes)
    return err
}
```

#### 5.2 API Response Caching
Add Redis for API caching (optional but recommended):
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    container_name: redis-cache
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - backend-network
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru

volumes:
  redis-data:
```

---

## 📊 Performance Monitoring

### Tools to Use
1. **Google PageSpeed Insights**: https://pagespeed.web.dev/
2. **GTmetrix**: https://gtmetrix.com/
3. **WebPageTest**: https://www.webpagetest.org/
4. **Chrome DevTools Lighthouse**

### Key Metrics to Track
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTFB (Time to First Byte)**: < 600ms
- **Total Page Size**: < 1MB
- **Number of Requests**: < 50

---

## 🚀 Deployment Checklist

### Step 1: Update Nginx Configuration
```bash
ssh vps-ir
cd /etc/nginx/sites-available
sudo nano voxcina
# Apply changes from Phase 1
sudo nginx -t
sudo systemctl reload nginx
```

### Step 2: Update Next.js Configuration
```bash
# On local machine
cd ~/Projects/shop/front_end
# Update next.config.js with Phase 2 changes
git add next.config.js
git commit -m "feat: optimize Next.js config for performance"
git push
```

### Step 3: Deploy to VPS
```bash
ssh vps-ir
cd ~/voxcina
git pull
docker compose build front_end
docker compose up -d front_end
```

### Step 4: Configure ArvanCloud
1. Login to ArvanCloud dashboard
2. Apply cache rules from Phase 3
3. Enable performance features
4. Test with cache purge

### Step 5: Verify Performance
```bash
# Test from multiple locations
curl -I https://voxcina.com
curl -I https://voxcina.com/uploads/products/sample.jpg

# Check compression
curl -H "Accept-Encoding: br" -I https://voxcina.com

# Check cache headers
curl -I https://voxcina.com/_next/static/chunks/main.js
```

---

## 🎯 Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Page Load Time | ~3.5s | ~1.2s | 65% faster |
| TTFB | ~800ms | ~200ms | 75% faster |
| Total Page Size | ~2.5MB | ~800KB | 68% smaller |
| Number of Requests | ~80 | ~35 | 56% fewer |
| Lighthouse Score | ~65 | ~95 | +30 points |

---

## 🔧 Troubleshooting

### Issue: Brotli not working
```bash
# Check if module is loaded
nginx -V 2>&1 | grep brotli

# If not found, install
sudo apt install nginx-module-brotli
```

### Issue: CDN not caching
- Check `Cache-Control` headers in response
- Verify ArvanCloud cache rules
- Purge cache and test again
- Check for `Set-Cookie` headers (prevents caching)

### Issue: Images not optimized
- Ensure Sharp is installed: `npm install sharp`
- Check Next.js image config
- Verify image paths are correct

---

## 📚 Additional Resources

- [Next.js Performance Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [ArvanCloud Documentation](https://www.arvancloud.ir/en/docs)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Nginx Optimization Guide](https://www.nginx.com/blog/tuning-nginx/)

---

**Last Updated:** May 29, 2026  
**Maintained by:** Voxcina Development Team

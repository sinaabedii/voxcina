# Image Loading Optimization Guide

## Problems Identified

1. **Double Proxy Issue**: Images were going through Next.js → Go backend (2 hops)
2. **No Nginx Caching**: Nginx wasn't caching or directly serving images
3. **Disabled Next.js Optimization**: `unoptimized={true}` prevented image optimization
4. **Short Cache TTL**: Only 60 seconds cache instead of long-term caching

## Solutions Implemented

### 1. Nginx Direct Serving (CRITICAL - Biggest Performance Gain)

The new nginx config serves images directly from the filesystem, bypassing both Next.js and Go backend.

**Before**: Browser → Nginx → Next.js → Go Backend → Filesystem
**After**: Browser → Nginx → Filesystem (Direct!)

### 2. Aggressive Caching

- Images cached for 1 year with `immutable` flag
- Browser won't re-request images once cached
- Nginx serves from memory after first request

### 3. Next.js Image Optimization Enabled

- Removed `unoptimized={true}` flags
- Next.js now generates optimized WebP/AVIF formats
- Responsive images for different screen sizes
- Increased cache TTL from 60s to 24 hours

## Deployment Steps

### Step 1: Update Nginx Config on VPS

```bash
# SSH to VPS
ssh vps-ir

# Backup current config
sudo cp /etc/nginx/sites-available/voxcina /etc/nginx/sites-available/voxcina.backup

# Upload new config (from local machine)
scp /home/erfan/Projects/shop/nginx-voxcina-optimized.conf vps-ir:/tmp/

# On VPS: Move config to nginx
sudo mv /tmp/nginx-voxcina-optimized.conf /etc/nginx/sites-available/voxcina

# Test nginx config
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### Step 2: Deploy Updated Frontend

```bash
# On VPS
cd ~/voxcina  # or wherever your project is

# Pull latest changes or upload files
# Then rebuild frontend container
docker compose up -d --build front_end

# Check logs
docker compose logs -f front_end
```

### Step 3: Verify Optimizations

```bash
# Test direct image serving (should be FAST)
curl -I https://voxcina.com/uploads/products/variants/6931a54fe0dab09f5fc74d62/variant_3/images/6931a54fe0dab09f5fc74d62-3-1764930199872282717-0.webp

# Look for these headers:
# - X-Served-By: nginx-direct
# - Cache-Control: public, immutable
# - Expires: (1 year in future)
```

### Step 4: Clear Browser Cache

Users should clear their browser cache or do a hard refresh (Ctrl+Shift+R) to see improvements.

## Expected Performance Improvements

- **First Load**: 50-70% faster (direct nginx serving)
- **Subsequent Loads**: 90%+ faster (browser cache)
- **Bandwidth**: 30-50% reduction (Next.js optimization)
- **Server Load**: 80% reduction (nginx serves from memory)

## Monitoring

Check nginx access logs to verify direct serving:
```bash
sudo tail -f /var/log/nginx/access.log | grep uploads
```

You should see 200 responses with minimal latency.

## Rollback Plan

If issues occur:
```bash
# Restore old nginx config
sudo cp /etc/nginx/sites-available/voxcina.backup /etc/nginx/sites-available/voxcina
sudo nginx -t
sudo systemctl reload nginx

# Revert frontend changes
cd ~/voxcina
git checkout HEAD -- front_end/
docker compose up -d --build front_end
```

## Additional Optimizations (Optional)

### 1. Enable HTTP/2 Push (Already enabled in config)
HTTP/2 is already enabled with `http2` flag.

### 2. Add CDN (Future Enhancement)
Consider using CloudFlare or AWS CloudFront for global distribution.

### 3. Image Compression on Upload
Modify Go backend to compress images on upload:
- Target: 100-150KB for product images
- Use WebP format with 80% quality
- Generate multiple sizes (thumbnail, medium, large)

### 4. Lazy Loading
Already implemented with Next.js Image component (loads images as user scrolls).

## Testing Checklist

- [ ] Product detail page loads in < 2 seconds
- [ ] Images appear immediately on second visit
- [ ] Network tab shows images served from cache
- [ ] No 404 errors for images
- [ ] Mobile performance improved
- [ ] Admin panel image uploads still work

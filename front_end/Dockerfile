# ===== Stage 1 — builder =====
FROM docker.arvancloud.ir/node:22-alpine AS builder
WORKDIR /app

# Proxy support for npm install (VPS has no direct internet)
ARG HTTP_PROXY
ARG HTTPS_PROXY
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    http_proxy=${HTTP_PROXY} \
    https_proxy=${HTTPS_PROXY}

# NEXT_PUBLIC_* vars must be available at build time (Next.js inlines them into the JS bundle)
ARG NEXT_PUBLIC_NESHAN_API_KEY
ARG NEXT_PUBLIC_GA_ID

# Set environment variables to skip API calls during build
ENV NODE_ENV=production \
    NEXT_PUBLIC_API_URL="" \
    GO_BACKEND_URL="" \
    NEXT_PUBLIC_API_BASE_URL="" \
    NEXT_PUBLIC_NESHAN_API_KEY=${NEXT_PUBLIC_NESHAN_API_KEY} \
    NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID}

# 1️⃣ install deps first for better Docker cache. Use the lockfile so the
# image build is deterministic and avoid npm install's unreliable resolver
# behavior on the VPS's proxied Alpine environment.
COPY package*.json ./
# Temporarily unset NODE_ENV to install devDependencies
RUN NODE_ENV=development npm ci --legacy-peer-deps --include=dev --no-audit --no-fund
# Restore production environment
ENV NODE_ENV=production

# 2️⃣ copy source and build
COPY . ./
RUN npm run build

# ===== Stage 2 — runtime =====
FROM docker.arvancloud.ir/node:22-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Copy only what we need from the builder image
COPY --from=builder /app/.next               ./.next
COPY --from=builder /app/public              ./public
COPY --from=builder /app/package*.json       ./
COPY --from=builder /app/node_modules        ./node_modules
COPY --from=builder /app/next.config.js      ./
COPY --from=builder /app/tsconfig.json       ./
COPY --from=builder /app/tailwind.config.js  ./
COPY --from=builder /app/postcss.config.js   ./

# Drop the homepage's build-time prerender.
#
# The builder stage sets GO_BACKEND_URL="" on purpose, so lib/server-api.ts
# returns null and `next build` bakes a homepage with no products, sliders or
# hero images into .next/server/app. Shipping that file means the first runtime
# requests serve an empty page for the whole ISR window (revalidate = 600) --
# long enough for the CDN to cache it and keep serving it after the origin had
# already healed itself. That was the 2026-09-10 outage.
#
# Removing the artifacts makes Next render the route on demand instead, with the
# real backend in reach, so an empty homepage can never be served or cached.
# Verified locally against the production API: with these files absent the very
# first request returned a full page (20 product links, 6 hero images) instead
# of the 107 KB empty shell.
#
# Only "/" is affected -- it is the sole route that prerenders backend data at
# build time. If another route starts doing so, drop its artifacts here too.
RUN rm -f ./.next/server/app/index.html \
          ./.next/server/app/index.meta \
          ./.next/server/app/index.rsc && \
    rm -f ./.next/server/app/index.segments/*.rsc || true

# Create uploads directory structure inside public
RUN mkdir -p ./public/uploads/products/main ./public/uploads/categories

EXPOSE 3000
CMD ["npm", "run", "start"]

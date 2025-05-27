# ===== Stage 1 — builder =====
FROM docker.arvancloud.ir/node:20-alpine AS builder
WORKDIR /app

# 1️⃣ install deps first for better Docker cache
COPY package*.json ./
RUN npm i

# 2️⃣ copy source and build
COPY . ./
RUN npm run build

# ===== Stage 2 — runtime =====
FROM docker.arvancloud.ir/node:20-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Copy only what we need from the builder image
COPY --from=builder /app/.next               ./.next
COPY --from=builder /app/public              ./public
COPY --from=builder /app/package*.json       ./
COPY --from=builder /app/node_modules        ./node_modules
COPY --from=builder /app/next.config.js      ./

# Create uploads directory structure inside public
RUN mkdir -p ./public/uploads/products/main ./public/uploads/categories

EXPOSE 3000
CMD ["npm", "run", "start"] 
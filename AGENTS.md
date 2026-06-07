# AGENTS.md

## Project Overview

Persian (Farsi) e-commerce platform. Go backend + Next.js 14 frontend + MongoDB 6.0, deployed via Docker Compose.

## Commands

### Backend (Go)
```bash
go build -o main .          # Build
./main                      # Run (port 8080)
./main -seed                # Seed database with initial data
./main -healthcheck         # Check MongoDB connectivity (exit 0/1)
go vet ./...                # Lint
```

### Frontend (Next.js)
```bash
cd front_end
npm run dev                 # Dev server (port 3000)
npm run build               # Production build
npm run lint                # ESLint (next/core-web-vitals + next/typescript)
```

### Docker (full stack)
```bash
docker compose up -d --build    # All services
docker compose build server     # Backend only
docker compose up -d server     # Restart backend only
docker compose logs -f server   # Backend logs
docker compose logs -f front_end # Frontend logs
```

### No test suite exists. Do not assume test commands.

## Architecture

- **Go module name is `backEnd`** (not `shop`). All imports use `backEnd/...`
- Backend pattern: `handlers/` -> `services/` -> MongoDB. Routes in `routes/routes.go`.
- Frontend pattern: Page -> Zustand store (`store/`) -> API -> Go backend
- Frontend proxies all `/api/*` to Go backend via `next.config.js` rewrites (except `/api/postex/*` which is handled by Next.js API routes in `front_end/src/app/api/`)
- `/uploads/*` served by Go from `./uploads/` directory; frontend rewrites to backend
- `admin/` served as static files at `/admin/` by Go
- Auth: JWT (Bearer token). `middlewares.AuthMiddleware` for users, `middlewares.AdminAuthMiddleware` for admin routes
- Auto-seeds DB on startup if `vocabulary_mappings` collection is empty (via `start.sh`)

## Key Conventions

- **RTL Persian UI** -- always maintain right-to-left layout support
- Frontend locale is `fa` only (`next.config.js` i18n)
- Reusable UI components in `front_end/src/components/ui/` -- import from `@/components/ui`
- Available UI components: AnimatedBackground, Badge, Button, Card, ColorSelector, DropdownMenu, FeatureCard, Input, Loading, MapPicker, Modal, PatternPicker, PriceDisplay, QuantitySelector, SectionTitle, SizeSelector, SmartSearch, StarRating, StockStatus
- New frontend components go in `front_end/src/components/` (ui/ for generic, feature subdirs for specific)
- TailwindCSS with CSS variables for theming (dark mode via `class` strategy)
- Primary color: `#1A3C69` (voxcina blue), secondary: `#f4f1ec` (cream)
- State management: Zustand stores in `front_end/src/store/`
- Path alias: `@/*` maps to `front_end/src/*`

## Product Color Variants

- `ColorVariant` has `color` (hex), `colorName` (Persian), `swatchImage` (pattern thumbnail), `images[]`, `tryOnImage`, `sizes[]`
- `PatternPicker` component (admin): toggle between solid hex color or pattern mode with image cropping (react-easy-crop)
- `ColorSelector` component (shop): shows swatch image if available, falls back to solid color circle
- Swatch images are 160x160 WebP, uploaded via `colorSwatch_{idx}` form field

## Environment

- Config reads env var `PORT` (fallback 8080), `MONGODB_URI`, `DB_NAME` (fallback `ecommerce`), `JWT_SECRET`
- Docker Compose sets `SERVER_PORT` but Go config reads `PORT` -- works via fallback
- AI features require `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_EMBEDDING_MODEL`
- Payment: Zibal gateway (`ZIBAL_MERCHANT`, use `zibal` for test mode)
- SMS: SMS.ir (`SMSIR_ACCESS_KEY`, `SMSIR_TEMPLATE_ID`)
- Shipping: Postex API (handled by Next.js API routes, not Go)

## SKU System

Product SKUs follow format in `Coding.json`: `{Gender}{Category}{Brand}{Style}{Color}{Size}` (e.g., `M100A0L`). Size codes use letters (Q=XL, R=2XL, T=3XL -- not X/XX/XXX).

## Docker Build Notes

- Dockerfiles use Iranian mirrors (`docker.arvancloud.ir`, `package-mirror.liara.ir`) for base images and Go proxy
- Backend: multi-stage build (golang:1.24 -> alpine:3.21)
- Frontend: multi-stage build (node:20-alpine)

## Deployment (VPS)

- SSH: `ssh vps-ir`, project at `~/voxcina`
- **VPS has no internet access** -- cannot run `npm install` or `docker compose build front_end` on VPS
- Frontend-only deploy (build locally, copy artifacts):
  ```bash
  cd front_end && npm run build
  # Copy .next, public, package.json, package-lock.json, node_modules, next.config.js to VPS /tmp/voxcina-build/
  # Then: docker cp /tmp/voxcina-build/.next voxcina_frontend:/app/.next (repeat for other files)
  docker restart voxcina_frontend
  ```
- For new npm dependencies: copy the package folder from local `node_modules/` to container:
  ```bash
  docker cp /path/to/package voxcina_frontend:/app/node_modules/package
  ```
- Backend-only deploy: `docker compose build server && docker compose up -d server`
- Full rebuild (backend only, frontend needs local build): `docker compose up -d --build server`

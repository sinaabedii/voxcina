# AGENTS.md

Persian e-commerce platform. Go backend (module `backEnd`) + Next.js 14 + MongoDB 6.0 + Docker Compose.

## Commands

### Backend (Go)
```bash
go build -o main .          # Build
./main                      # Run (port 8080)
./main -seed                # Seed database
./main -healthcheck         # Check MongoDB (exit 0/1)
go vet ./...                # Lint
```

### Frontend (Next.js)
```bash
cd front_end && npm run dev   # Dev server (port 3000)
npm run build                 # Production build
npm run lint                  # ESLint (next/core-web-vitals)
```

### Docker
```bash
docker compose up -d --build      # All services
docker compose build server       # Backend only
docker compose up -d server       # Restart backend
docker compose logs -f server     # Backend logs
```

**No test suite exists. `go vet ./...` + `npm run lint` are the only verification commands.**

## Architecture

- **Go module name is `backEnd`** (not `shop`). All imports use `backEnd/...`
- Backend: `handlers/` -> `services/` -> MongoDB. Routes in `routes/routes.go` (355 lines, Gorilla Mux)
- Frontend: Page -> Zustand store (`store/` 17 stores) -> API -> Go backend
- Next.js proxies `/api/*` to Go (except `/api/postex/*`, `/api/uploads/*`, `/api/instagram/*`, `/api/sitemap` handled by Next.js API routes)
- `/uploads/*` served by Go from `./uploads/`; frontend rewrites to backend
- Auth: JWT Bearer token. `middlewares.AuthMiddleware` for users, `AdminAuthMiddleware` for admin (checks `role == "admin"`)
- `start.sh` waits for MongoDB, auto-seeds if `vocabulary_mappings` is empty
- Config reads `PORT` env (fallback 8080), not `SERVER_PORT`

## Key Conventions

- **RTL Persian UI** — always maintain right-to-left layout
- Single locale `fa` in `next.config.js` i18n
- Path alias: `@/*` maps to `front_end/src/*`
- Reusable UI in `front_end/src/components/ui/` — import from `@/components/ui`
- Available UI components: AnimatedBackground, Badge, Button, Card, ColorSelector, DropdownMenu, FeatureCard, Input, Loading, MapPicker, Modal, PatternPicker, PriceDisplay, QuantitySelector, SectionTitle, SizeSelector, SmartSearch, StarRating, StockStatus
- New components in `front_end/src/components/` (ui/ for generic, feature subdirs for specific)
- TailwindCSS dark mode via `class` strategy, CSS variables for theming. Primary: `#1A3C69` (voxcina blue), secondary: `#f4f1ec` (cream)
- State management: Zustand in `front_end/src/store/`
- **Image ordering in product detail** (`ProductActions.tsx`): variant images always come before main images

## Product Color Variants

- `ColorVariant` model: `color` (hex), `colorName` (Persian), `swatchImage` (pattern thumbnail), `images[]`, `tryOnImage`, `sizes[]`
- Swatch images 160x160 WebP, uploaded via `colorSwatch_{idx}` form field
- `PatternPicker` (admin): toggle solid hex color / pattern mode with react-easy-crop
- `ColorSelector` (shop): swatch image if available, falls back to solid color circle

## SKU System (Coding.json)

Format: `{Gender}{Category}{Brand}{Style}{Color}{Size}` (7 chars, e.g. `M100A0L`).
- Gender: M=Men, F=Women, D=Kids, B=Unisex
- Size codes: X=XS, S=S, M=M, L=L, Q=XL, R=2XL, T=3XL (not X/XX/XXX — single char only)

## VPS Deployment

**Infrastructure:**
- `vps-ir` (194.60.230.210:9011) — old server
- `vps-ir1` (87.107.105.114:9011) — current server
- **No direct internet access.** SOCKS proxy on `127.0.0.1:10800` (frps), HTTP proxy on `127.0.0.1:10809` (Xray)
- Git uses SSH via corkscrew through HTTP proxy (configured in `~/.ssh/config`)
- Docker daemon proxy configured in `/etc/systemd/system/docker.service.d/proxy.conf`
- MongoDB image uses `docker.arvancloud.ir/mongo:6.0` mirror (not `mongo:6.0`)
- Scheduler image uses `docker.arvancloud.ir/mcuadros/ofelia:latest` mirror

### Frontend deploy (UI-only, no new npm packages)
**IMPORTANT:** The runtime container does NOT have `src/`. Create it first:
```bash
docker exec voxcina_frontend mkdir -p /app/src
docker cp front_end/src/. voxcina_frontend:/app/src/.
docker cp front_end/public/. voxcina_frontend:/app/public/.
docker cp front_end/next.config.js voxcina_frontend:/app/next.config.js
docker cp front_end/tsconfig.json voxcina_frontend:/app/tsconfig.json
docker cp front_end/tailwind.config.js voxcina_frontend:/app/tailwind.config.js
docker cp front_end/postcss.config.js voxcina_frontend:/app/postcss.config.js
docker exec voxcina_frontend sh -c 'rm -rf /app/.next && npm run build'
docker restart voxcina_frontend
```

### Frontend deploy (new npm packages)
```bash
docker compose build --no-cache front_end && docker compose up -d front_end
```

### Backend deploy
```bash
docker compose build server && docker compose up -d server
```

### Required iptables (after fresh VPS provision)
```bash
iptables -I INPUT -i docker0 -p tcp --dport 10809 -j ACCEPT
iptables -I INPUT -i br-+ -p tcp --dport 10809 -j ACCEPT
iptables -I INPUT -i lo -p tcp --dport 10809 -j ACCEPT
iptables -A INPUT -p tcp --dport 10809 -j DROP
```

## AI Metadata Image Handling

- Frontend sends `images: mainImageItems.map(img => img.url)` to `/api/admin/ai/generate-metadata`
- **OpenRouter models:** images passed as URLs (OpenRouter fetches them)
- **Local models (Ollama):** all local models are multimodal — images converted to base64 via `resolveImageBase64` in `services/ai_metadata_service.go`
- To add a local vision model: add its name to `isLocalModel()` in `ai_metadata_service.go`

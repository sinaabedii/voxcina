# AGENTS.md

Persian e-commerce platform. Go backend (module `backEnd`) + Next.js 14 + MongoDB 6.0 + Docker Compose.

All Go files are at project root (no `backEnd/` dir). Module name is `backEnd` only for imports.

## Commands

### Backend (Go) — project root
```bash
go build -o main .          # Build
./main                      # Run (port 8080)
./main -seed                # Seed database
./main -healthcheck         # Check MongoDB (exit 0/1)
./main -check-vocab         # Print vocabulary_mappings count (used by start.sh)
./main -migrate-avatars     # Migrate avatar images shape
go vet ./...                # Lint
```

### Frontend (Next.js)
```bash
cd front_end && npm run dev   # Dev server (port 3000)
npm run build                 # Production build (incremental — does NOT delete .next)
npm run lint                  # ESLint (next/core-web-vitals)
```

### Docker
```bash
docker compose up -d --build     # All services
docker compose build server      # Backend only
docker compose up -d server      # Restart backend
docker compose logs -f server    # Backend logs
```

**No test suite exists. `go vet ./...` + `npm run lint` are the only verification commands.**

## Architecture

- **Go** at project root: `handlers/` → `services/` → MongoDB. Routes in `routes/routes.go` (Gorilla Mux).
- **Next.js** on the frontend: Page → Zustand store (`store/` 17 stores) → API → Go.
- **API proxy** (`next.config.js` rewrites): `/api/:path((?!postex|tryon/negotiate|tryon/negotiate-stream).*)` → Go backend.
  - `/api/postex/*`, `/api/tryon/negotiate`, `/api/tryon/negotiate-stream` handled by Next.js (filesystem routes).
  - `/uploads/:path*` → Go backend (separate rewrite rule).
  - Other Next.js API routes (`/api/instagram/*`, `/api/sitemap`, `/api/locality/*`) work because they exist as filesystem routes, not via the proxy exception.
- **Auth**: JWT Bearer token. `middlewares.AuthMiddleware` for users, `AdminAuthMiddleware` for admin (`role == "admin"`).
- `start.sh` waits for MongoDB, auto-seeds if `vocabulary_mappings` is empty.
- Config reads `PORT` env (fallback 8080). Docker maps `8088:8080`.

## Frontend Conventions

- **RTL Persian UI**. Single locale `fa` in `next.config.js` i18n.
- Path alias: `@/*` → `front_end/src/*`.
- Reusable UI in `front_end/src/components/ui/` (19+ components; see barrel export `index.ts`).
- New components in `front_end/src/components/` (ui/ for generic, feature subdirs for specific).
- TailwindCSS dark mode via `class` strategy. Primary: `#1A3C69`, secondary: `#f4f1ec`.
- State: Zustand in `front_end/src/store/`.
- `ProductActions.tsx`: variant images always come before main images.

## SKU System (Coding.json)

Format: `{Gender}{Category}{Brand}{Style}{Color}{Size}` (7 chars, e.g. `M100A0L`).
- Gender: M=Men, F=Women, D=Kids, B=Unisex.
- Size codes: X=XS, S=S, M=M, L=L, Q=XL, R=2XL, T=3XL (single char).

## Payment Gateway

- Interface: `services/payment_gateway.go` (`Name`, `RequestPayment`, `VerifyPayment`, `InquiryPayment`).
- Gateway registry in `handlers/payment.go`, populated by `InitZibalService()` / `InitDigipayService()` from `main.go`.
- Backend always derives `amount` from `order.TotalAmount * 10`. `FinalizeVerifiedPayment` rejects if `verifiedAmount != expectedAmount`.
- `PaymentAttempt` model tracks each attempt with unique indexes. Each retry creates a fresh UUID attempt — never overwrite.
- DigiPay OAuth uses `singleflight.Group` for deduped token refresh. POST callback → verify API → `FinalizeVerifiedPayment` → 303 redirect.
- Config: `ZIBAL_MERCHANT` (default `"zibal"`), `DIGIPAY_CLIENT_ID` + `DIGIPAY_CLIENT_SECRET`.

## Virtual Try-On

Auth-only (`AuthMiddleware`). No TTL — all data kept forever.
- **Collections**: `virtual_tryons` (generation), `tryon_chats` (fitting rooms, polymorphic messages), `negotiated_coupons` (linked by `tryon_id` + `chat_id`).
- **Endpoints**: `POST /api/tryon/generate`, `GET /api/tryon/history`, `GET /api/tryon/{tryonId}`, `GET /api/tryon/sessions`, `GET /api/tryon/sessions/{chatId}`, `DELETE /api/tryon/sessions/{chatId}`, `POST /api/tryon/sessions/messages`, `POST /api/tryon/link`.
- **In-memory cache** (`tryOnTasks` in `handlers/tryon.go`): `sync.Map` for SSE status stream. Cleanup: `done`/`error` → 5 min, `processing` → 30 min. Does NOT affect MongoDB persistence.
- **Negotiation**: LLM uses OpenRouter `google/gemma-4-31b-it` (fallback `qwen/qwen3.5-27b`) with `offer_coupon` tool. Generates `TRYN-XXXXXXXX` coupon, saved to `negotiated_coupons`.
- Frontend: `tryon-store.ts` (with `chatId` in localStorage `voxcina_tryon_chat_id`), `tryon-api.ts` client.

## User Activity Tracking

- Track endpoints (`/api/activity/track`, `/api/activity/track/batch`) are **public** (no `AuthMiddleware`). Store `sessionId` from request body.
- Frontend `activity-tracker.ts` singleton: queue + 5s flush, `sendBeacon` on `beforeunload`. Session ID in localStorage (`activity_session_id`, 30-min slide).
- Activities stored with `session_id` (not `user_id`) for every page. Retrieval routes use `AuthMiddleware`.
- Constants in `models/user_activity.go` (`Activity*` prefix). 180-day TTL via `ExpiresAt`.
- Invoked from: `ProductCard.tsx`, `ProductActions.tsx`, `cart/page.tsx`, `checkout/page.tsx`, `checkout/callback/page.tsx`, `tryon/page.tsx`, plus global anchor click listener.

## VPS Deployment

**Infrastructure:**
- `vps-ir` (87.107.105.114:9011). No direct internet — SOCKS `127.0.0.1:10800` (frps), HTTP `127.0.0.1:10809` (Xray).
- Git SSH via corkscrew through HTTP proxy (`~/.ssh/config`). Docker daemon proxy at `/etc/systemd/system/docker.service.d/proxy.conf`.
- MongoDB: `docker.arvancloud.ir/mongo:6.0`. Scheduler: `docker.arvancloud.ir/mcuadros/ofelia:latest`.

### Frontend deploy (UI-only, no new npm packages)
The runtime container already has `.next/` cache — **never delete it**. Next.js does incremental builds.
```bash
docker exec voxcina_frontend mkdir -p /app/src
docker cp front_end/src/component/ChangedFile.tsx voxcina_frontend:/app/src/component/ChangedFile.tsx
docker exec voxcina_frontend sh -c 'cd /app && npm run build'
docker restart voxcina_frontend
```

Only copy changed files, not the whole `src/`. Building without `rm -rf .next` takes seconds.

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

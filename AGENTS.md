# AGENTS.md

Persian e-commerce platform. Go backend (module `backEnd`) + Next.js 14 + MongoDB 6.0 + Docker Compose.

## Commands

### Backend (Go)
```bash
go build -o main .          # Build
./main                      # Run (port 8080)
./main -seed                # Seed database
./main -healthcheck         # Check MongoDB (exit 0/1)
./main -check-vocab         # Print vocabulary_mappings count (used by start.sh)
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
- Backend: `handlers/` -> `services/` -> MongoDB. Routes in `routes/routes.go` (Gorilla Mux)
- Frontend: Page -> Zustand store (`store/` 17 stores) -> API -> Go backend
- Next.js proxies `/api/*` to Go, **except these handled by Next.js**: `/api/postex/*`, `/api/uploads/*`, `/api/instagram/*`, `/api/sitemap`, `/api/locality/*`, `/api/tryon/negotiate` and `/api/tryon/negotiate-stream` (latter two are passthroughs to Go, just rewritten so the streaming `text/event-stream` response isn't proxied by Next.js's default body buffering)
- `/uploads/*` served by Go from `./uploads/`; frontend rewrites to backend
- Auth: JWT Bearer token. `middlewares.AuthMiddleware` for users, `AdminAuthMiddleware` for admin (checks `role == "admin"`)
- `start.sh` waits for MongoDB, auto-seeds if `vocabulary_mappings` is empty
- Config reads `PORT` env (fallback 8080), not `SERVER_PORT`

## Payment Gateway

- **`PaymentGateway` interface** (`services/payment_gateway.go`): `Name()`, `RequestPayment`, `VerifyPayment`, `InquiryPayment`
- **Gateway registry**: `map[string]services.PaymentGateway` in `handlers/payment.go`, populated by `InitZibalService()` and `InitDigipayService()` called from `main.go`
- **Never trust client-sent amounts**: backend derives `amount` from `order.TotalAmount * 10`. `FinalizeVerifiedPayment` rejects if `verifiedAmount != expectedAmount`
- **`PaymentAttempt` model** (`models/payment_attempt.go`): tracks each attempt with unique indexes on `(gateway, provider_id)` and `(gateway, gateway_reference)`. Each retry creates a fresh attempt with new UUID — never overwrite previous attempt data
- **DigiPay OAuth**: uses `golang.org/x/sync/singleflight.Group` to deduplicate concurrent token refreshes
- **DigiPay callback**: POST handler extracts `providerId` and `type` from form body, calls verify API (only authoritative source), then `FinalizeVerifiedPayment`, then `303 See Other` redirect. Callback data is never proof of payment
- **Config**: `ZIBAL_MERCHANT` (default `"zibal"` for test), `DIGIPAY_CLIENT_ID` + `DIGIPAY_CLIENT_SECRET`. DigiPay staging URL and API version hardcoded in `services/digipay_service.go`

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

## Virtual Try-On Persistence

The tryon flow is fully persisted. **No TTL — all data is kept forever.**

### Collections
- **`virtual_tryons`** — one doc per try-on generation. Fields: `tryon_id`, `user_id`, `status` (processing/done/error), `task_id`, `person_image_url` (persisted to disk), `person_image_hash` (sha256, used for dedup), `garment_image_url`, `garment_product_id`, `garment_product_name`, `garment_color`, `garment_size`, `garment_type`, `result_image_url`, `prompt_text`, `model_used`, `error`, `duration_ms`, timestamps. Indexes in `db/tryon_indexes.go`.
- **`tryon_chats`** — one doc per fitting room (can outlive one tryon). Fields: `chat_id`, `user_id`, `tryon_ids[]`, `messages[]` (polymorphic: `user`/`agent`/`tool`/`tryon`/`system`), `metadata` (counters, `coupons_offered[]`, `products_recommended[]`, `device_type`/`browser`/`os`), `status`, `title`, timestamps.
- **`negotiated_coupons`** — extended with `tryon_id` + `chat_id` fields for linkage.

### Endpoints (all behind `AuthMiddleware`)
- `POST /api/tryon/generate` — creates `virtual_tryons` doc + `tryon_chats` link; returns `{task_id, tryon_id, chat_id}`
- `GET /api/tryon/sessions` — list user's fitting rooms (paginated, latest first)
- `GET /api/tryon/sessions/{chatId}` — full chat + linked tryons
- `DELETE /api/tryon/sessions/{chatId}` — soft delete
- `POST /api/tryon/sessions/messages` — append messages (used by frontend after each turn)
- `GET /api/tryon/history` — list all tryons for the user
- `GET /api/tryon/{tryonId}` — single tryon
- `POST /api/tryon/link` — add `tryon_id` to chat's `tryon_ids` array (idempotent)

### Frontend integration
- `front_end/src/store/tryon-store.ts` — extended with `chatId`, `currentTryonId`, `loadSession(chatId)`, `persistMessage`, `persistTryonMessage`. `chatId` is stored in `localStorage` under `voxcina_tryon_chat_id`.
- `front_end/src/lib/tryon-api.ts` — typed client for all tryon endpoints.
- The `/tryon` page calls `loadSession(chatId)` on mount → restores chat messages + last tryon result from MongoDB. Persists each turn (user message, agent message with tool_call, tryon card). **No UI changes to the page — persistence is added via the store + API only.**

### Tryon page is auth-only
- `useProtectedRoute({requiredAuth:true})` in `tryon/page.tsx` redirects unauthenticated users.
- `user_id` is mandatory on `virtual_tryons` and `tryon_chats` — there is no `session_id` field and no anonymous backfill.
- All new tryon API routes sit behind `AuthMiddleware`; unauthenticated requests return 401.

### In-memory task cache (`tryOnTasks` in `handlers/tryon.go`)
Transient `sync.Map` keyed by `task_id`. The SSE stream (`/api/tryon/status-stream`) reads from this map while a task is in-flight. Two cleanup policies (`cleanupTryOnTasks` goroutine, 1-min tick):
- **`done` or `error`**: removed 5 min after `CreatedAt` (grace for in-flight SSE clients)
- **`processing`**: removed 30 min after `CreatedAt` (hard cap for crashed goroutines)

The in-memory map eviction does **not** affect MongoDB persistence. Logs use `[tryon-cleanup] removed N finished, M stale` format.

### Negotiation tool call
LLM-driven coupon offering via OpenRouter's `google/gemma-4-31b-it` (fallback `qwen/qwen3.5-27b`) with a mandatory `offer_coupon` tool. When the model calls the tool, the backend generates a `TRYN-XXXXXXXX` code, saves it to `negotiated_coupons` with `tryon_id` + `chat_id`, and the SSE `done` event includes the coupon. The frontend persists the agent message with the embedded `tool_call` (name, arguments, result) so reload restores the coupon state.

## User Activity Tracking

The `/api/activity/track` and `/api/activity/track/batch` endpoints are **public** (no `AuthMiddleware`). They accept `sessionId` from the request body and store it; `user_id` is only attached if the request goes through `AuthMiddleware` (the `GetUserActivities` retrieval routes do, the public track routes do not).

The frontend `activity-tracker.ts` singleton always sends `sessionId` from localStorage (`activity_session_id` key, 30-min sliding window). Therefore **activities are stored with `session_id`, not `user_id`, for every page** — including the tryon page even though it's auth-gated.

If a feature needs `user_id`-linked activities, you must either:
1. Move the activity endpoint behind `AuthMiddleware` (affects all pages), or
2. Add a separate authed endpoint for that specific activity.

The activity tracker is invoked from:
- `front_end/src/lib/activity-tracker.ts` (singleton, queue + 5s flush, `sendBeacon` on `beforeunload`)
- `front_end/src/components/product/ProductCard.tsx` → `product_click`
- `front_end/src/components/product/ProductActions.tsx` → `product_view`, `image_viewed`, `color_click`
- `front_end/src/app/(shop)/cart/page.tsx` → `checkout_started`
- `front_end/src/app/(shop)/checkout/page.tsx` → `order_placed`
- `front_end/src/app/(shop)/checkout/callback/page.tsx` → `payment_success` / `payment_failed`
- `front_end/src/app/(shop)/tryon/page.tsx` → `image_viewed` (per tryon) + `chat_started` (once per session, context=`coupon_negotiation`)
- Global anchor click listener in `activity-tracker.ts` for outbound navigations

Activity constants live in `models/user_activity.go` (prefixed `Activity*`). The collection has a 180-day TTL via `ExpiresAt`. Indexes in `db/user_activity_indexes.go`.

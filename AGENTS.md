# Repository Guide

## Layout and Runtime

- The repository root is the Go module `backEnd`; there is no `backEnd/` directory. Go imports use `backEnd/...`.
- Backend entrypoint is `main.go`; request flow is `routes/` -> `handlers/` -> `services/`/`db/` -> MongoDB.
- `front_end/` is a Next.js 16 App Router application (React 19, Node 22 — `.nvmrc` and `node:22-alpine` in `front_end/Dockerfile` must stay in sync; production builds run on Turbopack). Use `@/*` for `front_end/src/*`; client state is in Zustand stores under `front_end/src/store/`.
- Next 16 quirks that already bit this repo:
  - `params`/`searchParams` are Promises — `await` them in pages/layouts (all routes are migrated; new ones must follow).
  - A page's ISR is **not** inferred from `fetch(..., { next: { revalidate } })` anymore. The Docker builder runs `npm run build` with `GO_BACKEND_URL=""`, so backend fetches are skipped at build time; a page without an explicit `export const revalidate = N` (see `src/app/page.tsx`, 600) or `force-dynamic` gets cached **forever with empty data**.
  - Request guards live in `front_end/src/proxy.ts` — Next 16 renamed `middleware.ts`/`export function middleware`; the old names emit deprecation warnings.
  - `next.config.js` `turbopack.resolveAlias` replaces Next's hard-coded legacy polyfill module (unconditional `require` in `next/dist/client/app-globals.js`, upstream vercel/next.js#86785) with `src/lib/empty-polyfill-module.js`. After any Next upgrade, run a build and `grep -rl '"trimStart"in String.prototype' .next/static/chunks/` — output means the internal path moved and the alias silently stopped matching.
- The UI is Persian RTL with the single `fa` locale configured in `front_end/next.config.js`; do not introduce another locale without changing routing/configuration.
- Compose exposes frontend on `localhost:3000`, backend on `localhost:8088` (container port `8080`), and MongoDB only on `127.0.0.1:27017`.
- Uploaded files live in the host `uploads/` directory and are mounted into both backend and frontend containers; do not bake them into images.

## Commands

Run Go commands from the repository root:

```bash
go build -o main .
go test ./...
go test ./services -run TestNewDirectPaymentHTTPClientDoesNotUseProcessProxy -count=1
go vet ./...
./main -healthcheck
./main -seed
./main -check-vocab
./main -migrate-avatars
./main -migrate-address-digits
./main -migrate-product-weight
```

Migration flags accept `-dry-run` to report changes without writing.

The only committed Go tests live in `handlers/`, `services/`, and `utils/`; they are unit tests with no MongoDB or network dependency. `go test ./...` also discovers a Go-looking package inside `front_end/node_modules` — ignore it. Run a focused test like `go test ./handlers -run TestEvaluateReturnEligibility -count=1`.

Run frontend commands from `front_end/`:

```bash
npm ci --legacy-peer-deps
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

`--legacy-peer-deps` is required (the Dockerfile uses it too): `lucide-react` and `@neshan-maps-platform/*` publish React 16–18 peer ranges that conflict with React 19. Next 16 does not lint during `next build` at all and its `next lint` command is gone — `npm run lint` is standalone flat-config `eslint .`. Never delete `.next` to fix a normal build issue; the build is incremental. Adding a new `<Image quality={N}>` value requires adding N to `images.qualities` in `next.config.js` (currently `[75, 85]`) or ImageResponse re-encodes on every request.

For local services, copy `.env.example` to `.env`, set `JWT_SECRET` and Mongo credentials, then run `docker compose up -d --build`. Frontend-only browser/service keys are documented in `front_end/.env.example`; secrets must remain server-side and `.env` is ignored.

## API and Auth

- `front_end/next.config.js` proxies general `/api/*` requests to Go and rewrites `/uploads/*` to the backend. Filesystem API routes under `front_end/src/app/api/` handle Postex, try-on negotiation/streaming, Instagram, sitemap, revalidation, and upload-specific behavior; check the actual route before adding a backend endpoint.
- Server Components fetch the Go service directly using `GO_BACKEND_URL` (`http://server:8080` in Compose, localhost fallback in local development).
- JWT Bearer auth is initialized in `main.go`; `AuthMiddleware` protects user routes and `AdminAuthMiddleware` protects `/api/admin/*` with `role == "admin"`. The middleware sets only `userID` and `role` in context — never `userName`; resolve display names from the `users` collection when an audit trail needs them.
- `start.sh` waits for MongoDB (via `./main -healthcheck`), checks `vocabulary_mappings`, seeds only when that collection is empty, then starts the API.
- There is no migration framework. Schema/index setup is in `db/`; special backfills currently use explicit `main.go` flags such as `-migrate-avatars`.

## High-Risk Domain Rules

- Payment gateway interface is `services/payment_gateway.go`; services are registered from `main.go`. Zibal/DigiPay derive Rials as `order.TotalAmount * 10`; SnappPay uses its own conversion. Verification must match `PaymentAttempt.ExpectedAmount` through `FinalizeVerifiedPayment`.
- Every payment retry creates a new `PaymentAttempt` and provider ID; never overwrite a previous attempt. Payment token refresh uses `singleflight` in DigiPay/SnappPay services.
- Virtual try-on routes are authenticated. MongoDB persists `virtual_tryons`, `tryon_chats`, and `negotiated_coupons`; `tryOnTasks` in `handlers/tryon.go` is only an in-memory status map. Finished/error tasks expire after 5 minutes and unfinished tasks after 30 minutes.
- Public activity ingestion is `POST /api/activity/track` and `/batch`; it accepts anonymous sessions and stores `sessionId`. Retrieval routes require auth. `user_activities` has a TTL index driven by `ExpiresAt` at 180 days.
- Careers submissions (`POST /api/careers/submissions`, public, multipart) serve both `/careers` forms: `type=partnership` (company + business type) and `type=job` (`position_id` of an active job posting + required PDF CV). Uploaded CVs are stored as binary in the `career_resumes` collection, **never** under `uploads/` — that tree is served unauthenticated at `/uploads/` by Go and is also mounted into the frontend container as `public/uploads`, so a resume placed there would be world-readable. The only way to a CV is admin-authenticated `GET /api/admin/career-submissions/{id}/resume`. PDFs are validated by magic bytes (`%PDF-`), not extension or MIME type, and capped at 5MB. The `website` form field is a honeypot: when non-empty the request returns the normal success shape and stores nothing. The per-IP rate limit (5/hour, in-memory) charges only submissions that were actually stored, so validation errors never lock a visitor out.
- Open positions are admin-managed records in `job_positions` (`GET /api/careers/positions` public/active-only; `GET|POST /api/admin/job-positions` and `PUT|DELETE /api/admin/job-positions/{id}`), surfaced at `/admin/careers` beside the submissions inbox. A job application must name one **active** posting by id: the handler resolves the title from the posting itself and ignores any client-sent `position` string, so a submission can never carry a role that was never advertised. `CareerSubmission.Position` is a title **snapshot** and `position_id` the live link — renaming or deleting a posting therefore leaves existing applications readable, and deleting one never touches them. `employment_type` is a closed set (`models.JobPositionEmploymentTypes`) that `front_end/src/lib/careers.ts:EMPLOYMENT_TYPES` must mirror exactly. `title` has a unique index (duplicates are indistinguishable in the applicant's dropdown), and `db.SeedDefaultJobPositions` seeds four starter postings only when the collection is empty. `/careers` is `force-dynamic`: it reads the openings per request because a build-time prerender has no backend and would ship an empty list.
- Hero public data is active, display-ordered `/api/hero-images`, cached for 360 seconds with `home`/`hero-images` tags. Admin hero writes trigger tag revalidation. Go hero content must remain a BSON/JSON object (`bson.M`), not a decoded `primitive.D` array.
- SKU format is `{Gender}{Category}{Brand}{Style}{Color}{Size}` in `Coding.json`; size codes are single characters (`X,S,M,L,Q,R,T`).
- Order statuses are exactly `pending | processing | shipped | delivered | cancelled` (`getStatusText` in `handlers/orders.go` localizes them); the frontend type union also lists `refunded` but the backend never sets it as an order status. `payment_status = "refunded"` exists only via the SnappPay transaction-cancel flow.
- Transitioning an order to `delivered` stamps `delivered_at` (models/order.go), which drives the 7-day return window. Return requests (`return_requests` collection, `handlers/return_requests.go`) allow only delivered+paid orders within `delivered_at + 7×24h` (inclusive boundary, clock injected for tests; falls back to latest timeline `delivered` entry, then `updated_at`). Eligibility is computed server-side only — never trust a client clock for the window. One pending request per order is enforced by a partial unique index; terminal states (`approved/rejected/cancelled`) are immutable via a status-filtered UpdateOne. Approving a return does not refund or restock automatically.
- AI model names are admin-managed at `/admin/settings` (`GET`/`PUT /api/admin/ai/settings`), stored as one `app_settings` document (`_id: "ai_models"`) and cached 30s in `services/ai_settings.go`. Both fields are **overrides**: empty keeps the existing default, and every call site resolves through `services.ResolveModel(override, fallback)`. `chat_model` drives both chatbots — the support agent (`CustomerAIService`, default `OPENROUTER_MODEL` then `openai/gpt-oss-20b:free`) and the try-on seller agent (`RunSellerAgentStream`, default `SellerConfig().Model`; its `FallbackModel` stays as configured). `tryon_image_model` is used only for try-on image generation (`handlers/tryon.go`, default `defaultTryOnModel`). Names are validated against the `owner/model[:variant]` form before saving. Product AI metadata keeps its own per-request model field on the product form and is not covered by this setting.
- Deleting a product from the admin list is a **hard** delete and irreversible: `DeleteProduct` removes the document, then pulls its lines from every cart (`removeProductFromCarts`), drops its FAISS product and variant vectors, and unlinks its image files. `is_active` is no longer a delete marker — it is only the storefront visibility toggle on the edit form. Orders survive because `OrderItem` snapshots name/image/price/variant; `restoreInventory` skips a deleted product instead of aborting the whole restock, and `validateInventory` correctly refuses checkout for one. Reviews, negotiated coupons, blog product blocks and try-on history keep their `product_id` and are left behind by design.
- Admin product edits are never blocked by carts; they reconcile them. `UpdateProduct` compares availability before/after (`productAvailabilityChanged` in `handlers/cart_reconcile.go`: the `is_active`/`in_stock` flags plus every color+size quantity) and only then rewrites active carts — sold-out or off-sale items are removed, over-quantity items are reduced to the remaining stock, and a deleted color/size is left for `prepareCartResponse` to hide. Edits that touch only descriptive fields (AI metadata, names, images) leave availability identical and must never reach the carts. The response is `productUpdateResponse`: the product inline, plus `cartReconciliation` when carts changed.

## Deployment

- The VPS SSH alias is `vps-ir` (`/root/voxcina`, SSH port `9011`); it has no direct internet and relies on the configured HTTP/SOCKS proxies. Deploy committed changes on `develop` only after checking the VPS worktree is clean.
- Fast frontend deploy (used for routine changes): pull on VPS, then copy source and build inside the running container. Copying alone applies nothing — the in-container build and restart are mandatory:

```bash
ssh -o ConnectTimeout=10 vps-ir 'cd /root/voxcina && git pull --ff-only origin develop'
ssh -o ConnectTimeout=10 vps-ir 'docker cp /root/voxcina/front_end/src/. voxcina_frontend:/app/src/'
ssh -o ConnectTimeout=10 vps-ir 'docker exec voxcina_frontend npm run build'
ssh -o ConnectTimeout=10 vps-ir 'docker restart voxcina_frontend'
```

- `next.config.js` lives outside `src/` and is NOT covered by that copy — if it changed, also `docker cp /root/voxcina/front_end/next.config.js voxcina_frontend:/app/next.config.js` before building. Changes to `package.json`, `package-lock.json`, or `Dockerfile` (e.g. `npm ci`-time patches) require the full image rebuild below, not the fast flow.
- The image-based alternative (`docker compose build --no-cache front_end && docker compose up -d front_end`) is slower but authoritative — the container's copied source is lost if the container is recreated from the old image.
- Backend deploy: build a **static** binary — `CGO_ENABLED=0 GOOS=linux go build -o /tmp/voxcina-server .`, `scp` it to `vps-ir`, then `docker cp` to `api-server:/app/main` and restart. Without `CGO_ENABLED=0` the binary links glibc, the minimal container reports `./main: not found`, and `start.sh` loops forever on "MongoDB is unavailable - sleeping" — that message means the healthcheck binary failed to execute, not that MongoDB is down. Verify with `docker exec api-server ./main -healthcheck` before restarting. Verify with `file /tmp/voxcina-server | grep statically` before shipping.
- Backend-only image rebuild is `docker compose build server && docker compose up -d server`; inspect `docker compose ps` and service logs after either deployment.
- Before a no-cache VPS build, check `df -h /`. Unused Docker images can fill the root filesystem and cause MongoDB to fail with `No space left on device`; prune unused images only when necessary and never remove the MongoDB volume.
- `scripts/update_front_end.sh [branch]` is a long-running auto-deploy loop that stops, builds, starts, and prunes the whole Compose stack; use the targeted commands above for a manual deployment.
- On a fresh VPS, Docker bridge traffic to the Xray proxy on host port `10809` needs ACCEPT rules in the `ufw-before-input` chain; the persistent `/etc/systemd/system/docker-proxy-iptables.service` restores them after reboot.

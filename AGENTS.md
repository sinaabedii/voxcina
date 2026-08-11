# Repository Guide

## Layout and Runtime

- The repository root is the Go module `backEnd`; there is no `backEnd/` directory. Go imports use `backEnd/...`.
- Backend entrypoint is `main.go`; request flow is `routes/` -> `handlers/` -> `services/`/`db/` -> MongoDB.
- `front_end/` is a Next.js 14 App Router application. Use `@/*` for `front_end/src/*`; client state is in Zustand stores under `front_end/src/store/`.
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
```

The only committed Go test is `services/payment_http_client_test.go`; `go test ./...` also discovers a Go-looking package inside `front_end/node_modules`.

Run frontend commands from `front_end/`:

```bash
npm ci
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

`next.config.js` ignores lint during `next build`, so run `npm run lint` separately. The production build is incremental; never delete `.next` to fix a normal build issue.

For local services, copy `.env.example` to `.env`, set `JWT_SECRET` and Mongo credentials, then run `docker compose up -d --build`. Frontend-only browser/service keys are documented in `front_end/.env.example`; secrets must remain server-side and `.env` is ignored.

## API and Auth

- `front_end/next.config.js` proxies general `/api/*` requests to Go and rewrites `/uploads/*` to the backend. Filesystem API routes under `front_end/src/app/api/` handle Postex, try-on negotiation/streaming, Instagram, sitemap, revalidation, and upload-specific behavior; check the actual route before adding a backend endpoint.
- Server Components fetch the Go service directly using `GO_BACKEND_URL` (`http://server:8080` in Compose, localhost fallback in local development).
- JWT Bearer auth is initialized in `main.go`; `AuthMiddleware` protects user routes and `AdminAuthMiddleware` protects `/api/admin/*` with `role == "admin"`.
- `start.sh` waits for MongoDB, checks `vocabulary_mappings`, seeds only when that collection is empty, then starts the API.
- There is no migration framework. Schema/index setup is in `db/`; special backfills currently use explicit `main.go` flags such as `-migrate-avatars`.

## High-Risk Domain Rules

- Payment gateway interface is `services/payment_gateway.go`; services are registered from `main.go`. Zibal/DigiPay derive Rials as `order.TotalAmount * 10`; SnappPay uses its own conversion. Verification must match `PaymentAttempt.ExpectedAmount` through `FinalizeVerifiedPayment`.
- Every payment retry creates a new `PaymentAttempt` and provider ID; never overwrite a previous attempt. Payment token refresh uses `singleflight` in DigiPay/SnappPay services.
- Virtual try-on routes are authenticated. MongoDB persists `virtual_tryons`, `tryon_chats`, and `negotiated_coupons`; `tryOnTasks` in `handlers/tryon.go` is only an in-memory status map. Finished/error tasks expire after 5 minutes and unfinished tasks after 30 minutes.
- Public activity ingestion is `POST /api/activity/track` and `/batch`; it accepts anonymous sessions and stores `sessionId`. Retrieval routes require auth. `user_activities` has a TTL index driven by `ExpiresAt` at 180 days.
- Hero public data is active, display-ordered `/api/hero-images`, cached for 360 seconds with `home`/`hero-images` tags. Admin hero writes trigger tag revalidation. Go hero content must remain a BSON/JSON object (`bson.M`), not a decoded `primitive.D` array.
- SKU format is `{Gender}{Category}{Brand}{Style}{Color}{Size}` in `Coding.json`; size codes are single characters (`X,S,M,L,Q,R,T`).

## Deployment

- The VPS SSH alias is `vps-ir` (`/root/voxcina`, SSH port `9011`); it has no direct internet and relies on the configured HTTP/SOCKS proxies. Deploy committed changes on `develop` only after checking the VPS worktree is clean.
- Pull and deploy a frontend change with:

```bash
ssh -o ConnectTimeout=10 vps-ir 'cd /root/voxcina && git pull --ff-only origin develop'
ssh -o ConnectTimeout=10 vps-ir 'cd /root/voxcina && docker compose build --no-cache front_end && docker compose up -d front_end'
```

- The frontend Docker runner copies `.next`, `public`, and dependencies but not `src/`; do not `docker cp` source into a running container. Rebuild the full `front_end` image.
- Backend-only deployment is `docker compose build server && docker compose up -d server`; inspect `docker compose ps` and service logs after either deployment.
- Before a no-cache VPS build, check `df -h /`. Unused Docker images can fill the root filesystem and cause MongoDB to fail with `No space left on device`; prune unused images only when necessary and never remove the MongoDB volume.
- `scripts/update_front_end.sh [branch]` is a long-running auto-deploy loop that stops, builds, starts, and prunes the whole Compose stack; use the targeted commands above for a manual deployment.
- On a fresh VPS, Docker bridge traffic to the Xray proxy on host port `10809` needs ACCEPT rules in the `ufw-before-input` chain; the persistent `/etc/systemd/system/docker-proxy-iptables.service` restores them after reboot.

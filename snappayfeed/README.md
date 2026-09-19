# snappayfeed — SnappPay / Searchwise product feed

Serves the product feed SnappPay's search partner (Searchwise) crawls, in the
wire format of their official WooCommerce plugin **Searchwise API Data Feed
v1.0.2**, so their ingester needs no change for a store that is not WooCommerce.

Design rationale, the verified contract and the onboarding checklist live in
[`../SNAPPAY_SEARCH_FEED_PLAN.md`](../SNAPPAY_SEARCH_FEED_PLAN.md).

---

## What it guarantees

- **Read-only.** Only `Find` and `Aggregate`. No collection, field, index or
  migration is added, and nothing is ever written — not even backfilling a
  missing `variant_id`.
- **The product structure is untouched.** `models.Product`, `ColorVariant` and
  `SizeVariant` are consumed as they are; every feed-shaped value is a DTO in
  this package, derived per request.
- **Variant-first.** One feed row per **colour variant**: its own id, its own
  deep link, its own photos, and stock computed from *that* variant's sizes.
  A product with 3 colours is 3 SnappPay cards — matching how the storefront
  itself lists products (`ListProducts` paginates per colour variant).

## Files

| File | Contents |
|---|---|
| `doc.go` | Package contract and boundaries. |
| `config.go` | Env-resolved `Config`, plugin version, route path, limits. |
| `dto.go` | The wire shapes (`feedResponse`, `feedRow`). |
| `mapping.go` | Pure helpers: keys, prices, availability, titles, images, sizes, description. |
| `rows.go` | Builds feed rows from catalog documents (both granularities). |
| `request.go` | Parameter parsing: JSON body → form → query. |
| `auth.go` | `x-api-key`: static key, then Searchwise token validation. |
| `repository.go` | The read-only Mongo queries and the paging pipeline. |
| `handler.go` | HTTP entry point, crawl and targeted-refresh paths, error shapes. |
| `register.go` | The single hook into the app's router. |
| `*_test.go` | Unit tests. No MongoDB, no outbound network. |

## Routing

The public URL is the WooCommerce-identical path; the Go route lives under
`/api` because `main.go` mounts the gorilla router at `/api/` on a plain
`ServeMux`, so a root-level path would never reach it.

```
POST https://voxcina.com/wp-json/v1/product/feed
        │
        ├─ nginx: location = /wp-json/v1/product/feed   ← production fast path
        │     proxy_pass http://localhost:8080/api/snappay/feed
        │     (one hop, edge → Go; Node is not involved)
        │
        └─ if that block is absent (local dev, un-updated host):
              nginx location /  →  Next  →  rewrite  →  Go /api/snappay/feed
```

`location = …` is an **exact match**, which nginx evaluates before every prefix
and regex location, so the feed costs no extra matching on any other request
and never enters Node. The Next.js rewrite in `front_end/next.config.js` is
kept deliberately as the fallback: it makes `npm run dev` work without nginx
and keeps the public URL alive if the nginx block has not been deployed yet.
Both point at the same Go route, so they can coexist indefinitely.

`/api/snappay/feed` is also reachable directly — useful for curl and for
bypassing the edge during debugging.

**Register the apex URL with SnappPay, never `www`.** The feed URL given to
Searchwise must be `https://voxcina.com/wp-json/v1/product/feed`. The apex is
canonical, but a misconfigured `www` URL no longer breaks the feed: nginx
answers the feed path on `www` with a `308` to the apex — on the HTTPS origin
and on the port-80 redirect — and `308` preserves the `POST` method, where a
`301` would let clients downgrade it to `GET` (the route answers 405). Every
other `www` path keeps its previous behavior (the HTTPS origin serves it, port
80 still answers `301`). One caveat: the public HTTP->HTTPS redirect is issued
by ArvanCloud's edge before the origin, so keep the registered URL HTTPS.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `APP_URL` | — | Public origin for `link` / `image_link`. Must be `https://voxcina.com` in production. |
| `SNAPPAY_FEED_API_KEY` | empty | Static `x-api-key` accepted directly. Lets us test before Searchwise provisions a key. |
| `SNAPPAY_FEED_VALIDATE_URL` | `https://merchants.searchwise.ir/api/v1/feed/validate-token` | Searchwise token validation endpoint. |
| `SNAPPAY_FEED_MERCHANT_DOMAIN` | host of `APP_URL` | `merchant_domain` sent to Searchwise. |
| `SNAPPAY_FEED_GRANULARITY` | `variant` | `variant` (one row per colour) or `product` (one aggregated row). |
| `SNAPPAY_FEED_AVAILABILITY_STYLE` | `plugin` | `plugin` → `instock`/`outofstock`; `guide` → `in stock`/`out of stock`. |
| `SNAPPAY_FEED_SKIP_OUT_OF_STOCK` | `false` | `true` drops sold-out rows instead of marking them. |

All are read per request, so an ops flip needs a restart, not a rebuild.

## Trying it

```bash
# A crawl page (origin-direct, bypassing nginx and Next)
curl -sS -X POST http://localhost:8080/api/snappay/feed \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $SNAPPAY_FEED_API_KEY" \
  -d '{"limit":2}' | jq

# Every colour of one product
curl -sS -X POST http://localhost:8080/api/snappay/feed \
  -H "x-api-key: $SNAPPAY_FEED_API_KEY" -d 'products=<productHex>'

# One colour, by the slug the feed published
curl -sS -X POST http://localhost:8080/api/snappay/feed \
  -H "x-api-key: $SNAPPAY_FEED_API_KEY" -d 'slugs=<variantKey>'

# Through the public URL
curl -sS -X POST https://voxcina.com/wp-json/v1/product/feed \
  -H 'Content-Type: application/json' -H 'x-api-key: …' -d '{"limit":2}'

go test ./snappayfeed/ -count=1
```

Expect: prices in Rials, `availability` per colour, absolute image URLs, and
`link` values that open the product page already switched to that colour.

## Removing this feature

Everything is in this directory except three call sites, each carrying a
comment that points back here.

1. `rm -rf snappayfeed/`
2. `routes/routes.go` — delete the `"backEnd/snappayfeed"` import and the
   `snappayfeed.Register(api)` call (4 lines with its comment).
3. `front_end/next.config.js` — delete the `/wp-json/v1/product/feed` rewrite
   entry and its comment.
4. `nginx-voxcina-optimized.conf` and `nginx-voxcina-optimized-v2.conf` —
   delete the `location = /wp-json/v1/product/feed` block from each, then
   deploy the live config and `nginx -s reload`.
5. Drop the `SNAPPAY_FEED_*` variables from `.env` if they were set.

Then `go build ./... && go test ./... ` — nothing else references the package.
No database cleanup is needed, because nothing was ever written.

## Known gaps

- The Mongo queries have no automated coverage: committed Go tests in this repo
  carry no database dependency, so `repository.go`'s queries are exercised only
  by the pipeline-shape tests plus the manual curl checks above. Run those
  against real data before onboarding.
- `shipping_cost` / `delivery_time` are emitted as `0`: shipping is quoted per
  cart via Postex and has no per-product value. The plugin emits 0 too when the
  meta is absent.
- `GTIN` and `subtitle` are not emitted — the catalog does not track either.
- Questions still open with Searchwise (row granularity, string ids, currency,
  availability wording) are listed in the plan document, §11.

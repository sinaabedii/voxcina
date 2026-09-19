# SnappPay Search Product Feed — Implementation Plan

Status: **Implemented** (backend + routing); onboarding pending · Date: 2026-09-19
Scope: backend (Go) + edge routing + ops

Code: [`snappayfeed/`](snappayfeed/) — see its [README](snappayfeed/README.md) for
the file map, the env vars and the removal procedure.

Goal owner: storefront/backend

Contract re-verified against the live sources on **2026-09-19** — see §3.

---

## 1. Goal

Make Voxcina products appear in SnappPay app search with **near-realtime price/stock**
by exposing a native product feed that is byte-compatible with the official
**Searchwise API Data Feed** contract used by SnappPay.

The feed must represent the catalog the way the storefront already does: **one
sellable row per color variant**, each with its own images, its own per-size
inventory, and its own deep link.

---

## 2. Hard constraints (non-negotiable)

These are the product owner's constraints. Every design choice below is made to
satisfy them; the task checklists in §8 restate them as acceptance criteria.

1. **No database schema change.** No new collections, no new fields on existing
   documents, no new indexes, no migrations, no backfills.
2. **No change to the product structure.** `models.Product`, `models.ColorVariant`,
   `models.SizeVariant`, `models.ProductAttribute` are read-only for this feature —
   not one struct tag, field, or comment changes. The admin product form, the
   product APIs, and the storefront rendering are equally untouched.
3. **Everything happens at the API / helper-function layer.** The feed is a new
   read-only handler plus pure mapping helpers that translate the *existing* product
   documents into the SnappPay wire format. Nothing the feed needs is stored; it is
   all derived per request.
4. **The feed is read-only.** It never writes to Mongo — not even convenience writes
   such as backfilling a missing `variant_id` (see §7.6 for how that case is handled
   without a write).
5. **Variants are first-class.** A product with 3 colors is 3 rows in the feed, with
   3 URLs and 3 independent stock states, because that is what the customer actually
   buys and what the storefront already lists.

### What the feed reads (read-only projection)

| Collection | Fields read | Written? |
|---|---|---|
| `products` | `_id`, `name`, `description`, `price`, `original_price`, `main_images`, `color_variants` (`variant_id`, `color`, `color_name`, `images`, `sizes[].size/quantity`), `category_ids`, `brand`, `attributes`, `is_active` | **never** |
| `categories` | `_id`, `name`, `parent_id` (breadcrumb chain) | **never** |

`color_variants.ai_metadata` and `search_metadata` are projected **out** (the
`productPublicProjection` rule in `AGENTS.md`: each carries a 1536-dim embedding).
In an aggregation `$project` these must be excluded by their **BSON** names —
`color_variants.ai_metadata`, not the Go JSON tag — or the exclusion silently
matches nothing.

---

## 3. Sources and verification log

| # | Source | URL |
|---|--------|-----|
| 1 | Academy: showing products in SnappPay search (plugin / feed / crawler) | https://academy.snapppay.ir/2026/05/04/search-plugin/ |
| 2 | Academy: data-collection methods + product naming rules | https://academy.snapppay.ir/2026/05/10/search/ |
| 3 | Academy: common datafeed mistakes | https://academy.snapppay.ir/2026/06/29/datafeed-common-errors/ |
| 4 | Academy: how the SnappPay search ranking algorithm works | https://academy.snapppay.ir/2026/06/03/snapppay-search-algorithm/ |
| 5 | Official plugin zip — contract extracted from its PHP source | https://academy.snapppay.ir/wp-content/uploads/2026/03/searchwise-woocommerce-plugin-1.0.2_2.zip |
| 6 | Request form: "درخواست نمایش روی سرچ اسنپ‌پی" | https://survey.porsline.ir/s/kcT4ksYZ |
| 7 | Request form: CMS/technology change (non-WooCommerce notification) | https://survey.porsline.ir/s/sOILszFr |
| 8 | Merchant activation terms for the app + search | https://academy.snapppay.ir/2026/04/22/ |
| 9 | Support | merchant-support@snapppay.ir · 021-96862222 · support.snapppay.ir |
| 10 | Searchwise token-validation endpoint used by the plugin | `https://merchants.searchwise.ir/api/v1/feed/validate-token` |

The search index is operated by **Searchwise** (searchwise.ir) on behalf of SnappPay.

### Verified on 2026-09-19

| Check | Result |
|---|---|
| Newer plugin release than 1.0.2? | **No.** The academy plugin page still links exactly one zip, `…/2026/03/searchwise-woocommerce-plugin-1.0.2_2.zip`; the source declares `$plugin_version = "1.0.2"`. |
| Newer academy article on feeds? | **No.** Latest feed-related post is the 2026-06-29 datafeed-mistakes article (already source #3). |
| Contract in §4 vs. the actual PHP | Re-derived from `searchwise-api-data-feed.php` line by line; three corrections folded in (`wc_version`/`wp_version`, field-name aliases, `limit` default). |
| Does a newer/other official feed spec exist (REST docs, portal)? | None published. The plugin source + the academy field list are the only normative artifacts. |

Because the plugin has not moved since March and the academy has published nothing
newer, **the 1.0.2 contract is still the current one** — and mirroring it remains
the most compatible route.

---

## 4. Decision: cleanest and best-compatible method

**Chosen: implement the official plugin's REST contract natively in Go** — same
method, public path, auth header, envelope, field names and value vocabulary —
published at `POST https://voxcina.com/wp-json/v1/product/feed`.

Why this is the most compatible option:

1. **Zero parser adaptation on Searchwise's side.** Their ingester is built against
   the plugin's output. Matching the envelope and field names exactly means the feed
   works without them shipping any change for us.
2. **The academy explicitly supports non-WooCommerce stores** through the file/API
   feed path, and source #2 names the API method as the preferred one because it
   syncs with the primary database in realtime. Source #4 adds that stale inventory
   is penalized in ranking — which is the argument for an API feed over a file feed.
3. **Same public URL removes a failure mode.** Even if Searchwise configures the feed
   URL per merchant, serving the exact WooCommerce path means nothing has to be
   assumed about their config — and because the handler is a normal route, it can be
   re-pointed to any path they ask for.
4. **Auth mirrors the plugin exactly** (`x-api-key` validated against Searchwise),
   with an env-configured static key as a pre-provisioning fallback so the endpoint
   is testable before onboarding completes.
5. **No DB/model impact** (§2).

### Alternatives considered and rejected

| Alternative | Why not |
|---|---|
| Install the WooCommerce plugin | Not WooCommerce; the stack is Go + Next.js. Impossible. |
| Custom JSON schema (own field names/envelope) | Requires Searchwise to adapt their parser — outside our control, unnecessary risk. |
| File feed (JSON/XML/CSV) at a fixed URL | Must be regenerated ≥ daily; worse freshness; still needs a custom pipeline plus a place to write the artifact. |
| Crawler-only | Daily crawl around midnight, JS-sensitive, fragile to layout changes; no near-realtime. Kept only as a fallback (sitemap + SSR product pages already satisfy it). |
| Reuse `middlewares.ServiceAuthMiddleware` for auth | It already reads `X-API-Key`, but its provider set (`telegram`/`bale`/`instagram`) and scope set are closed constants in `models/external_service.go`. Adding Searchwise means editing a model — **forbidden by §2**. Its 300 req/min per-service limiter is also not what a crawler wants. Rejected; the feed does its own auth (§9). |
| Mount the feed on the root mux in `main.go` | Possible (see §6) but needs a `main.go` change; routing `/wp-json/…` through the existing Next rewrite to `/api/snappay/feed` achieves the same public URL with less surface. Kept as the documented alternative. |

---

## 5. Exact contract (authoritative: plugin source v1.0.2)

Line references are to `searchwise-api-data-feed.php` inside source #5.

Endpoint:

```
POST /wp-json/v1/product/feed          (L32–43: namespace "v1", route "product/feed", POST only)
Header: x-api-key: <key>               (L75: $request->get_header('x_api_key'))
```

Request parameters (JSON body, form, or query — WP reads them uniformly):

| Param | Type | Notes |
|---|---|---|
| `limit` | int | Code default **100** (L103); the Readme says 10. We use 100 and clamp to a sane max. |
| `page` | int | Default 1 (L104). |
| `products` | string | Comma-separated IDs → targeted refresh. |
| `slugs` | string | Comma-separated slugs → targeted refresh. |
| `include_content` | bool | Adds a full `content` string per product. |

Response envelope:

```json
{
  "count": 128,
  "max_pages": 2,
  "products": [ { ... } ],
  "plugin_version": "1.0.2",
  "wc_version": "not_installed",
  "wp_version": ""
}
```

- `count` / `max_pages` are present **only** on the all-products query (L140–141);
  the `products=` / `slugs=` paths omit them.
- `plugin_version`, `wc_version`, `wp_version` are **always** emitted (L118–121);
  `wc_version` falls back to the literal `"not_installed"` when WooCommerce is
  absent. **We emit all three** — `wc_version: "not_installed"`, `wp_version: ""` —
  so a parser that reads them never sees a missing key. (The previous revision of
  this plan proposed omitting them; that was wrong about the plugin's behavior.)

Product object as actually emitted by the code (this overrides the Readme and the
academy field list wherever they disagree):

| Field | Source in plugin | Notes |
|---|---|---|
| `id` | L191 `get_id()` | must be unique per row |
| `slug` | L192 `get_slug()` | the key `slugs=` looks up |
| `title` | L193 `get_name()` | |
| `regular_price` / `sale_price` | L200–227 | variable product → first **in-stock** variation, else min variation price |
| `availability` | L230 `get_stock_status()` | emits `instock` / `outofstock` / `onbackorder` — **not** "in stock" |
| `category` | L231 | array of term names |
| `image_link` | L232, L297–321 | array of **full-size** URLs, featured image first, then gallery |
| `link` | L233 | permalink |
| `short_description` | L234 | string |
| `description` | L235, L247–283 | **object** attribute→value; variation attributes skipped; 1 value → string, >1 → array |
| `shipping_cost` | L238 | float |
| `delivery_time` | L239 | int |
| `brand` | L240 | string |
| `content` | L195–197 | only when `include_content=true` |

Naming discrepancies across the three artifacts — resolved by emitting **every**
spelling (duplicate keys are free and remove the guesswork):

| Concept | Plugin code | Plugin Readme example | Academy field list | We emit |
|---|---|---|---|---|
| shipping cost | `shipping_cost` | `cost_shipping` | `cost_shipping` | **both** |
| delivery time | `delivery_time` | `time_delivery` | `delivery_time` | **all three** |
| availability | `instock`/`outofstock` | `instock` | "in stock"/"out of stock" | `instock`/`outofstock`, switchable by env (§10) |

Fields the academy list mentions that the plugin never emits — we treat them as
optional and emit the ones we can source honestly:

| Field | Decision |
|---|---|
| `color` | **emitted** — the variant's `color_name` (§7). |
| `size` | **emitted** — that variant's in-stock size codes. |
| `GTIN` | omitted — not tracked in the catalog, and the plugin does not emit it. |
| `subtitle` | omitted by default — no separate English name exists on the product. Trivial to add later from an attribute if SnappPay asks. |

Auth behavior in the plugin (L46–86):

- Missing/invalid key → `401`; validation server unreachable → `503`; valid → `200`.
- Validation call body: `merchant_domain`, `api_key`, `plugin_version`.

Other verified behavior: only `publish` products; ordering `ID DESC` (L133–134);
unknown `products`/`slugs` entries are silently skipped, not errors (L157–181); there
is no separate single-product route.

---

## 6. Architecture (no schema/model changes)

```
Searchwise crawler
      │  POST https://voxcina.com/wp-json/v1/product/feed   (x-api-key)
      ▼
nginx   location = /wp-json/v1/product/feed   ← exact match, evaluated first
      │     proxy_pass http://localhost:8080/api/snappay/feed
      │                                         PRODUCTION FAST PATH: one hop,
      │                                         edge → Go, Node uninvolved
      │
      └─ (block absent: local dev / not yet deployed)
         nginx location /  →  Next :3000  →  rewrite  →  Go
      ▼
Go      POST /api/snappay/feed          (routes.go, existing /api subrouter)
      ▼
snappayfeed/
  ├─ request.go     parameter parsing (JSON body → form → query)
  ├─ auth.go        static env key, then Searchwise validate-token
  ├─ repository.go  read-only Mongo: products ($unwind per variant) + categories
  ├─ mapping.go     pure helpers (product + color variant → values)
  ├─ rows.go        feed rows, both granularities
  └─ handler.go     JSON response, Cache-Control: no-store
```

**Why two paths.** `location = …` is an exact match, which nginx evaluates before
every prefix and regex location — so the feed adds zero matching cost to any other
request and skips Node entirely. The Next.js rewrite is kept deliberately as the
fallback: it makes `npm run dev` work with no nginx, and keeps the public URL alive
on a host whose nginx config has not been updated yet. Both target the same Go
route, so they coexist with no ambiguity.

### Why `/api/snappay/feed` and not a root route (correction)

`main.go` builds a plain `http.ServeMux` and mounts the gorilla router **only** at
`/api/`:

```go
mainMux.Handle("/api/", apiRouter)     // main.go:196
mainMux.Handle("/admin/", …)
mainMux.Handle("/uploads/", …)
```

So a `router.HandleFunc("/wp-json/v1/product/feed", …)` registered inside
`routes.NewRouter()` would **never receive a request** — the mux does not forward
that prefix. (The previous revision of this plan proposed exactly that; it would
have 404'd.) Two ways to fix it:

- **Chosen:** register `POST /api/snappay/feed` on the existing `/api` subrouter and
  let a Next rewrite publish it at the WooCommerce-identical public URL. No
  `main.go` change, no new mux prefix, and the endpoint is directly curl-able at
  `/api/snappay/feed` for debugging.
- Alternative (if SnappPay ever needs the Go origin to answer `/wp-json` directly,
  bypassing Next): add `mainMux.Handle("/wp-json/", apiRouter)` in `main.go` plus a
  root-level route. Documented here; not part of this plan.

### Next.js rewrite (correction)

`front_end/next.config.js` has **no catch-all `/(.*)` rewrite** — the `/(.*)` source
lives in `headers()`, not `rewrites()`. The current rewrite list is `/uploads/:path*`,
the `x-skip-rewrite` Postex rule, and `/api/:path((?!postex|revalidate|tryon/negotiate|tryon/negotiate-stream).*)`.
Add one entry (order is not critical, but keep it above the `/api/*` rule for
readability):

```js
{ source: '/wp-json/v1/product/feed', destination: `${backendUrl}/api/snappay/feed` },
```

`front_end/src/proxy.ts` matches only `/uploads/:path*` and `/_next/image`, so there
is no conflict.

### nginx

Both committed configs send `location /` to Next on `:3000`, so `/wp-json/…` reaches
the rewrite with no nginx change:

- `nginx-voxcina-optimized.conf` — `location /api/` goes **straight to Go:8080**, so
  `/api/snappay/feed` is reachable origin-direct too (useful for verification).
- `nginx-voxcina-optimized-v2.conf` — everything but static assets goes to Next.

Confirm which file is live on the VPS before onboarding, and check that neither
strips the `x-api-key` request header (default nginx `proxy_pass` forwards it).

### Code placement

- `snappayfeed/` — the whole feature in its own package (handler, DTOs, mapping
  helpers, queries, auth), so removal is `rm -rf` plus three call sites.
- `snappayfeed/*_test.go` — pure unit tests, no Mongo/network (the repo's rule:
  every committed Go test is dependency-free — `AGENTS.md`).
- `routes/routes.go` — one line: `api.HandleFunc("/snappay/feed", handlers.SnappPaySearchFeed).Methods(http.MethodPost)`.
  The path is free: the existing SnappPay **payment** routes sit under
  `/api/payment/snappay/*` (auth-gated `paymentRouter`) and `/api/admin/orders/…`,
  so nothing collides and the public feed stays outside every auth subrouter.
  Register it away from `/{id}`-style wildcards; `routes/routes_shadow_test.go`
  asserts no literal route is shadowed.
- `front_end/next.config.js` — one rewrite entry (fallback path).
- `nginx-voxcina-optimized.conf`, `nginx-voxcina-optimized-v2.conf` — one
  exact-match location block each (production fast path).

Explicitly **not** touched: `models/*`, `db/*`, Mongo indexes, migrations, product
documents, admin/product APIs, `/api/products*`, the storefront.

---

## 7. Catalog → feed mapping: color variants and per-variant inventory

### 7.1 Granularity: one row per color variant

**Decision: the feed emits one row per color variant** (`SNAPPAY_FEED_GRANULARITY=variant`,
the default), with a product-level mode kept behind the same env var as an escape
hatch (§7.7).

Grounds:

- The storefront is already variant-first. `ListProducts` paginates **per color
  variant** (`$unwind` over `color_variants` inside a `$facet`, `AGENTS.md`), the
  list API returns `ColorVariantListItem` rows, and `ProductCard` / `ProductGridItem`
  link to `/products/{productId}?variant={variantId}` (falling back to `?color=`).
  A variant-level feed is a 1:1 mirror of the site — a product-level feed would be a
  *different*, coarser catalog than the one customers browse.
- SnappPay's naming rules (source #2) require the color/variant in the title and
  explicitly list "omitting variant specifics (color, size, model)" as a mistake.
  Their own good example is «پیراهن آستین‌کوتاه مردانه کتون **زرد** اورسایز».
- Source #4: out-of-stock rows are penalized. With product-level rows, one in-stock
  color makes the whole product look available and a customer can land on a sold-out
  color; with variant rows, a sold-out color drops out on its own and the rest keep
  ranking.
- Every field needed already exists on `ColorVariant` — **no schema change**
  (`variant_id`, `color`, `color_name`, `images`, `sizes[].quantity`).

What the customer sees in the SnappPay app: each color is its own search card, with
that color's photo, that color's stock state, and a link that opens the product page
already switched to that color. Identical to Voxcina's own product grid.

### 7.2 Row identity and link

| Feed field | Value |
|---|---|
| `id` | `{productID}-{variantKey}` — e.g. `6712ab…c3-9f4e…21`. Unique per row (source #3's first rule), stable across crawls, and reversible back to the product. |
| `slug` | `{variantKey}` — what a `slugs=` refresh sends back to us. |
| `link` | `{APP_URL}/products/{productID}?variant={variantID}` — the exact deep link the storefront already emits. |

`variantKey` resolution (no DB write, mirrors `front_end/src/lib/product-variants.ts`):

1. `ColorVariant.VariantID` when present — the normal case.
2. Otherwise a deterministic surrogate: first 12 hex chars of
   `sha256(productID + "|" + color + "|" + colorName)`, and the link falls back to
   `?color={color|colorName}` — the same fallback `ProductGridItem` uses.

Case 2 exists because `EnsureColorVariantIDs` only stamps IDs on **write**
(`handlers/variant_helpers.go`), so a product not re-saved since that field landed
can still have empty `variant_id`. The feed must **not** backfill it (§2.4); the
surrogate is stable as long as the color values are, and the row silently upgrades to
the real `variant_id` the next time an admin saves the product.

### 7.3 Per-variant inventory → `availability`

```
availability(product, variant) =
    "instock"    if product.is_active AND Σ variant.sizes[i].quantity > 0
    "outofstock" otherwise
```

Computed from **that variant's own sizes only** — never from the product-level
`in_stock` flag (which is the aggregate across all colors) and never from another
color's stock. `onbackorder` is never emitted (the catalog has no backorder concept).

Optional `SNAPPAY_FEED_SKIP_OUT_OF_STOCK=true` drops sold-out rows entirely instead
of marking them; default `false` (marking is truthful and lets SnappPay keep the URL
warm for when it restocks).

### 7.4 Full field mapping

All prices are converted **Toman → Rials (×10)**, per the academy's "prices in rials".

| Feed field | Mapping |
|---|---|
| `id` | `{productID}-{variantKey}` (§7.2) |
| `slug` | `{variantKey}` |
| `title` | `Product.Name` + " " + `ColorVariant.ColorName`, skipping the suffix when the name already contains that color name. Satisfies source #2's "include the variant in the title". |
| `regular_price` | `(OriginalPrice > 0 ? OriginalPrice : Price) × 10`, integer Rials |
| `sale_price` | `Price × 10`, integer Rials |
| `availability` | §7.3 — **this variant only** |
| `category` | Breadcrumb strings from `CategoryIDs` walked up the `parent_id` chain, e.g. `"زنانه > پوشاک > بامبر"` (source #3 demands hierarchical categories); falls back to the plain category name when no parent resolves |
| `image_link` | `ColorVariant.Images` first (this color's own photos), then `Product.MainImages` as filler, deduped in order, each made absolute against `APP_URL`. `SwatchImage` and `TryOnImage` are excluded — they are not product photos. Source #3: full-size only, never thumbnails |
| `link` | `{APP_URL}/products/{productID}?variant={variantID}` |
| `short_description` | `Product.Description`, plain-texted and truncated |
| `description` (object) | `Product.Attributes` (name→value) **plus** `"رنگ"` = this variant's `ColorName` (single string) and `"سایز"` = this variant's in-stock size codes (string if one, array if several). Same single-vs-array rule as the plugin |
| `color` | this variant's `ColorName` |
| `size` | this variant's in-stock size codes (array) |
| `brand` | `Product.Brand` (already denormalized on the document) |
| `shipping_cost` + `cost_shipping` | `0` — shipping is quoted dynamically per cart via Postex; the plugin likewise emits 0 when the meta is absent |
| `delivery_time` + `time_delivery` | `0`, same rationale |
| `content` | `Product.Description`, only when `include_content=true` |
| `GTIN`, `subtitle` | omitted (§5) |

### 7.5 Query, pagination and targeted refresh

- Filter: `is_active: true`. Sort `_id` DESC (mirrors the plugin's ID DESC), then
  `$unwind: "$color_variants"` — array order is preserved, so row order is stable.
- Pagination is over **variant rows**, not products, using the same `$facet` shape
  `ListProducts` already uses (count branch: `$unwind` + `$count`; rows branch:
  `$unwind` + `$skip` + `$limit`) — one round trip, and `count` / `max_pages` are
  then honestly the variant-row totals.
- `products=` accepts a product ID (→ all of its variant rows) **or** a composite
  `{productID}-{variantKey}` (→ that one row). `slugs=` accepts a `variantKey`.
  Unknown/invalid entries are skipped silently, exactly like the plugin. This is the
  hot-product fast-refresh path.
- `limit` default 100 (clamped, e.g. max 500), `page` default 1; invalid values fall
  back to the defaults. `include_content` accepts a JSON boolean or `true/1/yes`.

### 7.6 Invariants the implementation must hold

- The handler issues **only** `Find`/`Aggregate` — no `Insert`, `Update`, `Delete`,
  no index creation.
- No file under `models/` or `db/` appears in the diff.
- Every feed-specific field lives in a DTO struct inside `handlers/snappay_feed.go`;
  no feed concern leaks into `models.Product`.
- Mapping helpers are pure functions of `(models.Product, models.ColorVariant,
  baseURL, categoryPaths)` → values, so they are unit-testable without Mongo.

### 7.7 Product-level mode (escape hatch)

`SNAPPAY_FEED_GRANULARITY=product` switches to one row per product: `id` =
`productID`, `link` = `/products/{id}`, `availability` aggregated across **all**
colors and sizes, `image_link` = `MainImages` + every variant's images deduped,
`description["رنگ"]` = all color names, `description["سایز"]` = all size codes. Same
handler, same helpers, one branch — so if Searchwise says their ingester expects
product-level rows, it is an env-var flip and a restart, not a rewrite.

---

## 8. Tasks

### Phase 1 — Feed endpoint (Go)

- [x] `handlers/snappay_feed.go`: DTO structs (`snappPayFeedResponse`,
      `snappPayFeedRow`) with the exact snake_case JSON tags from §5, including the
      duplicate `cost_shipping` / `time_delivery` aliases. No `models/` change.
- [x] `SnappPaySearchFeed(w, r)`:
  - [x] parse params: JSON body → form → query (uniform precedence);
  - [x] `limit`/`page` defaults + clamps; `include_content` parser;
  - [x] all-rows path with variant-aware `count` / `max_pages`;
  - [x] `products=` / `slugs=` targeted path (skip unknowns, omit count keys);
  - [x] `Cache-Control: no-store`.
- [x] Pure mapping helpers (no Mongo, no network):
  - [x] `snappPayFeedPrice(toman float64) int64` (×10, rounding);
  - [x] `snappPayVariantKey(productID string, v models.ColorVariant) (key, linkParam)`;
  - [x] `snappPayVariantAvailability(p models.Product, v models.ColorVariant) string`;
  - [x] `snappPayVariantTitle(p models.Product, v models.ColorVariant) string`;
  - [x] `snappPayVariantImages(p models.Product, v models.ColorVariant, baseURL string) []string`;
  - [x] `snappPayVariantDescription(p models.Product, v models.ColorVariant) map[string]any`;
  - [x] `snappPayInStockSizes(v models.ColorVariant) []string`;
  - [x] `snappPayFeedCategoryPaths(ctx, ids) map[string]string` (breadcrumbs via
        `parent_id`, resolved once per request, read-only);
  - [x] product-level variants of availability/images/description for §7.7.
- [x] Aggregation: `$match {is_active:true}` → `$sort {_id:-1}` → `$facet` with
      `$unwind: "$color_variants"` in both branches; exclude
      `color_variants.ai_metadata` and `search_metadata` by their **BSON** names.
- [x] Use `APP_URL` as the public origin (the pattern `handlers/payment.go` and
      `handlers/snappay.go` already follow); production must be `https://voxcina.com`.

### Phase 2 — Exposure

- [x] `routes/routes.go`: one import + `snappayfeed.Register(api)`.
- [x] `front_end/next.config.js`: add the `/wp-json/v1/product/feed` rewrite.
- [x] `go test ./routes -run TestNoShadowedRoutes -count=1` to confirm no shadowing.
- [x] Add the exact-match `location = /wp-json/v1/product/feed` block to both
      committed nginx configs (production fast path, bypasses Node).
- [ ] **Ops:** deploy the updated nginx config to the VPS, `nginx -t && nginx -s reload`,
      and confirm `x-api-key` survives the hop. Until then the Next rewrite serves
      the public URL, one hop slower.

### Phase 3 — Auth

- [x] Read `x-api-key` (Go canonicalizes the header, so the plugin's lowercase
      spelling matches); missing → `401`.
- [x] Static mode: compare with `SNAPPAY_FEED_API_KEY` using `crypto/subtle`
      (constant-time) — lets us test before Searchwise provisions a key.
- [x] Searchwise mode (exact plugin behavior): POST `merchant_domain`, `api_key`,
      `plugin_version=1.0.2` to `SNAPPAY_FEED_VALIDATE_URL` (default
      `https://merchants.searchwise.ir/api/v1/feed/validate-token`), 5s timeout;
      `{success:true}` → allow, explicit failure → `401`, network failure → `503`.
- [x] Precedence: a static-key match short-circuits; otherwise Searchwise validation.
- [x] Never log the presented key. Cache a successful validation briefly (≤60s) so a
      paginated crawl does not fan out one validation call per page.

### Phase 4 — Tests (`handlers/snappay_feed_test.go`, no Mongo/network)

- [x] envelope: `plugin_version` / `wc_version` / `wp_version` always present;
      `count`/`max_pages` present for the all-rows path and absent for targeted;
- [x] a 3-color product expands to exactly 3 rows with 3 distinct `id`s and 3
      distinct `link`s;
- [x] per-variant availability: color A in stock + color B at zero → `instock` /
      `outofstock` on the respective rows (the core variant guarantee);
- [x] `variant_id` missing → deterministic surrogate key + `?color=` link, and the
      same input twice yields the same `id`;
- [x] Toman→Rial conversion, including `OriginalPrice == 0`;
- [x] images: this color's images first, swatch/try-on excluded, deduped, absolute;
- [x] description object: attributes + رنگ/سایز, single-vs-array rule;
- [x] `size`/`color` top-level fields list only in-stock sizes;
- [x] category breadcrumbs from a fake category map;
- [x] param parsing: `limit`/`page` defaults, `include_content` forms, comma lists,
      composite `{productID}-{variantKey}` lookups;
- [x] auth: missing key → 401, static match → pass;
- [x] `SNAPPAY_FEED_GRANULARITY=product` → one aggregated row for the same fixture.
- [x] Run `go test ./handlers -run SnappPayFeed -count=1`, `go test ./routes -count=1`,
      `go vet ./...`.

### Phase 5 — Onboarding (ops, SnappPay/Searchwise side)

- [ ] Submit the search request form (source #6) and tell support/the account
      manager: custom non-WooCommerce store, feed at
      `https://voxcina.com/wp-json/v1/product/feed`, POST + `x-api-key`, request a
      key and Searchwise validation registration for `voxcina.com`.
- [ ] Give them the **apex** URL, never `www.voxcina.com`: that vhost answers with
      a `301` to the apex, and HTTP clients commonly downgrade a redirected `POST`
      to `GET`, which the route rejects (405). Switching that redirect to `308`
      would preserve the method, but it is a site-wide change and not required if
      the registered URL is the apex.
- [ ] Submit the CMS/technology-change form (source #7) so their records do not
      assume WooCommerce.
- [ ] Ask the questions in §11 — above all, confirm that variant-level rows are what
      they want (§7.1) and that string IDs are accepted.
- [ ] Whitelist the four SnappPay IPs (`185.206.93.115`, `185.206.94.25`,
      `37.152.176.176`, `188.121.106.231`) in **ArvanCloud WAF/bot rules** (origin
      `ufw` already allows 80/443 broadly).
- [ ] Confirm the catalog clears their 60-product minimum — count **variant rows**,
      which is the larger number.
- [ ] Content task (not code): apply the academy naming rules to weak product names
      (e.g. `بامبر کتان - F3330` lacks type/gender keywords). The feed appends the
      color automatically, but the base name still has to carry type + brand.
- [ ] Notify support if the feed URL ever changes (source #3's rule).

### Phase 6 — Verification

- [ ] Origin-direct: `curl -X POST http://localhost:8080/api/snappay/feed -H "x-api-key: …" -H 'Content-Type: application/json' -d '{"limit":2}'`
      → envelope, Rial prices, `instock` vocabulary, absolute image URLs,
      one row per color.
- [ ] Targeted: `-d '{"products":"<productHex>"}'` (all its colors) and
      `-d '{"slugs":"<variantKey>"}'` (one color).
- [ ] Negative: no key → 401; unknown ID → skipped, not an error; GET → 405.
- [ ] Through production Next: `POST https://voxcina.com/wp-json/v1/product/feed`.
- [ ] Spot-check a multi-color product against the admin: per-color stock in the feed
      matches per-color stock in the product form, and each `link` opens the site on
      that exact color.
- [ ] After Searchwise provisions the key: confirm their crawler hits the endpoint
      (access log) and the products surface in SnappPay app search.
- [ ] Confirm no regression on `/api/products*` and no DB load spike (one indexed
      `is_active` scan per crawl page; small catalog).

---

## 9. Freshness (near-realtime)

- No caching on the feed path: Go answers `Cache-Control: no-store`, the Next rewrite
  is pass-through, and the handler reads Mongo per request. Source #4 penalizes stale
  inventory, so this is a ranking concern, not just correctness.
- `products=` / `slugs=` give Searchwise a cheap hot-item refresh path, at
  single-color resolution.
- `limit` / `page` let them sync incrementally.
- We cannot push to Searchwise (no notify API is documented), so freshness is bounded
  by their pull frequency — which is exactly what the API method is designed to
  maximize. If they ever document a notify endpoint, product create/update hooks can
  call it later, still with no schema change.

---

## 10. Configuration

| Env var | Required | Purpose |
|---|---|---|
| `APP_URL` | yes (already set in prod) | Public origin for `link` / `image_link`. |
| `SNAPPAY_FEED_API_KEY` | optional | Static `x-api-key` accepted before Searchwise provisioning. |
| `SNAPPAY_FEED_VALIDATE_URL` | optional | Override the Searchwise validate-token URL. |
| `SNAPPAY_FEED_MERCHANT_DOMAIN` | optional | Override the merchant domain sent to Searchwise (default: host of `APP_URL`). |
| `SNAPPAY_FEED_GRANULARITY` | optional | `variant` (default) or `product` — §7.7. |
| `SNAPPAY_FEED_AVAILABILITY_STYLE` | optional | `plugin` (default: `instock`/`outofstock`) or `guide` (`in stock`/`out of stock`) — flips without a redeploy if Searchwise asks. |
| `SNAPPAY_FEED_SKIP_OUT_OF_STOCK` | optional | `true` drops sold-out rows instead of marking them. Default `false`. |

No new Mongo configuration, collections, or indexes.

---

## 11. Open questions for Searchwise/SnappPay

1. **Row granularity** — we send one row per color variant (own URL, own stock, own
   images), matching how the storefront lists products and how their naming rules
   read. Confirm their ingester expects this rather than one row per product. (An env
   flip covers the other answer — §7.7.)
2. **`id` type** — WooCommerce sends integers; ours are `{24-hex}-{hex}` strings.
   Confirm `id` is treated as an opaque string. If a numeric ID is mandatory, we
   derive a stable numeric surrogate in the mapping helper — still no schema change.
3. **Currency** — the academy says Rials; the plugin emits raw store currency. We
   emit Rials (×10 from Toman). Confirm.
4. **`availability` vocabulary** — plugin `instock` vs. academy "in stock". We send
   the plugin's. Confirm which their parser accepts.
5. **URL** — confirm `https://voxcina.com/wp-json/v1/product/feed` is acceptable, or
   give us the exact path you want; the handler can be mounted anywhere.
6. **Refresh contract** — do they use `products=` / `slugs=` for incremental refresh,
   and what crawl frequency / rate limit should we size for?
7. **Out-of-stock rows** — keep them as `outofstock`, or omit them?
8. **`GTIN` / `subtitle`** — confirm both are optional.

---

## 12. Out of scope

- Any DB schema, index, migration, or product-document change.
- Any change to `models.Product` / `ColorVariant` / `SizeVariant`.
- Admin product forms, product APIs, or storefront rendering.
- Search Ads (سرچ ادز) campaigns and ad panels.
- Crawler-specific work beyond the already-satisfied sitemap/SSR/WAF items.

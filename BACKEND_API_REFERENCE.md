# Backend API Reference

Go backend (`net/http` + `gorilla/mux` + MongoDB). Router is built in `routes/routes.go` and mounted at `/api` by `main.go`. The Go process itself listens on port `8080` (`PORT` env), but it is **not** exposed publicly — external clients reach it through the public origin below.

**Scope of this document:** product APIs, the try-on agent, cart, checkout, and the user-specific profile surface (addresses, orders, payments). Admin-only variants are included where they belong to the same resource.

---

## Conventions

### Base URL

```
https://voxcina.com
```

Every path in this document is relative to it — `GET /api/products` is `https://voxcina.com/api/products`. Image fields come back as root-relative paths, so `/uploads/products/main/abc.webp` is `https://voxcina.com/uploads/products/main/abc.webp`.

> No `Access-Control-Allow-Origin` is sent anywhere in the stack, so browser JavaScript served from a **different** origin cannot call this API. Server-to-server, mobile, and same-origin browser calls are unaffected.

### Authentication
`middlewares.AuthMiddleware` (`middlewares/auth.go`) expects:
```
Authorization: Bearer <access_token>
```

Get a token from `POST /api/users/login` (returns `token` + `refreshToken`); renew with `POST /api/users/refresh` (returns `accessToken` + `refreshToken`).

The middleware parses the JWT, then re-reads the user document on **every request** and rejects when `is_active == false` or when `token_version` no longer matches the token's embedded version — so logout, deactivation, role change and password change take effect immediately.

It injects into the request context:
- `userID` → `primitive.ObjectID`
- `role` → `string` (`"customer"` | `"admin"`, read live from Mongo, not from the token)

`AdminAuthMiddleware` wraps it and additionally requires `role == "admin"`.

### Response envelope
There is no global envelope. Handlers write the payload directly (`utils.JSONResponse`).

**Errors** (`utils.ErrorResponse`):
```json
{ "error": "Human-readable message (often Persian)" }
```

**Auth errors** (`utils.AuthErrorResponse`) add a machine code:
```json
{ "error": "Token expired", "code": "TOKEN_EXPIRED" }
```

### Money & dates
- Prices are stored/returned in **Toman** as `float64`.
- Payment gateways are called in **Rials** — `RequestPayment` converts with `order.TotalAmount * 10`.
- Order responses carry both ISO timestamps and Jalali strings (`jalali_created_at`, `jalali_updated_at`).
- User-typed numeric fields (postal code, phone, address text) are normalised from Persian/Arabic-Indic digits to ASCII on write (`Address.NormalizeDigits`).

### Core object: the color variant
A `Product` holds `color_variants[]`. Each `ColorVariant` has its own images, try-on image, swatch, and per-size inventory. The **list** endpoints do not return products — they flatten every product into one row **per color variant** (`ColorVariantListItem`), because the storefront grid treats each color as its own card.

```jsonc
// ColorVariant
{
  "variantId": "665f...",           // stable identity, used as cart/stock key
  "color": "#1B1B1B",
  "colorName": "مشکی",
  "swatchImage": "/uploads/products/swatch/...",
  "images": ["/uploads/products/colors/..."],
  "tryOnImage": "/uploads/products/tryon/...",
  "tryOnGarmentType": "upper_body",  // upper_body | lower_body | dresses
  "sizes": [ { "size": "L", "sku": "SKU-L-BLK", "quantity": 4 } ],
  "aiMetadata": { /* AI-generated search fields, see below */ }
}
```

`aiMetadata` (`VariantAIMetadata`) is written only by the AI metadata generator, never by hand: `productTypePersian`, `productTypeStandard`, `materialPersian`, `stylePersian`, `patternPersian`, `fitType`, `colorFamily`, `season[]`, `gender`, `keywords[]`, `tags[]`, `occasionTags[]`, `embeddingVector[]`, `embeddingModel`, `confidence`, `updatedAt`.

---

# 1. Product APIs

## 1.1 Public catalog

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/api/products` | — | `ListProducts` |
| GET | `/api/products/trending` | — | `GetTrendingProductVariants` |
| GET | `/api/products/{id}` | — | `GetProduct` |
| GET | `/api/products/collection/{collectionValue}` | — | `GetProductsByCollection` |
| GET | `/api/products/search?q=` | — | `SearchProducts` |
| GET | `/api/products/recommendations` | — | `ProductRecommendations` |
| GET | `/api/products/smart-recommendations?q=` | — | `EnhancedProductRecommendations` |
| GET | `/api/products/{productId}/reviews` | — | `GetReviews` |
| POST | `/api/products/{productId}/reviews` | Bearer | `AddReview` |
| GET | `/api/search/suggestions?q=` | — | `SearchSuggestions` |
| GET | `/api/search/suggestions/smart?q=` | — | `GetSearchSuggestions` |
| POST | `/api/search/smart` | — | `SmartSearch` |
| GET | `/api/categories`, `/api/categories/{id}`, `/api/categories/{id}/products`, `/api/categories/homepage` | — | categories |
| GET | `/api/brands`, `/api/brands/{id}` | — | brands |

---

### `GET /api/products`

Paginated **color-variant** listing.

**Query parameters**

| Param | Type | Notes |
|---|---|---|
| `page` | int | default `1` |
| `limit` | int | default `20` — counts variant cards, not products |
| `search` | string | case-insensitive regex on `name` + `description` |
| `category` / `categoryId` | string | ObjectID, or falls back to a category **name** lookup |
| `brand` | string | exact brand name |
| `brandId` | string | ObjectID |
| `is_flash_sale` | `"true"` | |
| `in_stock` | `"true"` | |
| `is_new` | `"true"` | legacy alias for `sort=newest` |
| `sort` | enum | `newest` \| `price-asc` \| `price-desc` \| `popular` \| `discount` |

`is_active: true` is always forced.

**Response `200`**
```jsonc
{
  "data": [
    {
      "productId": "664a1f...",
      "colorVariant": { /* ColorVariant, see above */ },
      "name": "تیشرت اورسایز",
      "description": "...",
      "price": 890000,
      "originalPrice": 1200000,
      "brand": "Voxcina",
      "brand_id": "664a...",
      "category_ids": ["664b..."],
      "collection": "تابستان",
      "is_flash_sale": false,
      "average_rating": 4.5,
      "review_count": 12,
      "created_at": "2026-05-01T10:00:00Z",
      "totalInventory": 14,          // sum of this color's sizes
      "inStock": true
    }
  ],
  "pagination": {
    "totalPages": 7,
    "currentPage": 1,
    "nextPage": 2,                   // omitted on last page
    "prevPage": null,                // omitted on first page
    "totalItems": 132,
    "totalColorVariants": 132        // same value, kept for API compatibility
  }
}
```

> **Pagination semantics:** filtering and sorting happen in Mongo at the *product* level, but pagination is applied **after** flattening to variants, in Go. A page boundary can therefore land in the middle of one product's colors — intentional, since each color is an independent card. Note this means the full filtered product set is loaded into memory per request.

DB/decode failures degrade to `200` with `{"data": [], "pagination": {}}` rather than a 5xx.

---

### `GET /api/products/{id}`

**Response `200`** — the full `Product` document:
```jsonc
{
  "id": "664a1f...",
  "name": "تیشرت اورسایز",
  "description": "...",
  "price": 890000,
  "originalPrice": 1200000,
  "mainImages": ["/uploads/products/main/..."],
  "colorVariants": [ /* ColorVariant[] */ ],
  "category_ids": ["664b..."],
  "brand_id": "664c...",
  "brand": "Voxcina",
  "collection": "تابستان",
  "weight": 320,                     // grams, product-level; 0 when unset
  "attributes": [ { "name": "جنس", "value": "پنبه" } ],
  "is_flash_sale": false,
  "is_active": true,
  "inStock": true,                   // recomputed at read time across all variants
  "created_at": "...",
  "updated_at": "...",
  "average_rating": 4.5,
  "review_count": 12,
  "searchMetadata": { /* ProductSearchMetadata incl. embeddingVector */ }
}
```
`404 { "error": "Product not found" }` when missing or `is_active: false`.
`400 { "error": "Invalid product ID" }` on a malformed ObjectID.

Size strings are digit-normalised on the way out, and `inStock` is derived live rather than trusted from the stored flag.

---

### `GET /api/products/trending`

Top 10 most-viewed **variants**, hydrated against the live catalog so deleted products and stale variant IDs never surface.

**Response `200`**
```jsonc
{
  "data": [
    {
      "productId": "664a...",
      "colorVariant": { ... },
      "name": "...", "price": 890000, /* …same shape as /api/products rows… */
      "totalInventory": 14,
      "inStock": true,
      "viewCount": 4210,
      "rank": 1
    }
  ]
}
```
Source collection is `product_variant_views` (`ProductVariantView`: `product_id`, `variant_id`, `view_count`, `first_viewed_at`, `last_viewed_at`). Sorted by `view_count desc, last_viewed_at desc, variant_id asc`. Any error degrades to `{"data": []}`.

---

### `GET /api/products/collection/{collectionValue}`

`collectionValue` is a season: `بهار` | `تابستان` | `پاییز` | `زمستان`.

Same query params as `/api/products` (`page`, `limit`, `sort`, `in_stock`/`inStockOnly`), same `ColorVariantListItem[]` + `pagination` response shape.

> Pagination here is applied at the **product** level in Mongo (`skip`/`limit`) and `totalPages` is computed from the product count, then rows are flattened to variants afterwards — so a page can return more rows than `limit`. This differs from `/api/products`, which paginates the flattened rows.

---

### `GET /api/products/{productId}/reviews`

**Response `200`** — approved reviews only, newest first:
```jsonc
[
  {
    "id": "664d...",
    "user_id": "664e...",
    "user_name": "علی",
    "product_id": "664a...",
    "rating": 5,
    "comment": "عالی بود",
    "isRecommended": true,
    "status": "approved",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

### `POST /api/products/{productId}/reviews` — Bearer

**Request**
```json
{ "rating": 5, "comment": "عالی بود", "isRecommended": true }
```
`rating` must be 1–5. Product must exist and be active.

**Response `201`** — the created `Review` (created with `status: "pending"`, so it is invisible to `GET /reviews` until an admin approves it via `PUT /api/admin/reviews/{reviewId}/status`).

Related: `PUT /api/reviews/{reviewId}`, `DELETE /api/reviews/{reviewId}` (owner or admin), `GET /api/users/{userId}/reviews` (public).

---

### Search & AI search

**`GET /api/search/suggestions?q=`** → `[{ "name": "..." }]` — regex on product name, unbounded (no limit, no `is_active` filter).

**`GET /api/search/suggestions/smart?q=`** → `["نام محصول", "برند", ...]` — flat strings, max 10, drawn from name/description/brand of active products. Returns `[]` when `q` is shorter than 2 characters.

**`POST /api/search/smart`**
```json
{ "query": "یه تیشرت خنک تابستونی", "user_id": "optional" }
```
```jsonc
{
  "ai_response": "برای تابستان این‌ها رو پیشنهاد می‌کنم…",
  "products": [ /* full Product[] */ ],
  "success": true,
  "is_ai_generated": true,
  "search_query": "یه تیشرت خنک تابستونی"
}
```

**`POST /api/chat/recommend`** and **`POST /api/chat/support`** are the conversational siblings (see `handlers/ai_recommendations.go`), with chat persistence under `/api/chat/*`.

---

## 1.2 Admin product management

All under `AdminAuthMiddleware`.

| Method | Path | Handler |
|---|---|---|
| GET | `/api/admin/products?active_only=true` | `AdminListProducts` |
| POST | `/api/admin/products` | `AddProduct` |
| PUT | `/api/admin/products/{id}` | `UpdateProduct` |
| DELETE | `/api/admin/products/{id}` | `DeleteProduct` |
| GET | `/api/admin/products/{id}/cart-usage` | `GetProductCartUsage` |

`GET /api/admin/products` returns a bare `Product[]` (full documents, inactive included) — **not** the variant-flattened shape.

### `POST /api/admin/products` — `multipart/form-data`

Max upload 10 MB; max 10 main images; max 5 images per variant.

**Text fields**

| Field | Required | Notes |
|---|---|---|
| `name` | ✔ | falls back to `searchMetadata.namePersian` when empty |
| `description` | | falls back to `searchMetadata.descriptionPersian` |
| `price` | ✔ | accepts Persian digits and grouping separators |
| `originalPrice` | | defaults to `price` |
| `weight` | | grams, must be ≥ 0 |
| `categoryIds` | ✔ | JSON array of ObjectID strings |
| `brandId` | ✔ | must resolve to an existing brand |
| `collection` | | one of `بهار` `تابستان` `پاییز` `زمستان` |
| `gender` | | default for variant AI metadata |
| `colorVariants` | | JSON array of `ColorVariant` |
| `variantAIMetadata` | | JSON array, index-aligned to `colorVariants` |
| `attributes` | | JSON array of `{name, value}` |
| `searchMetadata` | | JSON `ProductSearchMetadata` |
| `isFlashSale`, `isActive`, `inStock` | | booleans; `isActive`/`inStock` default `true` |

**File fields** — variant files are indexed by the variant's position in `colorVariants`:

| Field | Cardinality |
|---|---|
| `mainImages` | ≤ 10 |
| `colorImages_{i}` | ≤ 5 per variant |
| `colorTryOn_{i}` | 1 |
| `colorSwatch_{i}` | 1 |
| `colorTryOnGarmentType_{i}` | text field, not a file |

**Response `201`** — the created `Product`.

Side effects: an embedding is generated for the product and for each variant, and both are best-effort upserted into FAISS. Failures there are logged, never fatal. On a DB insert failure the uploaded files are cleaned up.

`PUT /api/admin/products/{id}` accepts the same multipart fields (all optional — only provided fields are updated), plus `mainImageOrder` and `colorImageOrder_{i}` JSON arrays for reordering.

**Update/delete responses carry cart fallout.** When an edit or delete changes what shoppers can buy, live carts are reconciled and the summary is attached:
```jsonc
// PUT response = the full saved Product, plus:
{ "...product fields...": "...",
  "cartReconciliation": { "cartsChanged": 3, "itemsRemoved": 1, "itemsReduced": 2 } }

// DELETE response
{ "message": "...", "cartReconciliation": { "cartsChanged": 3, "itemsRemoved": 4, "itemsReduced": 0 } }
```

### `GET /api/admin/products/{id}/cart-usage`
```json
{ "product_id": "664a...", "carts": 3 }
```
Counts active carts still holding the product; the admin form disables saving while this is non-zero so a shopper's cart cannot change under them.

---

## 1.3 Categories & brands

**Public reads:** `GET /api/categories`, `/api/categories/homepage`, `/api/categories/{id}`, `/api/categories/{id}/products`, `GET /api/brands`, `/api/brands/{id}`.

**Admin writes** (`AdminAuthMiddleware`): `POST /api/admin/categories`, `PUT|DELETE /api/admin/categories/{id}`, `POST /api/admin/brands`, `PUT|DELETE /api/admin/brands/{id}`.

```jsonc
// Category
{ "id": "...", "name": "پیراهن مردانه", "slug": "mens-shirts", "parent_id": "...",
  "description": "...", "image": "...", "avatar": "/uploads/avatars/categories/shirt.svg",
  "is_active": true, "show_in_header": true, "created_at": "...", "updated_at": "..." }

// Brand
{ "id": "...", "name": "Voxcina", "slug": "voxcina", "logo": "...",
  "description": "...", "isActive": true, "createdAt": "...", "updatedAt": "..." }
```

## 1.4 Vocabulary

`GET /api/vocabulary-mappings` — public, feeds the admin/product form dropdowns.

## 1.5 Route ordering invariant

`gorilla/mux` matches in **registration order**, so every literal path under a resource must be registered *before* that resource's `{id}` wildcard. Registering `/products/{id}` first makes `/products/search` dead code — the request is handed to `GetProduct` with `id="search"`, which answers `400 Invalid product ID`.

This had silently disabled four endpoints (`/products/search`, `/products/recommendations`, `/products/smart-recommendations`, `/categories/homepage`). All four are now registered above their wildcards and reachable.

Because the defect is invisible in review — both routes look correctly registered — it is asserted instead. `routes/routes_shadow_test.go` walks the real router, and fails if any literal path resolves to a different template:

```
$ go test ./routes/ -run TestNoShadowedRoutes
ok  	backEnd/routes
```

**When adding a route:** put literal segments above `{id}`. Paths with a different segment count (`/products/{productId}/reviews`) are unaffected and can go anywhere.

---

# 2. Try-On Agent

Two cooperating subsystems: **image generation** (person photo + garment → AI-composited image) and the **fitting-room chat agent "Voxa"**, which talks about the garment, recommends complements, and negotiates a discount coupon.

All routes under `/api/tryon` require `Bearer` auth.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/tryon/generate` | start a try-on job (multipart) |
| GET | `/api/tryon/status?task_id=` | poll job status |
| GET | `/api/tryon/status-stream?task_id=` | SSE job status |
| GET | `/api/tryon/history` | user's try-on history |
| GET | `/api/tryon/{tryonId}` | one try-on |
| GET | `/api/tryon/sessions` | list fitting rooms |
| GET | `/api/tryon/sessions/{chatId}` | one room + transcript + try-ons |
| DELETE | `/api/tryon/sessions/{chatId}` | soft-delete a room |
| POST | `/api/tryon/sessions/messages` | persist chat turns |
| POST | `/api/tryon/link` | attach a try-on to a room |
| POST | `/api/tryon/negotiate-stream` | SSE seller-agent turn |
| POST | `/api/tryon/apply-negotiated-coupon` | validate + resolve a coupon |

Admin inspection: `GET /api/admin/ai/tryon-chats`, `GET /api/admin/ai/tryon-chats/{chatId}`, and model config at `GET|PUT /api/admin/ai/settings`.

---

## 2.1 `POST /api/tryon/generate` — `multipart/form-data`

Max 10 MB.

| Field | Type | Required | Notes |
|---|---|---|---|
| `person_image` | file | ✔ | the customer's photo |
| `garment_image` | file | ✔* | *required unless `garment_image_url` is given |
| `garment_image_url` | text | ✔* | server fetches it; takes precedence over the file |
| `garment_type` | text | | `upper_body` (default) \| `lower_body` \| `dresses` |
| `garment_product_id` | text | | ObjectID |
| `garment_product_name` | text | | |
| `garment_variant_id` | text | | |
| `garment_color` / `garment_color_name` | text | | |
| `garment_size` | text | | |
| `chat_id` | text | | omit to open a new fitting room |

**Response `200` — immediate, the work is asynchronous:**
```json
{
  "task_id": "…",
  "tryon_id": "…",
  "chat_id": "…"
}
```

**Errors:** `401` not signed in · `400` missing/oversized image, or garment URL fetch failure · `500` read/persist failure.

**What happens server-side:** the person photo is persisted (hashed) under `uploads/tryon/persons/`, a `virtual_tryons` document is created with `status: "processing"`, the try-on is linked to the chat room, and a goroutine calls the image model. Garment facts (type, fit, material) are resolved from the product's variant AI metadata **before** the goroutine starts, because they are read through the request context.

Default image model: `google/gemini-2.5-flash-image` (overridable in admin AI settings). Images are resized to max 1024 px, quality 85, cropped to 3:4 portrait. In-memory tasks have a 30-minute TTL.

## 2.2 `GET /api/tryon/status?task_id=`

```json
{ "status": "processing", "image": "", "error": "" }
```
`status` ∈ `processing` | `done` | `error`. On success `image` is the saved path; on failure `error` holds a Persian message. `404` when the task ID is unknown or has expired out of the in-memory map.

## 2.3 `GET /api/tryon/status-stream?task_id=` — SSE

`Content-Type: text/event-stream`. Polls internally every second, times out after 5 minutes, emits one terminal event and closes:
```
data: {"status":"done","image":"/uploads/tryon/results/….webp","error":""}
```
If the task is already finished when the stream opens, the event is sent immediately.

## 2.4 `GET /api/tryon/history?page=&limit=`

```jsonc
{
  "success": true,
  "tryons": [
    {
      "id": "...", "tryon_id": "...", "user_id": "...",
      "status": "done",
      "task_id": "...",
      "person_image_url": "/uploads/tryon/persons/...",
      "person_image_hash": "...",
      "garment_image_url": "...",
      "garment_product_id": "664a...",
      "garment_product_name": "تیشرت اورسایز",
      "garment_color": "#1B1B1B",
      "garment_size": "L",
      "garment_type": "upper_body",
      "result_image_url": "/uploads/tryon/results/...",
      "prompt_text": "Replace upper garment with…",
      "model_used": "google/gemini-2.5-flash-image",
      "error": "",
      "duration_ms": 8421,
      "created_at": "...",
      "completed_at": "..."
    }
  ],
  "total": 37, "page": 1, "limit": 20, "pages": 2
}
```

`GET /api/tryon/{tryonId}` → `{ "success": true, "tryon": { …same object… } }`. Returns `403` when the try-on belongs to another user, `404` when unknown.

## 2.5 Fitting-room sessions

### `GET /api/tryon/sessions?page=&limit=&include_archived=`
```jsonc
{
  "success": true,
  "sessions": [
    {
      "id": "...", "chat_id": "...", "user_id": "...",
      "title": "اتاق پرو تیشرت",
      "tryon_count": 3, "message_count": 24,
      "user_messages": 11, "agent_messages": 12, "tryon_messages": 3,
      "last_message": "…", "last_message_at": "...",
      "status": "active", "created_at": "...", "updated_at": "..."
    }
  ],
  "total": 5, "page": 1, "limit": 20, "pages": 1
}
```

### `GET /api/tryon/sessions/{chatId}`
```jsonc
{
  "success": true,
  "chat": {
    "id": "...", "chat_id": "...", "user_id": "...",
    "tryon_ids": ["...", "..."],
    "title": "...",
    "messages": [
      { "id": "...", "role": "user",  "content": "این بهم میاد؟", "timestamp": "..." },
      { "id": "...", "role": "agent", "content": "خیلی هم خوب…",
        "model_used": "…", "response_time_ms": 1840,
        "tool_call": { "name": "offer_coupon",
                       "arguments": { "value": 12 },
                       "result": { "code": "TRYN-4F2A", "value": 12 } } },
      { "id": "...", "role": "tryon", "content": "",
        "tryon_data": { "room_number": 2, "before_image": "...", "after_image": "...",
                        "product_id": "664a...", "product_name": "…",
                        "color": "#1B1B1B", "size": "L",
                        "garment_type": "upper_body", "tryon_id": "…" } }
    ],
    "metadata": {
      "total_messages": 24, "user_messages": 11, "agent_messages": 12,
      "tool_messages": 1, "tryon_messages": 3,
      "coupons_offered": ["TRYN-4F2A"], "products_recommended": ["664a..."],
      "first_message_at": "...", "last_message_at": "...",
      "duration_seconds": 640, "device_type": "mobile", "browser": "…", "os": "…"
    },
    "status": "active", "created_at": "...", "updated_at": "..."
  },
  "tryons": [ /* VirtualTryon[] for chat.tryon_ids */ ]
}
```
Message roles: `user` | `agent` | `tool` | `tryon` | `system`. Session status: `active` | `archived` | `deleted`. Returns `404` when the room does not exist **or belongs to another user** (ownership failure is not distinguished from absence).

### `POST /api/tryon/sessions/messages`
```json
{
  "chat_id": "…",
  "messages": [
    { "role": "user", "content": "قیمتش چنده؟" },
    { "role": "agent", "content": "…", "model_used": "…", "response_time_ms": 1200 }
  ]
}
```
Missing `id` and `timestamp` are filled server-side. Side effect: a message whose `tool_call.name == "offer_coupon"` records `result.code` into `metadata.coupons_offered`, and a `tryon_data.product_id` is recorded into `metadata.products_recommended`.

`200` → `{ "success": true, "chat_id": "…", "count": 2 }`

### `DELETE /api/tryon/sessions/{chatId}`
`200` → `{ "success": true, "message": "جلسه پرو حذف شد" }`

### `POST /api/tryon/link`
```json
{ "chat_id": "…", "tryon_id": "…" }
```
`200` → `{ "success": true }`

---

## 2.6 The negotiation agent

`POST /api/tryon/negotiate-stream` — SSE. The cart-scoped twin lives at `POST /api/coupons/negotiate-stream` (checkout page; requires `chat_id`).

**Request** — deliberately minimal:
```json
{
  "message": "میشه یه تخفیف بدی؟",
  "tryon_product_id": "664a...",
  "tryon_color": "#1B1B1B",
  "tryon_id": "…",
  "chat_id": "…"
}
```

> **Security model:** only these fields are accepted, and even they are verified to belong to the authenticated user. Everything the agent reasons over — the tried-on garment, the live cart, the chat history, the discount ladder, complementary products — is **rebuilt server-side** from MongoDB into `SellerAgentInput`. A client cannot forge context or inject instructions into the prompt, and the discount percentage never appears in the chat text.

**Response** — `text/event-stream`, one `data:` line per event:

```
data: {"type":"token","text":"باشه، "}
data: {"type":"token","text":"یه کاریش می‌کنم…"}
data: {"type":"done","reply":"باشه، یه کاریش می‌کنم…","coupon":{…},"recommended_product":{…},"catalog_hits":[…]}
```

Event types: `token` (incremental text) · `done` (terminal, carries the decision) · `error`.

```jsonc
// StreamEvent
{
  "type": "done",
  "reply": "…full assistant text…",
  "coupon": {
    "code": "TRYN-4F2A",
    "value": 12,                       // percent
    "valid_until": "2026-09-05T12:00:00Z",
    "product_ids": ["664a...", "664b..."],
    "comp_product_id": "664b...",
    "main_color": "#1B1B1B", "main_color_name": "مشکی",
    "comp_color": "#FFFFFF", "comp_color_name": "سفید"
  },
  "recommended_product": {
    "product_id": "664b...", "product_name": "شلوار جین",
    "price": 1450000, "color": "#2B3A67", "color_name": "سرمه‌ای",
    "size": "32", "image": "/uploads/products/colors/…"
  },
  "catalog_hits": [
    { "product_id": "…", "variant_id": "…", "product_name": "…", "price": 890000,
      "color": "#…", "color_name": "…", "image": "…", "in_stock": true,
      "sizes": ["M","L"], "reason": "…" }
  ]
}
```

The `coupon.reason` and reuse flag are internal (`json:"-"`) and never reach the client. When a turn merely restates the current best price, the existing coupon is reused rather than minting a duplicate code — so a room keeps one consistent deal.

**Negotiation state** is server-authoritative (`NegotiationState`: `GrantCount`, `PrevMaxValue`, `LastReason`, `Floor`, `Ceiling`, `NextStep`). Going above the previous maximum has to be *earned* — the customer must supply a concrete new justification that differs from `LastReason`; simply asking again leaves the band unchanged.

Persistence runs on a fresh `context.Background()` with a 10 s timeout, not the request context, so a client disconnecting mid-stream cannot cancel the coupon/transcript writes.

**Errors:** `401` not signed in · `400` malformed body, empty `message`, or a try-on/room that fails the ownership check. Once the SSE headers are on the wire, failures arrive as `{"type":"error","error":"…"}` with a `200` status.

---

## 2.7 `POST /api/tryon/apply-negotiated-coupon`

Also mounted as **`POST /api/coupons/apply`** — the same handler, used for cart-recovery and checkout coupons too.

**Request**
```json
{
  "code": "TRYN-4F2A",
  "cart_items": [ { "product_id": "664a...", "color": "#1B1B1B", "color_name": "مشکی" } ]
}
```
`cart_items` is a **fallback only**. The handler prefers the server-side cart and ignores the client list whenever a server cart exists, so a stale or forged client cart cannot unlock a coupon.

**Validation rules**
- Coupon must exist, belong to the caller, and be unused (`used: false`).
- Must not be past `valid_until` → `410`.
- If it has `required_products`, an empty cart always fails.
- **Try-on / checkout coupons:** *all* required products must be present, in the negotiated color (any size).
- **`source: "cart_recovery"` coupons:** *at least one* of the original color variants must still be present.

**Response `200`**
```jsonc
{
  "valid": true,
  "discount": {
    "code": "TRYN-4F2A",
    "type": "percentage",
    "value": 12,
    "discountPercentage": 12,
    "min_order_amount": 0,
    "valid_to": "2026-09-05T12:00:00Z",
    "description": "کد تخفیف اختصاصی شما",
    "product_ids": ["664a...", "664b..."],
    "required_products": [
      { "product_id": "664a...", "color": "#1B1B1B", "color_name": "مشکی" }
    ],
    "source": ""
  }
}
```

**Errors:** `400` empty code / empty cart / required-product mismatch · `404` unknown or already-used code · `410` expired.

This endpoint only **validates and resolves**. Marking a coupon consumed is a separate call: `POST /api/discounts/activate` (`{"code": "…"}`), with `POST /api/discounts/deactivate` to release it.

## 2.8 Checkout negotiation chat (cart-scoped twin)

| Method | Path |
|---|---|
| POST | `/api/coupons/negotiate-stream` |
| POST | `/api/coupons/sessions/messages` |
| GET | `/api/coupons/sessions/{chatId}` |

Same request/SSE contract as §2.6, but `chat_id` is **required** and there is no try-on garment — the agent's world is built purely from the cart. Transcripts persist to `CheckoutChat` (roles limited to `user` | `agent`, tool calls limited to `offer_coupon`) and issued coupons carry `source: "checkout_negotiation"`.

---

# 3. User Cart

All routes require `Bearer` auth. One active cart per user (`is_active: true`); replacing a cart deactivates the old one rather than deleting it.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/cart` | fetch the active cart |
| POST | `/api/cart` | create/replace — merges a local cart on login |
| DELETE | `/api/cart` | empty the cart (keeps the cart document) |
| POST | `/api/cart/item` | add or increment one item |
| PUT | `/api/cart/item` | set an item's absolute quantity |
| DELETE | `/api/cart/item?...` | remove one item |

Admin: `GET /api/admin/carts`, `DELETE /api/admin/carts/{cartId}` (soft), `POST /api/admin/carts/send-recovery-sms`.

## 3.1 The cart response

**Every** cart endpoint returns this same object, so the client never has to re-fetch:

```jsonc
{
  "id": "664f...",
  "userId": "664e...",
  "items": [
    {
      "product": {
        "id": "664a...",
        "name": "تیشرت اورسایز",
        "description": "...",
        "price": 890000,
        "originalPrice": 1200000,
        "mainImages": ["..."],
        "colorVariants": [ /* full ColorVariant[] */ ],
        "category_ids": ["664b..."],
        "brand": "Voxcina",
        "brand_id": "664c...",
        "inStock": true,
        "image": "/uploads/products/colors/…"   // legacy: image of the *selected* color
      },
      "variant": {
        "variantId": "665f...",
        "size": "L",
        "color": "#1B1B1B",
        "colorName": "مشکی",
        "sku": "SKU-L-BLK"
      },
      "quantity": 2
    }
  ],
  "summary": {
    "subtotal": 1780000,
    "shipping": 150000,   // flat, 0 when the cart is empty
    "tax": 0,
    "discount": 0,        // always 0 here — discounts are applied at checkout
    "total": 1930000
  },
  "createdAt": "...",
  "updatedAt": "...",
  "warnings": [
    "محصول تیشرت اورسایز با رنگ یا سایز نامعتبر از سبد حذف شد"
  ]
}
```

> **`warnings` is load-bearing.** While building the response the server drops items whose product was deleted or whose color/size no longer exists in the catalog, and reports each removal here. Prices in `summary` are always recomputed from the **live** product price — the cart never stores a price.

## 3.2 `GET /api/cart`
`200` with the cart above. `404 { "error": "active cart not found" }` when the user has never had a cart — deliberately distinct from an existing-but-empty cart, which returns `200` with `items: []`.

## 3.3 `POST /api/cart` — sync a local cart on login
```json
{
  "items": [
    {
      "productId": "664a...",
      "quantity": 2,
      "variant": { "variantId": "665f...", "size": "L", "color": "#1B1B1B" }
    }
  ]
}
```
Merges the posted items with any existing active cart, keyed by `(productId, variantId, color, size)`; quantities are summed, invalid variants are dropped. Returns the merged cart response.

## 3.4 `POST /api/cart/item`
```json
{
  "productId": "664a...",
  "variant": { "variantId": "665f...", "size": "L", "color": "#1B1B1B" },
  "quantity": 1
}
```
`quantity` is a **delta** — it is added to whatever is already in the cart for that variant. Creates a cart automatically when none exists. `variantId` and `size` are both mandatory (`validateVariantStock`).

Stock check is against `existing + requested`:
```json
{ "error": "موجودی کافی نیست. موجودی انبار: 3، در سبد خرید: 2، درخواست جدید: 2" }
```

**Errors:** `400` non-positive quantity, malformed product ID, missing variant/size, unknown color, size not found for that color, insufficient stock · `404` product not found · `401` unauthenticated.

## 3.5 `PUT /api/cart/item`
Same body as above, but `quantity` is **absolute**. `quantity: 0` removes the item. `400` on a negative quantity, `404` when the item is not in the cart.

## 3.6 `DELETE /api/cart/item` — query parameters
```
DELETE /api/cart/item?productId=664a...&variantId=665f...&variantSize=L&variantColor=%231B1B1B&variantColorName=%D9%85%D8%B4%DA%A9%DB%8C
```
Only `productId` is required. **Idempotent:** removing an item that is already absent returns `200` with the authoritative cart rather than a `404`, so a stale client item can never become unremovable.

## 3.7 `DELETE /api/cart`
Empties `items` and returns the (now empty) cart response. The cart document survives.

## 3.8 Admin cart views
`GET /api/admin/carts` returns populated carts joined with their owner (`AdminCartResponse`, items summarised as `AdminCartItemSummary`). `POST /api/admin/carts/send-recovery-sms` drives the abandoned-cart flow that mints `source: "cart_recovery"` coupons (see §2.7).

---

# 4. Checkout

`POST /api/checkout` creates the order. It does **not** take payment — payment is a separate flow (§5.3), and inventory is only decremented once payment succeeds.

## 4.1 `POST /api/checkout` — Bearer

**Request**
```jsonc
{
  "items": [
    {
      "product_id": "664a...",
      "variant": { "variantId": "665f...", "size": "L", "color": "#1B1B1B", "colorName": "مشکی", "sku": "SKU-L-BLK" },
      "quantity": 2
    }
  ],
  "totalAmount": 1930000,
  "shippingCost": 150000,
  "taxAmount": 0,
  "discountAmount": 0,
  "shippingAddress": {
    "title": "خانه",
    "first_name": "علی", "last_name": "رضایی",
    "phone_number": "09121234567",
    "province": "تهران", "province_code": 8,
    "city": "تهران", "city_code": 1,
    "address": "خیابان ولیعصر، پلاک ۱۲",
    "postal_code": "1234567890",
    "latitude": 35.7219, "longitude": 51.3347,
    "is_default": true
  },
  "promoCode": "TRYN-4F2A"
}
```

> **Nothing financial is trusted from the client.** `price_at_purchase` is snapshotted from the live product, `discountAmount` is **recomputed server-side** and overwrites whatever was sent, and `total_amount` is set to the server's `subtotal + shipping − discount`. The client's `totalAmount` is only used as a cross-check: a mismatch greater than 1 Toman rejects the order. `taxAmount` is ignored and stored as `0`.

**Validation order**
1. Promo code — resolved first against `negotiated_coupons`, then `discounts`.
   - Negotiated: ownership, expiry, and required-product/color matching (all-of for try-on coupons, any-of for `cart_recovery`). Note `used == true` does **not** block checkout, since an applied coupon is always already marked used.
   - Regular: `valid_from`/`valid_to` window, targeting eligibility, and `used_count > max_uses` (strictly greater — the cap is enforced atomically at activation).
2. Every item: `quantity > 0`, product exists, variant normalised, price/name/image snapshotted.
3. Cart not empty.
4. `validateInventory` across all items.
5. Discount recomputed; `shippingCost`/`discountAmount` must be ≥ 0 and the discount must not exceed subtotal.
6. Total cross-check (±1 Toman tolerance).

**Response `200`** — the created order (`OrderAPIResponse`, §5.1), with:
- `order_number`: `"DGS-00042"`
- `status: "pending"`, `status_text: "در انتظار پردازش"`
- `payment_status: "pending"`

**Errors** — all `400` with Persian messages unless noted:

| Message | Cause |
|---|---|
| `کد تخفیف نامعتبر است` | unknown code |
| `کد تخفیف شما منقضی شده است` / `کد تخفیف منقضی شده است` | expired |
| `این کد تخفیف متعلق به شما نیست` | coupon owned by another user |
| `این کد تخفیف زمانی اعمال می شود که هر دو محصول…` | required products missing |
| `کد تخفیف به سقف مصرف رسیده است` | `used_count > max_uses` |
| `تعداد محصول باید بیشتر از صفر باشد` | non-positive quantity |
| `محصول با شناسه … یافت نشد` | product missing |
| `سبد خرید خالی است` | no valid items |
| `مقادیر مالی سفارش نامعتبر است` | negative or over-large amounts |
| `مبلغ سفارش با اقلام سبد خرید مطابقت ندارد` | client/server total mismatch |
| — | `401` unauthenticated, `500` insert failure |

> The user's cart is **not** cleared by checkout. It is cleared when payment is confirmed.

## 4.2 `POST /api/orders/{orderId}/confirm-payment` — Bearer

Manual/COD confirmation path. Online gateway payments confirm themselves through the callback (§5.4).

**Request** (optional — an unparseable body defaults `paymentMethod` to `"online"`):
```json
{ "transactionId": "…", "paymentMethod": "card" }
```

**Effects, in order:** ownership check (owner or admin) → reject if already paid → re-validate inventory → **decrement inventory** → set `payment_status: "paid"`, `status: "processing"` → **clear the user's cart** → fire order-confirmation SMS asynchronously.

If inventory is short, the order is flipped to `cancelled` / `payment_status: "failed"` with `status_text: "لغو شده - موجودی ناکافی"`. If the order update fails after inventory was reduced, inventory is restored.

**Response `200`**
```json
{ "message": "پرداخت با موفقیت تایید شد", "order": { /* OrderAPIResponse */ } }
```
**Errors:** `400` already paid / insufficient stock · `403` not your order · `404` order not found · `500` inventory or update failure.

## 4.3 Discount endpoints used by the checkout page

| Method | Path | Notes |
|---|---|---|
| GET | `/api/discounts/code/{code}` | validate an admin code; checks window, `max_uses`, and targeting |
| POST | `/api/coupons/apply` | validate a negotiated/recovery coupon against the live cart (§2.7) |
| POST | `/api/discounts/activate` | `{"code":"…"}` — atomically consumes one use |
| POST | `/api/discounts/deactivate` | releases it |

`activate` increments `used_count` only while `used_count < max_uses` (atomic `$expr` guard), returning `409 کد تخفیف به سقف مصرف رسیده است` when the cap is hit. For negotiated coupons it sets `used: true`, scoped to the authenticated owner.

Those four are the **only** public discount routes. Creating, editing, deleting and listing discounts are admin operations under `/api/admin/discounts` — they were previously duplicated on the unauthenticated router, so anyone could mint or delete codes and `GET /api/discounts` returned every coupon code in the system. Those public copies have been removed.

---

# 5. User Profile — Addresses, Orders, Payments

## 5.1 Profile

| Method | Path | Auth |
|---|---|---|
| GET | `/api/users/profile` | Bearer |
| PUT | `/api/users/profile` | Bearer |
| PUT | `/api/users/password` | Bearer |
| POST | `/api/users/logout` | Bearer |
| GET | `/api/users/promotions` | Bearer |
| GET | `/api/users/vouchers` | Bearer |
| GET | `/api/users/return-requests` | Bearer |
| POST | `/api/users/app-activity` | Bearer |

### `GET /api/users/profile`
```jsonc
{
  "user_data": {
    "id": "664e...",
    "name": "علی رضایی",
    "first_name": "علی",
    "last_name": "رضایی",
    "email": "ali@example.com",
    "phone": "09121234567",
    "addresses": [ /* Address[] */ ],
    "role": "customer",
    "is_active": true,
    "created_at": "...", "updated_at": "...",
    "has_mobile_app": true,
    "last_app_open": "...", "app_platform": "android", "app_version": "1.2.3",
    "last_login": "...",
    "birthday": "1996-04-21T00:00:00Z"
  },
  "has_addresses": true,
  "addresses_data": [ /* same Address[] */ ],

  // present only when the user has no addresses:
  "message": "شما هنوز هیچ آدرسی ثبت نکرده‌اید.",
  "link_text": "افزودن آدرس جدید"
}
```
`password_hash` and `token_version` are never serialised (`json:"-"`).

### `PUT /api/users/profile`
```json
{ "first_name": "علی", "last_name": "رضایی", "email": "ali@example.com", "birthday": "1375/02/01" }
```
All fields optional; `name` is accepted as a legacy alias. Supplying `first_name`/`last_name` also rewrites the composed `name`. `birthday` is Jalali (`YYYY/MM/DD` or `YYYY-MM-DD`, Persian digits accepted) and is converted to Gregorian — it is **write-once**, a second attempt returns `تاریخ تولد قابل تغییر نیست`. Email format is validated when non-empty.

**Response `200`** — the full updated `User`. **Errors:** `400` empty name / bad email / bad or repeated birthday / no fields sent · `404` user gone.

### `PUT /api/users/password`
```json
{ "current_password": "…", "new_password": "…" }
```
New password ≥ 6 characters. On success every session is invalidated: `token_version` is incremented (killing access tokens on their next request) **and** all persisted refresh tokens are revoked.

`200 { "message": "Password changed successfully" }` · `401 Current password is incorrect` · `400` validation.

### `GET /api/users/promotions`
Returns `Discount[]` currently valid for this user — within the date window, not maxed out, and either `is_public: true` or with the user in `assigned_users`. Degrades to `[]` on query failure.

### `GET /api/users/vouchers`
A unified view of targeted admin discounts **and** negotiated coupons:
```jsonc
[
  {
    "id": "…",
    "type": "negotiated",            // or "targeted"
    "code": "TRYN-4F2A",
    "discount_type": "percentage",
    "value": 12,
    "valid_until": "…",
    "valid_from": "…",
    "min_order_amount": 0,
    "required_products": [
      { "id": "664a...", "name": "تیشرت اورسایز",
        "image": "…", "color": "#1B1B1B", "color_name": "مشکی", "in_stock": true }
    ],
    "description": "…"
  }
]
```

---

## 5.2 Addresses

| Method | Path |
|---|---|
| GET | `/api/users/addresses` |
| POST | `/api/users/addresses` |
| PUT | `/api/users/addresses/{addressIndex}` |
| DELETE | `/api/users/addresses/{addressIndex}` |

> **Addresses are an embedded array on the user document, addressed by array index** — not by ID. Concurrent edits from two devices can therefore act on different rows than intended; the client must re-read after any mutation. **All four endpoints return the complete `Address[]`,** which makes that re-read automatic.

### The `Address` object
```jsonc
{
  "title": "خانه",
  "first_name": "علی",
  "last_name": "رضایی",
  "phone_number": "09121234567",
  "province": "تهران",
  "province_code": 8,
  "address": "خیابان ولیعصر، پلاک ۱۲",
  "postal_code": "1234567890",
  "latitude": 35.7219,
  "longitude": 51.3347,

  "street": "…",        // legacy alias for `address`
  "city": "تهران",
  "city_code": 1,
  "state": "…",
  "country": "…",
  "is_default": true
}
```

### `POST /api/users/addresses`
Body is a bare `Address`.

**Required:** `latitude`/`longitude` (both zero is rejected), `city`, `postal_code`, and at least one of `address`/`street`.

**Rules:** Persian digits in `postal_code`, `phone_number`, `address` and `street` are rewritten to ASCII on write. Setting `is_default: true` clears the flag on every other address. The very first address is forced to `is_default: true`.

**Response `200`** — the full updated `Address[]`.
**Errors:** `400 Latitude and Longitude are required for an address` · `400 City, PostalCode, and either Street or Address are required for an address` · `404 User not found`.

### `PUT /api/users/addresses/{addressIndex}`
`addressIndex` is the 0-based position. Body is a complete `Address` — it **replaces** the entry, so omitted fields are cleared. Same validation as POST. Un-defaulting the last default promotes another address. `400` on a negative or unparseable index, `404` when the index is out of range.

### `DELETE /api/users/addresses/{addressIndex}`
Removes the entry; if the deleted address was the default and others remain, the first remaining address is promoted. Returns the updated `Address[]`.

### Address helper endpoints (public, no auth)
Neshan map proxies that keep the service key server-side:
`GET /api/neshan/reverse`, `GET /api/neshan/search`, `GET /api/neshan/geocode`.

---

## 5.3 Orders

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/orders` | Bearer | the caller's orders |
| GET | `/api/orders/{orderId}` | Bearer | one order (owner or admin) |
| POST | `/api/orders/{orderId}/confirm-payment` | Bearer | §4.2 |
| GET | `/api/orders/{orderId}/return-request` | Bearer | status + eligibility |
| POST | `/api/orders/{orderId}/return-request` | Bearer | open a return |
| DELETE | `/api/orders/{orderId}/return-request` | Bearer | cancel a pending return |
| GET | `/api/users/return-requests` | Bearer | all returns across orders |

Admin: `GET /api/admin/orders`, `/orders/stats`, `/orders/recent`, `GET|PUT|DELETE /api/admin/orders/{orderId}`, `POST /api/admin/orders/{orderId}/notes`, and the return-request moderation pair.

### `OrderAPIResponse`
```jsonc
{
  "id": "6650...",
  "user_id": "664e...",
  "order_number": "DGS-00042",
  "items": [
    {
      "product": {
        "id": "664a...", "name": "تیشرت اورسایز",
        "image": "/uploads/products/colors/…",   // image of the ordered color
        "brand": "Voxcina", "brand_id": "664c..."
      },
      "variant": { "variantId": "665f...", "size": "L", "color": "#1B1B1B",
                   "colorName": "مشکی", "sku": "SKU-L-BLK" },
      "quantity": 2,
      "price_at_purchase": 890000
    }
  ],
  "total_amount": 1930000,
  "shipping_cost": 150000,
  "tax_amount": 0,
  "discount_amount": 0,
  "discount_code": "TRYN-4F2A",
  "shipping_address": { /* Address snapshot taken at order time */ },
  "status": "processing",
  "status_text": "در حال پردازش",
  "tracking_code": "…",
  "payment_status": "paid",
  "payment_method": "online",
  "zibal_track_id": 123456789,
  "zibal_ref_number": "…",
  "gateway_name": "zibal",
  "merchant_transaction_id": "…",   // the only ID the customer sees
  "gateway_transaction_id": "…",    // provider's ID
  "timeline": [ { "status": "processing", "timestamp": "...", "note": "…",
                  "admin_id": "…", "admin_name": "…" } ],
  "notes": [ { "id": "…", "content": "…", "admin_id": "…",
               "admin_name": "…", "created_at": "..." } ],
  "created_at": "...", "updated_at": "...", "delivered_at": "...",
  "jalali_created_at": "۱۴۰۵/۰۶/۱۱",
  "jalali_updated_at": "۱۴۰۵/۰۶/۱۲",
  "product_count": 2
}
```

`status` ∈ `pending` | `processing` | `shipped` | `delivered` | `cancelled`.
`payment_status` ∈ `pending` | `paid` | `failed` | `abandoned`.
`payment_method` ∈ `online` | `wallet` | `cod`.
`gateway_name` ∈ `zibal` | `digipay` | `snappay` — back-filled from the latest payment attempt for older orders.

The admin variant (`AdminOrderAPIResponse`) adds `snappay_payment_token`, `digipay_tracking_code`, `user_first_name`, `user_last_name`, `user_name`, `user_phone`.

### `GET /api/orders`

**Query:** `page` (default 1), `limit` (default 10), `status` (one of the five real statuses, or `all`/empty), `search` (case-insensitive partial match on `order_number`, `merchant_transaction_id`, `gateway_transaction_id`, `gateway_reference`). Sorted newest-first, scoped to the caller and `is_active: true`.

**Response `200` — with orders**
```jsonc
{
  "has_orders": true,
  "orders_data": [ /* OrderAPIResponse[] */ ],
  "pagination": { "currentPage": 1, "totalPages": 3, "totalOrders": 27, "pageSize": 10 }
}
```

**Response `200` — empty** (note the extra CTA fields):
```jsonc
{
  "message": "شما هنوز هیچ سفارشی ثبت نکرده‌اید.",
  "link_text": "مشاهده محصولات",
  "link_url": "/products",
  "has_orders": false,
  "orders_data": [],
  "pagination": { … }
}
```
An order whose product rows can no longer be populated is skipped and logged, not surfaced as an error — so `orders_data.length` can be less than `pageSize` even mid-list.

### `GET /api/orders/{orderId}`
`200` with a single `OrderAPIResponse`. `403 You are not authorized to view this order` unless the caller owns it or is an admin. `404` when not found or soft-deleted.

### Returns

Window: **7 days from delivery**, inclusive. Only `delivered` + `paid` orders qualify. At most one non-terminal request per order; `rejected`/`cancelled` free the order for a new attempt while the window is open, `approved` does not.

**`GET /api/orders/{orderId}/return-request`**
```jsonc
{
  "request": { /* ReturnRequest or null */ },
  "eligibility": {
    "can_request": true,
    "reason": "",                       // set only when blocked
    "delivered_at": "...",
    "window_ends_at": "...",
    "jalali_window_ends_at": "۱۴۰۵/۰۶/۱۹",
    "existing_request_id": "…"
  }
}
```

**`POST /api/orders/{orderId}/return-request`**
```json
{
  "items": [ { "product_id": "664a...", "variant_id": "665f...", "quantity": 1 } ],
  "reason": "سایز مناسب نبود"
}
```
`reason` ≤ 1000 characters; at least one item required.

**`201`** — the created `ReturnRequest`:
```jsonc
{
  "id": "…", "order_id": "…", "order_number": "DGS-00042", "user_id": "…",
  "items": [ { "product_id": "…", "product_name": "…", "product_image": "…",
               "variant": { … }, "quantity": 1, "price_at_purchase": 890000 } ],
  "reason": "سایز مناسب نبود",
  "status": "pending",
  "delivered_at": "...", "window_ends_at": "...",
  "created_at": "...", "updated_at": "..."
}
```
`409` when ineligible (not delivered, unpaid, window expired, or a pending/approved request already exists).

**`DELETE /api/orders/{orderId}/return-request`** → `200 { "message": "درخواست مرجوعی لغو شد" }`, or `404` when there is no pending request.

**`GET /api/users/return-requests?status=&page=&limit=`** — scope is forced from the JWT, callers cannot widen it:
```jsonc
{
  "return_requests": [ /* ReturnRequest[] */ ],
  "pagination": { "current_page": 1, "total_pages": 2, "total_count": 23, "page_size": 20 }
}
```
The unread badge pattern is `?status=pending&limit=1` reading `pagination.total_count`.

---

## 5.4 Payments

Three gateways behind one interface (`services.PaymentGateway`): **Zibal** (default), **DigiPay**, **SnappPay** (BNPL). Attempts are recorded in `payment_attempts` — each retry creates a new attempt with a fresh provider ID, earlier attempts are preserved.

| Method | Path | Auth |
|---|---|---|
| POST | `/api/payment/request` | Bearer |
| POST | `/api/payment/verify` | Bearer |
| POST | `/api/payment/inquiry` | Bearer |
| POST | `/api/payment/retry` | Bearer |
| GET | `/api/payment/snappay/eligibility?amount=` | Bearer |
| GET | `/api/payment/callback` | public (Zibal redirect) |
| GET\|POST | `/api/payment/digipay-callback` | public |
| POST | `/api/payment/snappay-callback` | public |

Admin: `POST /api/admin/orders/{orderId}/payment/snappay/update` and `/cancel` — irreversible provider operations, gated behind an explicit confirmation flag in the body.

### `POST /api/payment/request`
```json
{ "orderId": "6650...", "gateway": "zibal", "description": "optional", "mobile": "09121234567" }
```
`gateway` defaults to `"zibal"`. `mobile` falls back to the user's stored phone (DigiPay requires it).

**Response `200`**
```json
{
  "result": 100,
  "message": "Payment request created successfully",
  "payUrl": "https://gateway.zibal.ir/start/…",
  "gateway": "zibal"
}
```
The client redirects the browser to `payUrl`.

> **The amount is derived from the order, never from the client** — `order.TotalAmount * 10` (Toman → Rial), with a SnappPay-specific conversion. Minimum 1000 Rials.

**Errors:** `400` bad order ID / unknown gateway / amount below minimum / invalid SnappPay data · `404` order not found or not owned by the caller · `502` SnappPay declined eligibility · `500` provider or persistence failure (the attempt row is rolled back).

### `GET /api/payment/callback` (Zibal) — public

Query: `trackId` (required), `orderId` (optional, narrows the lookup). The handler verifies with Zibal, checks the returned amount equals the order total exactly, and then **redirects the browser** — it does not return JSON:

```
{APP_URL}/checkout/callback?success=1&trackId=…&transactionId=…&orderId=…&status=paid&gateway=zibal
```

| Outcome | `success` | `status` |
|---|---|---|
| verified, amount matches | `1` | `paid` |
| provider says not paid | `0` | `abandoned` |
| verification error / mismatch | `0` | `failed` |
| already paid (idempotent replay) | `1` | `paid` |

Error redirects carry `&error=missing_trackId` \| `invalid_trackId` \| `order_not_found` \| `gateway_unavailable`. The paid transition is guarded by `payment_status != "paid"`, so a replayed callback cannot double-fire the confirmation SMS.

### `POST /api/payment/verify`
```json
{ "trackId": 123456789, "gateway": "zibal" }
```
```jsonc
{
  "result": 100,
  "message": "…",
  "status": 1,
  "amount": 19300000,             // Rials
  "refNumber": "…",
  "cardNumber": "6037****1234",
  "paidAt": "...",
  "description": "…",
  "orderId": "6650...",
  "paymentStatus": "paid",
  "statusText": "پرداخت موفق",
  "canRetry": false,
  "orderNumber": "DGS-00042"
}
```

### `POST /api/payment/inquiry`
Same request shape. Response adds `createdAt` and `verifiedAt` and omits `canRetry`/`orderNumber` — a read-only status probe.

### `POST /api/payment/retry`
```json
{ "orderId": "6650...", "gateway": "digipay" }
```
Creates a fresh attempt (new provider ID) for an unpaid order and returns a new `payUrl`. `gateway` may differ from the original — that is how a customer switches from a failed Zibal attempt to DigiPay.

### `GET /api/payment/snappay/eligibility?amount=`
`amount` in Rials. Returns the provider's eligibility payload verbatim. `503` when SnappPay credentials are not configured, `400` on a non-positive amount, `502` on a provider error.

### `PaymentAttempt`
```jsonc
{
  "id": "…", "order_id": "…", "user_id": "…",
  "gateway": "zibal",
  "provider_id": "…",              // our UUID; for SnappPay = merchant transaction ID
  "gateway_reference": "…",        // provider token/reference
  "gateway_ref_number": "…",
  "expected_amount": 19300000,     // Rials — the verification cross-check
  "status": "pending",
  "callback_type": 0,
  "gateway_data": { /* raw provider payload */ },
  "created_at": "...", "verified_at": "...", "updated_at": "..."
}
```
Unique indexes on `(gateway, provider_id)` and `(gateway, gateway_reference)` make callback replays idempotent.

---

# Appendix A — Full route table for the documented areas

```
# Products   (literal paths registered before /products/{id} — see §1.5)
GET    /api/products
GET    /api/products/trending
GET    /api/products/search
GET    /api/products/recommendations
GET    /api/products/smart-recommendations
GET    /api/products/collection/{collectionValue}
GET    /api/products/{id}
GET    /api/products/{productId}/reviews
POST   /api/products/{productId}/reviews         [auth]
PUT    /api/reviews/{reviewId}                   [auth]
DELETE /api/reviews/{reviewId}                   [auth]
GET    /api/search/suggestions
GET    /api/search/suggestions/smart
POST   /api/search/smart
GET    /api/categories | /homepage | /{id} | /{id}/products
GET    /api/brands | /brands/{id}
GET    /api/vocabulary-mappings
POST   /api/admin/categories                     [admin]
PUT    /api/admin/categories/{id}                [admin]
DELETE /api/admin/categories/{id}                [admin]
POST   /api/admin/brands                         [admin]
PUT    /api/admin/brands/{id}                    [admin]
DELETE /api/admin/brands/{id}                    [admin]
GET    /api/admin/products                       [admin]
POST   /api/admin/products                       [admin]
PUT    /api/admin/products/{id}                  [admin]
DELETE /api/admin/products/{id}                  [admin]
GET    /api/admin/products/{id}/cart-usage       [admin]

# Try-on agent
POST   /api/tryon/generate                       [auth]
GET    /api/tryon/status                         [auth]
GET    /api/tryon/status-stream                  [auth, SSE]
GET    /api/tryon/history                        [auth]
GET    /api/tryon/{tryonId}                      [auth]
GET    /api/tryon/sessions                       [auth]
GET    /api/tryon/sessions/{chatId}              [auth]
DELETE /api/tryon/sessions/{chatId}              [auth]
POST   /api/tryon/sessions/messages              [auth]
POST   /api/tryon/link                           [auth]
POST   /api/tryon/negotiate-stream               [auth, SSE]
POST   /api/tryon/apply-negotiated-coupon        [auth]
POST   /api/coupons/apply                        [auth]  (same handler)
POST   /api/coupons/negotiate-stream             [auth, SSE]
POST   /api/coupons/sessions/messages            [auth]
GET    /api/coupons/sessions/{chatId}            [auth]
GET    /api/admin/ai/tryon-chats                 [admin]
GET    /api/admin/ai/tryon-chats/{chatId}        [admin]
GET    /api/admin/ai/settings                    [admin]
PUT    /api/admin/ai/settings                    [admin]

# Cart
GET    /api/cart                                 [auth]
POST   /api/cart                                 [auth]
DELETE /api/cart                                 [auth]
POST   /api/cart/item                            [auth]
PUT    /api/cart/item                            [auth]
DELETE /api/cart/item                            [auth]
GET    /api/admin/carts                          [admin]
DELETE /api/admin/carts/{cartId}                 [admin]
POST   /api/admin/carts/send-recovery-sms        [admin]

# Checkout
POST   /api/checkout                             [auth]
POST   /api/orders/{orderId}/confirm-payment     [auth]
GET    /api/discounts/code/{code}
POST   /api/discounts/activate
POST   /api/discounts/deactivate
GET    /api/admin/discounts                      [admin]
POST   /api/admin/discounts                      [admin]
GET    /api/admin/discounts/{id}                 [admin]
PUT    /api/admin/discounts/{id}                 [admin]
DELETE /api/admin/discounts/{id}                 [admin]
GET    /api/admin/vouchers                       [admin]

# Profile
GET    /api/users/profile                        [auth]
PUT    /api/users/profile                        [auth]
PUT    /api/users/password                       [auth]
POST   /api/users/logout                         [auth]
GET    /api/users/promotions                     [auth]
GET    /api/users/vouchers                       [auth]
POST   /api/users/app-activity                   [auth]
GET    /api/users/addresses                      [auth]
POST   /api/users/addresses                      [auth]
PUT    /api/users/addresses/{addressIndex}       [auth]
DELETE /api/users/addresses/{addressIndex}       [auth]
GET    /api/neshan/reverse | /search | /geocode

# Orders & returns
GET    /api/orders                               [auth]
GET    /api/orders/{orderId}                     [auth]
GET    /api/orders/{orderId}/return-request      [auth]
POST   /api/orders/{orderId}/return-request      [auth]
DELETE /api/orders/{orderId}/return-request      [auth]
GET    /api/users/return-requests                [auth]
GET    /api/admin/orders (+ /stats /recent /{id} /{id}/notes)   [admin]
GET    /api/admin/return-requests                [admin]
PUT    /api/admin/return-requests/{requestId}    [admin]

# Payments
POST   /api/payment/request                      [auth]
POST   /api/payment/verify                       [auth]
POST   /api/payment/inquiry                      [auth]
POST   /api/payment/retry                        [auth]
GET    /api/payment/snappay/eligibility          [auth]
GET    /api/payment/callback                     (public redirect)
GET|POST /api/payment/digipay-callback           (public)
POST   /api/payment/snappay-callback             (public)
POST   /api/admin/orders/{orderId}/payment/snappay/update   [admin]
POST   /api/admin/orders/{orderId}/payment/snappay/cancel   [admin]
```

---

# Appendix B — Issues found while mapping these APIs

## Fixed

| # | Severity | Area | Issue & resolution |
|---|---|---|---|
| 1 | High | Routing | **Four endpoints were unreachable.** `/products/search`, `/products/recommendations`, `/products/smart-recommendations` and `/categories/homepage` were registered *after* their `{id}` wildcards, so `gorilla/mux` handed the requests to `GetProduct`/`GetCategoryByID` with `id="search"` etc., answering `400 Invalid product ID`. A router-wide scan confirmed exactly these four out of 250 routes. **Fixed:** literal paths moved above their wildcards, and `routes/routes_shadow_test.go` now walks the live router and fails on any future shadowing. |
| 2 | High | Auth | **Unauthenticated catalog & discount writes.** `POST/PUT/DELETE /api/discounts`, `PUT|DELETE /api/categories/{id}` and `POST|PUT|DELETE /api/brands` sat on the public router with no middleware, so anyone could mint or delete discount codes and rewrite the catalog taxonomy. `GET /api/discounts` additionally returned **every coupon code** in the system to anonymous callers. **Fixed:** all of them removed from the public router; the mutations now live on `adminRouter` (`/api/admin/categories/{id}`, `/api/admin/brands`, `/api/admin/discounts`). The storefront's own coupon flow — `GET /discounts/code/{code}`, `POST /discounts/activate`, `POST /discounts/deactivate` — stays public. |

The admin dashboard already sent `Authorization: Bearer <adminToken>` on all six catalog write calls, so it only needed to be pointed at the `/admin` prefix (`front_end/src/store/category-store.ts`, `brand-store.ts`, `product-store.ts`). Its discount screens were already calling `/api/admin/discounts`, so they needed no change.

## Open

| # | Severity | Area | Issue |
|---|---|---|---|
| 3 | Medium | Products | `GET /api/products` loads the entire filtered product set into memory and paginates in Go. Fine at current catalog size, but it does not scale and every page request pays the full query cost. |
| 4 | Medium | Products | `/api/products` paginates *after* flattening to variants, while `/api/products/collection/{v}` paginates *before* — the second can return more rows than `limit` and its `totalPages` counts products, not cards. |
| 5 | Low | Addresses | Addresses are indexed positionally in an embedded array. Two concurrent edits can target different rows than intended; there is no per-address ID or optimistic-concurrency guard. |
| 6 | Low | Products | `GET /api/search/suggestions` has no result limit and no `is_active` filter, so it can return the whole catalog and leak inactive products. |
| 7 | Low | Try-on | Try-on task state lives in an in-process `sync.Map` with a 30-minute TTL. Status polling breaks across a restart or a second replica; the persisted `virtual_tryons` document is the durable record but `/status` does not fall back to it (`tryonStatusFromDB` exists for exactly this but is never called). |
| 8 | Info | Wishlist | `/api/wishlist` endpoints are unimplemented stubs returning fixed messages. |
| 9 | Info | Promotions | `/api/promotions/home` and `/api/promotions/{campaignId}` are stubs returning `{"message": "..."}`. |

# Category Pages — SEO / GEO / AEO Improvement Plan

**Audited:** 2026-09-01 · **Scope:** `/categories/[categorySlug]` (11 live categories)
**Method:** source inspection + live HTML fetched with a Googlebot UA from production (`voxcina.com`).

Every finding below was verified against rendered production HTML, not inferred from source.

---

## 1. How category pages render today

| Layer | File |
|---|---|
| Route (server component) | `front_end/src/app/(shop)/categories/[categorySlug]/page.tsx` |
| Interactive shell (client) | `front_end/src/app/(shop)/categories/[categorySlug]/CategoryPageClient.tsx` |
| Data helper | `front_end/src/lib/server-api.ts` |
| Schema components | `front_end/src/components/SEO/{BreadcrumbSchema,ItemListSchema}.tsx` |
| Data model | `models/category.go` |

**Request flow**

1. `getCategoryData()` fetches **all** categories (`/api/categories`, ISR 600s, tag `categories`).
2. The slug is resolved by a **linear scan in JS** matching `slug` / `name` / `id`, case-insensitively. There is no backend "get category by slug" endpoint.
3. Products are fetched by category **name** (`/api/products?category=<name>&limit=20`, ISR 300s).
4. `generateMetadata()` calls `getCategoryData()` a second time — deduped by Next's fetch cache, so no extra network round trip, but a full second resolution pass.
5. The server renders `BreadcrumbSchema`, `ItemListSchema`, an `sr-only` prev/next nav, visible `Breadcrumbs`, then hands off to `CategoryPageClient`.

**What this gets right** — real SSR with product data in the HTML, self-referencing canonicals, correct `noindex, follow` on `?sort=` variants, self-canonical paginated pages (current best practice), ISR with tag-based revalidation, a dynamic sitemap, and `metadataBase` set. The foundation is sound; the problems are content and schema depth, not plumbing.

---

## 2. Findings

Scores use the SEO/GEO/AEO rubric: **SEO 5/10 · GEO 2/10 · AEO 1/10**.

### 🔴 Critical

**C1 — Meta descriptions are 12–30 characters on every category page.**
The code has a *good* generated fallback, but `category.description || <fallback>` short-circuits because the DB field holds a short label, not a description. Live evidence:

| URL | Description | Length |
|---|---|---|
| `/categories/SHIRT` | پیراهن مردانه | 13 |
| `/categories/PANTS` | شلوار مردانه | 12 |
| `/categories/MEN` | لباس‌های مردانه | 15 |
| `/categories/JEANS` | شلوار جین مردانه | 16 |
| `/categories/WOMEN-VESTS-JACKETS` | جلیقه و وست زنانه | 17 |
| `/categories/WOMEN` | دسته لباس‌های زنانه | 19 |
| `/categories/Women_Dress` | انواع دامن های زنانه | 20 |
| `/categories/SHORT_SLEEVE_SHIRT` | دسته پیراهن آستین کوتاه مردانه | 30 |

Target is 150–160. Google will rewrite these from page text — and the page text is also thin (C3), so it has nothing good to use.

**C2 — All AI crawlers are blocked site-wide.** `front_end/src/app/robots.ts` disallows `GPTBot`, `ChatGPT-User`, and `CCBot` for `/`. Verified live at `voxcina.com/robots.txt`. This is the single reason GEO scores 2/10: the site is structurally unable to appear in ChatGPT Search, and is excluded from Common Crawl. This may well be deliberate — **it is a business decision, not a bug** — but it should be a conscious one, and it is currently applied with no exception for category and product pages.

**C3 — Roughly 3 words of unique editorial content per page.** Stripping nav, product cards and prices from `/categories/SHIRT` leaves the H1 (`پیراهن`) and the 13-character description. Total visible page text is 606 words, essentially all of it boilerplate chrome and product names. Category pages rank on topical content; there is none.

**C4 — The data model has no SEO fields at all.** `models/category.go` carries `Name, Slug, ParentID, Description, Image, Avatar, IsActive, ShowInHeader`. There is nowhere to store a meta description, an intro paragraph, or FAQ entries — so C1 and C3 cannot be fixed properly without a schema change.

### 🟠 High

**H5 — Two conflicting `BreadcrumbList` JSON-LD blocks on every category page.** Confirmed: 5 JSON-LD blocks render, two of type `BreadcrumbList` (346 and 284 bytes — different item sets). One comes from `<BreadcrumbSchema>` in `page.tsx`, the other from `<Breadcrumbs>` in `components/layout/Breadcrumbs.tsx`, which emits its own. Also affects `/products/*`, `/brands/*`, `/blog/*` and `/collection/*`.

**H6 — `ItemList` has no commerce data.** Each `ListItem` carries only `name`, `url`, `image`. With no `Product` / `offers` / `price` / `availability` / `brand`, the page is ineligible for merchant listing rich results — the highest-value SERP feature available to a category page.

**H7 — No `CollectionPage` schema.** The page declares no top-level type, so search and AI engines get no signal that this is a product listing rather than an arbitrary list.

**H8 — `?inStockOnly=true` is indexable and self-canonical.** The `noindex` rule in `generateMetadata` covers only `search.sort`. Verified live: the sort variant returns `noindex, follow`; the stock variant returns no robots meta and canonicalises to itself. Every category has a duplicate twin.

**H9 — Titles waste the SERP line.** `APP_NAME = "وکسینا | Voxcina"` combined with the `%s | ${APP_NAME}` template produces a **double pipe**: `پیراهن | وکسینا | Voxcina` — 25 characters where 55 are available, and no commercial modifier (خرید, قیمت, product count, year).

**H10 — LCP is actively delayed on the largest element.**
- The category hero is a raw `<img>` in `CategoryPageClient.tsx` — no `next/image`, no width/height (CLS), no `priority`, no AVIF/WebP negotiation, despite `next.config.js` being configured for all of it.
- `ProductCard.tsx` hardcodes `loading="lazy"` on every image, including the first row above the fold.
- The grid mounts at `opacity: 0` and fades in with `transition={{ delay: index * 0.03 }}` after a `0.2s` parent delay, so the LCP candidate paints late by design.

### 🟡 Medium

**M11 — Slug conventions are inconsistent and partly invalid.** Live slugs: `MEN`, `WOMEN`, `SHIRT`, `SHORT_SLEEVE_SHIRT`, `PANTS`, `JEANS`, `WOMEN-VESTS-JACKETS`, `Women-Blouse`, `Men's-T-shirt`, `Women_Dress`, `Women_Poloshirt`. Three separate problems: uppercase (URLs are case-sensitive), underscores (Google treats `_` as a word-joiner, `-` as a separator — `SHORT_SLEEVE_SHIRT` reads as one token), and an apostrophe in `Men's-T-shirt` that URL-encodes to `%27`.

**M12 — `/categories` returns 404.** There is no hub page (`(shop)/categories/page.tsx` does not exist) and no entry in the sitemap. Link equity reaching category pages depends entirely on header nav.

**M13 — No `og:image` on categories without an image.** `images: category.image ? [...] : []` sets an explicit empty array, which suppresses the inherited site default rather than falling back to it. Confirmed: zero `og:image` tags on `/categories/SHIRT`.

**M14 — No `<h2>` anywhere on the page.** One H1, one H3, no subheading structure for either crawlers or screen readers.

**M15 — `numberOfItems: 20` but only 10 `itemListElement` entries** (`ItemListSchema.tsx` slices to 10 but counts `items.length`), and 20 describes the page, not the 34 products in the category.

**M16 — No FAQ content or schema, no question-phrased headings.** This is the whole of the AEO 1/10 score: nothing on the page is extractable as a direct answer.

**M17 — Dead `i18n` config.** `next.config.js` sets `i18n: { locales: ['fa'] }`, which is a Pages Router option and is ignored by the App Router.

---

## 3. The plan

### Phase 0 — Quick wins (frontend only, no schema change) — ~half a day

Ship these together; every one is a small, self-contained edit with no migration.

| # | Change | File |
|---|---|---|
| 0.1 | Only use `category.description` when it is long enough to be a real description — `description.trim().length >= 70 ? description : generatedFallback`. Immediately fixes all 11 pages. | `categories/[categorySlug]/page.tsx` |
| 0.2 | Add `inStockOnly` to the `noindex` condition alongside `sort` | same |
| 0.3 | Drop `<BreadcrumbSchema>` from the page and let `Breadcrumbs` be the single emitter (or vice versa — pick one, apply site-wide) | page + `Breadcrumbs.tsx` |
| 0.4 | Fall back to the site OG image instead of `[]` | same |
| 0.5 | Title modifiers: `خرید {name} | {count} مدل` and change `APP_NAME` usage so the template stops doubling the pipe | `page.tsx`, `lib/constants.ts` |
| 0.6 | `numberOfItems` should equal the real total, and list up to 30 items | `ItemListSchema.tsx` |
| 0.7 | Delete the dead `i18n` block | `next.config.js` |

**Decision required — 0.8:** confirm the AI-crawler policy (C2). Recommended: allow `GPTBot`, `ChatGPT-User`, `PerplexityBot` and `ClaudeBot` on `/categories/*`, `/products/*` and `/blog/*` while keeping the rest disallowed. Leave `CCBot` blocked if you want to stay out of training corpora — it is not a retrieval crawler, so blocking it costs no live AI-search visibility. **I have not changed `robots.ts`; this is your call.**

### Phase 1 — SEO fields in the data model — ~1 day

Add to `models/category.go` (and mirror in `front_end/src/types/category.ts`):

```go
MetaTitle       string       `bson:"meta_title,omitempty"       json:"meta_title,omitempty"`
MetaDescription string       `bson:"meta_description,omitempty" json:"meta_description,omitempty"`
IntroText       string       `bson:"intro_text,omitempty"       json:"intro_text,omitempty"`   // above the grid, 1-2 paragraphs
BodyText        string       `bson:"body_text,omitempty"        json:"body_text,omitempty"`    // below the grid, long-form
FAQs            []CategoryFAQ `bson:"faqs,omitempty"            json:"faqs,omitempty"`
```

- Validate lengths server-side (`meta_title` ≤ 60, `meta_description` 120–160, `faqs` ≤ 10) the same way `handlers/job_positions.go` does — that file is the pattern to copy.
- Add the fields to the admin category form under an "SEO" section, with live character counters against those limits.
- **Import-layering constraint:** if you add a backfill or seeder in `db/`, build documents as `bson.M` — `db` must not import `models` (`models` → `utils` → `db` is a cycle). See `db/job_position_indexes.go`.
- Backfill the 11 existing categories with real copy before shipping the frontend read.

### Phase 2 — Content and schema depth — ~2 days

- Render `IntroText` above the grid and `BodyText` below it, with real `<h2>`/`<h3>` structure (M14).
- Replace the bare `ItemList` with a **`CollectionPage`** whose `mainEntity` is an `ItemList` of full `Product` nodes carrying `offers` (`price`, `priceCurrency: "IRR"`, `availability`), `brand`, `image` and `sku` (H6, H7). The product data is already in `getCategoryData()` — it just isn't being emitted.
- Add **`FAQPage`** schema driven by the new `FAQs` field, rendered as visible question-phrased `<h3>`s with 40–60 word answers directly beneath (M16). This is the whole AEO fix: sizing, fabric, care, shipping and returns questions per category.
- Keep answers factual and specific — AI engines cite pages with concrete, checkable statements.

### Phase 3 — Core Web Vitals — ~1 day

- Convert the hero `<img>` to `next/image` with explicit dimensions, `priority`, and `sizes` (H10).
- Add a `priority?: boolean` prop to `ProductCard`; set it on the first 4–5 cards and leave the rest lazy.
- Remove `initial={{ opacity: 0 }}` and the per-card `delay` from the grid. Animate on hover only, as the admin sidebar was fixed. Nothing above the fold should start invisible.
- Verify with PageSpeed Insights (`pagespeed.web.dev`) before and after — I can measure the HTML, but not real Core Web Vitals.

### Phase 4 — Information architecture — ~1–2 days

- Build the `/categories` hub (M12): all active categories, grouped by parent, with descriptions and counts. Add it to `sitemap.ts` at priority 0.9 and link it from the footer.
- Normalise slugs to lowercase-hyphenated (M11): `SHORT_SLEEVE_SHIRT` → `short-sleeve-shirt`, `Men's-T-shirt` → `mens-t-shirt`. **This must ship with 301s** — add a permanent redirect map in `next.config.js` (the `/category/:slug` → `/categories/:slug` rule is the pattern) and keep old slugs resolvable in `getCategoryData()` for at least 6 months. Do this *before* the site accumulates more backlinks; it gets more expensive every month.
- Add "related categories" links in the body to spread equity between siblings.
- Consider a backend `GET /api/categories/by-slug/{slug}` endpoint to replace the full-list-then-scan resolution — a correctness and latency win as the category count grows.

### Phase 5 — GEO / AEO — ongoing

- Act on the 0.8 crawler decision.
- Strengthen entity signals: `sameAs` social profiles on the `Organization` schema, consistent brand naming.
- Add `SpeakableSpecification` to the FAQ answers.
- Publish genuinely original material — sizing guides, fabric comparisons, care instructions — the kind of specific, factual content AI engines prefer to cite.

---

## 4. Priority matrix

| Priority | Item | Dimension | Effort | Impact |
|---|---|---|---|---|
| 🔴 Critical | C1 description fallback (0.1) | SEO | XS | High |
| 🔴 Critical | C2 AI crawler policy (0.8) | GEO | XS | High |
| 🔴 Critical | C3/C4 SEO fields + content (Ph 1–2) | SEO/GEO | L | High |
| 🟠 High | H8 `inStockOnly` noindex (0.2) | SEO | XS | Medium |
| 🟠 High | H5 duplicate breadcrumbs (0.3) | SEO | XS | Medium |
| 🟠 High | H6/H7 Product + CollectionPage schema | SEO | M | High |
| 🟠 High | H10 LCP fixes (Ph 3) | SEO | M | High |
| 🟡 Medium | H9 title modifiers (0.5) | SEO | XS | Medium |
| 🟡 Medium | M16 FAQ schema | AEO | M | High |
| 🟡 Medium | M12 `/categories` hub | SEO | M | Medium |
| 🟡 Medium | M11 slug normalisation + 301s | SEO | M | Medium |
| 🟢 Quick win | M13 og:image, M15 count, M17 dead config | SEO | XS | Low |

**Suggested order:** Phase 0 this week (half a day, fixes the worst of it), then Phase 1+2 together (they are one feature), then 3, then 4.

## 5. Measuring it

- **Google Search Console** — category-page impressions and average position, before/after. Expect meta-description changes to move CTR within 2–4 weeks.
- **Rich Results Test** — verify `CollectionPage`, `Product`, `FAQPage` and a *single* `BreadcrumbList` after Phase 2.
- **PageSpeed Insights** — LCP on `/categories/SHIRT` before and after Phase 3.
- **Server logs** — AI crawler hits after the 0.8 decision.

## 6. Out of scope / needs external tooling

Core Web Vitals field data, backlink profile, keyword difficulty and competitor gap analysis cannot be assessed from HTML inspection. Use PageSpeed Insights, GSC and a rank tracker for those.

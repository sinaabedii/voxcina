# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` above is the source of truth for layout, commands, API/auth, caching, domain rules
and deployment. Do not copy its content here — extend it there, and keep this file for the
few things it does not cover.

## Orientation

Two apps in one repo, one Mongo database:

- **Repository root is the Go module `backEnd`** — there is no `backEnd/` directory. `main.go` →
  `routes/` → `handlers/` → `services/`+`db/` → MongoDB.
- **`front_end/`** is Next.js 16 App Router (React 19, Node 22). Server Components call Go
  *directly* over `GO_BACKEND_URL`; the browser reaches Go through the `/api/*` rewrite in
  `next.config.js`. So the same endpoint is hit two different ways, and only the browser path
  goes through the rewrite's exclusion list.
- Three caches sit in front of a page and are easy to confuse: Next's `fetch` cache
  (`CACHE_TIMES` in `src/lib/server-api.ts`), the HTML `Cache-Control` set by `headers()` in
  `next.config.js`, and ArvanCloud's edge. A stale page can come from any of them — identify
  which before changing anything.

## Tests

- Go: 58 test files across `handlers/`, `services/`, `utils/`, `models/`, `middlewares/`,
  `routes/`, `snappayfeed/` and root. No MongoDB or network needed.
- **The frontend has no test runner at all** — no jest, vitest, playwright or cypress. Its gates
  are `npm run lint`, `npx tsc --noEmit` and `npm run build`. Do not claim frontend tests were
  run, and do not add a test framework as a side effect of another task.

## Streaming Suspense fallbacks must mirror real layout

Route `loading.tsx` files and inline `<Suspense fallback>` are streamed into the initial HTML,
painted, then replaced in place — so any height difference between fallback and content is paid
as Cumulative Layout Shift.

A generic `PageLoading` spinner in a `min-h-[60vh]` box measured **CLS 0.30** on the product
page (fixed 2026-09-21; now 0.00, and product desktop Performance went 74 → 100). Use the
geometry-matched skeletons in `src/components/ui/Loading.tsx` — `ProductDetailSkeleton` mirrors
the gallery frame and thumbnail rail, `ProductListSkeleton` mirrors the grid — and keep
them in sync when the real components' layout changes. The product gallery's frame height,
shell and rail classes now live in `src/components/product/detail/gallery-metrics.ts`, which
both `ProductGallery` and `ProductDetailSkeleton` import so the two cannot drift; that module
must stay dependency-free, because `ui/Loading.tsx` reaches every page through `ui/Button`.

Note that boundaries **stack**: `/products/[productId]` renders three of them (root
`app/loading.tsx`, `(shop)/products/loading.tsx`, then its own). Only the innermost one is
swapped for real content after the long wait, so that is the one whose height matters most.

## Link prefetching is the homepage's dominant mobile cost

Next prefetches every in-viewport `<Link>` on hydration. On the homepage that
fired 19 RSC requests and 8 extra client chunks (~200 KB) between 1479 ms and
2319 ms — all before the first paint at 2416 ms — and accounted for most of the
Total Blocking Time. `prefetch={false}` on the listing links (category tiles,
collection banner, "view all", `ProductCard`) moved mobile 64 -> 86 and TBT
614 ms -> 124 ms; also disabling header prefetch was worth only 1 more point.

A/B a prefetch change against production with no deploy:
`npx lighthouse https://voxcina.com/ --blocked-url-patterns='*_rsc=*'`.

Bundle size is the *second* lever here, not the first — dropping framer-motion
from the boundary files moved the homepage 1031 -> 991 KiB and left observed FCP
unchanged. Always compare `observedFirstContentfulPaint`, not just the simulated
metric: simulated FCP improved 340 ms in that change while observed did not move.

## Route-level boundary files must import narrowly

`app/loading.tsx`, `app/not-found.tsx` and `app/error.tsx` are bundled into
**every** route's client references, so anything they import is paid on every
page. `app/loading.tsx` importing `PageLoading` from the `@/components/ui`
barrel dragged Modal, StarRating, QuantitySelector, ColorSelector, SizeSelector,
StockStatus and FeatureCard along with it. Import from the module
(`@/components/ui/Loading`), not the barrel.

For the same reason `ui/Loading.tsx` and `ui/Button.tsx` must stay free of
animation libraries — `Button` imports `ButtonLoading` from `Loading`, so a
`framer-motion` import there reaches almost every page. Infinite,
non-interactive loops belong in `globals.css` (`animate-loading-*`,
`animate-hero-rise`), which also keeps them off the main thread.

Note that framer-motion's chunk is on every page's eager set anyway because of
a Turbopack chunk-attribution bug (vercel/next.js#96042) — verified not fixable
by lazy-loading or `optimizePackageImports`. Do not spend time on it again.

## Performance work already tried that did NOT help

Measured on production, mobile Lighthouse, medians over 3-4 runs. Do not repeat
these — each one looked plausible and moved nothing.

| Attempt | Result |
|---|---|
| Remove framer-motion from `ui/Loading.tsx`, the `app/loading.tsx` barrel import and `app/not-found.tsx` | Homepage eager JS 1031 -> 991 KiB. **Score 64 -> 64.** Observed FCP unchanged (~2.35 s). Kept anyway: it is correct, just not the bottleneck. |
| Strip framer-motion from the three `dynamic({ssr:false})` users (ChatBot, SmartSearch, ColorMatchingTool) so the chunk could split out | Chunk still in the eager set, total still 991 KiB. Cause is Turbopack chunk attribution (vercel/next.js#96042), not the app. |
| Add `framer-motion` to `experimental.optimizePackageImports` | No change (991 KiB; chunk 131 vs 134 KB). Also needs a `next.config.js` deploy step, so not worth it. |
| Gate hero rotation on `deferredMediaReady` to stop the banner advancing mid-measurement | Rotation still landed inside the trace (~9 s) and Speed Index did not move. Kept anyway: it fixes a real bug (advancing to a slide whose image was never fetched). |
| Local Lighthouse A/B of a streaming-Suspense change | Cannot reproduce: a warm Next fetch cache means nothing suspends, so the fallback never paints. Verify streaming fixes on production only. |
| Google PageSpeed Insights API | 403 from an Iranian IP; anonymous quota exhausted through the proxy. Use local `npx lighthouse`. |
| Measuring with the shell's proxy env vars set | Adds a fake 8-9 s of TLS. Always `--noproxy '*'` / `--no-proxy-server`. |

| `experimental.turbopackChunking.maxMergeChunkSize: 100000` (below framer's 131 KB and gsap's 146 KB, so neither could be merged into a route that does not use them) | No change: 18 chunks, 991 KiB, framer still on the homepage. The knobs govern *merging*; this is *attribution*, so no chunking setting fixes it. Docs also mark the whole option "not recommended for production". |
| Splitting `lib/gsap.ts` (core) from `lib/gsap-plugins.ts` (ScrollTrigger etc.) | Already in place and correct for direct imports, but defeated by link prefetch: prefetching `/categories/trending` and `/collection/*` pulls their chunks, gsap included. |
| Turning off prefetch on the two remaining nav links | **Measured to do nothing.** Interleaved A/B, 3 pairs, `--blocked-url-patterns='*_rsc=*'` (removes 125 KB and 7 requests): score medians **87 normal vs 86 blocked**. TBT does halve (466/211/187 -> 151/94/284) but the score does not follow. An earlier reading of +4 points, and a byte-vs-score correlation that suggested ~10, were both run-to-run noise. Do not retry. |

## The homepage's remaining mobile gap is not in app code

Traced 2026-09-21 on a slow run (score 82, observed FCP 2374 ms). The timeline:

- document done 223 ms, CSS 289 ms, fonts 361 ms, LCP hero image **450 ms**
- `load` fires at **730 ms**
- Chrome runs a full paint at 1392 ms, `ActivateLayerTree` at 1413 ms
- then **no `DrawFrame` until 2379 ms**, with the main thread idle ~80% of that
  window (367 ms of `RunTask` across 2 s), and `firstPaint` finally at 2374 ms

So the screen is blank white for ~1.6 s *after* the page finished loading, with
everything it needs already in memory. `lcp-breakdown-insight` on that run is
TTFB 198 + resource load delay 20 + download 233 + **element render delay 1923**,
and `lcp-discovery-insight` passes all three checks.

Ruled out as causes, all verified in code — do not re-check these:
`ClientLayout` renders `{children}` while unmounted; `.page-transition-wrapper`
is already `opacity-100`; all 22 `opacity-0` classes in the served HTML are
`group-hover:` decorations; the hero is plain server-rendered markup
(`hero-slide absolute inset-0`, no opacity gate); `useScrollReveal` — the hook
that does `gsap.set(items, {autoAlpha: 0})` — is used only by blog and
collection components, never the homepage; all three `@font-face` rules are
`font-display: swap`; `.animate-slideUp` has no delay or fill-mode.

Everything loaded + main thread idle + layer tree activated + no frame presented
is the host starving headless Chrome's compositor, not the site. The same page
on the same machine renders at 563 ms and scores 100 on `--preset=desktop`.

**Run-to-run noise on this machine is +/- 12 points** (70 -> 94 on an identical
configuration). Treat any change smaller than ~15 points as unmeasurable here,
and settle real questions with field data, not this box.

Two traps worth naming separately:

- **Trust `observedFirstContentfulPaint`, not the simulated metric.** The
  framer-motion change improved *simulated* FCP by 341 ms while observed FCP did
  not move at all — Lighthouse was re-modelling a slightly smaller critical path,
  not reporting a real user-visible win.
- **Identical bytes + worse TBT/bootup = machine noise.** Compare
  `resource-summary` request counts and transfer sizes first; a background
  process at 30-40% CPU swings TBT by several hundred ms on its own.

What *did* work, for contrast: geometry-matched Suspense skeletons (CLS 0.30 ->
0) and `prefetch={false}` on listing links (score 64 -> 84, TBT 476 -> 172 ms).

## Measuring the live site from this machine

Two traps that will produce confidently wrong numbers:

- The shell exports `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` = `127.0.0.1:10808` (a local **xray**
  proxy). Everything is routed through it by default, which added **8–9 s of TLS time** to
  voxcina.com and looked like a server problem. Pass `--noproxy '*'` to curl and
  `--no-proxy-server` to Chrome. Direct TTFB is ~280 ms. This proxy is personal — never treat it
  as representative of real users, and never change it.
- Lighthouse's TBT/bootup metrics are CPU-sensitive. On a loaded desktop they can double while
  the page ships **byte-identical** resources. Before reporting a regression, compare
  `resource-summary` request counts and transfer sizes; if those match and LCP/CLS are flat, it
  is machine noise, not the code.
- Google PageSpeed Insights returns **403 from an Iranian IP**, and its anonymous quota is
  quickly exhausted through the proxy. Local `npx lighthouse` is the practical tool.

## CDN purge

`scripts/purge_arvan_cache.sh` wraps the ArvanCloud purge API (which works — verified 2026-09-21):

```bash
scripts/purge_arvan_cache.sh                  # purge everything
scripts/purge_arvan_cache.sh --urls U1,U2     # 1-50 URLs, then verify each
scripts/purge_arvan_cache.sh --no-verify      # skip the HIT warm-up
```

The key lives at `~/.config/voxcina/arvan_api_key` (mode 600, outside the repo, never committed);
the script also honors `$ARVAN_API_KEY` / `$ARVAN_API_KEY_FILE`. It purges only with
`{"purge":"all"}` or `{"purge":"individual","purge_urls":[...]}`, prints the API message, and then
GETs until `x-cache: HIT` so a purge is never mistaken for a warm edge. Raw call if the script is
unavailable:

```bash
curl -X POST "https://napi.arvancloud.ir/cdn/4.0/domains/voxcina.com/caching/purge" \
  -H "Authorization: Apikey $ARVAN_API_KEY" -H "Content-Type: application/json" \
  -d '{"purge":"all"}'      # -> 202 {"message":"Purging request sent successfully."}
```

Two traps, both seen live:
- **Verify with GET, never HEAD.** `curl -sSI` answers `x-cache: MISS` on every request even when
  the object is warm; the same URL over GET answers `MISS` then `HIT`. The old AGENTS.md
  instruction to check HEAD would have looked like a failed purge every time.
- A purge only marks entries stale; the first visitor repopulates them. Expect one slow request
  per purged URL, and prefer `--urls` over purge-all when you know what changed — purge-all sends
  every next request to the origin.

`PURGE_CDN=1 scripts/deploy_frontend.sh` purges the homepage after a deploy; `PURGE_CDN=all` purges
the whole domain. Both are opt-in on purpose: the default deploy has no purge step.

## Known-open issue

HTML is served **gzip even when the browser offers brotli** (29.4 KB vs 36.0 KB — ~18% wasted on
every page). Static `/_next/static/*` correctly gets brotli, so this is HTML-only, and q-values
are ignored (`br;q=1.0, gzip;q=0.1` still returns gzip). It is nginx/ArvanCloud config, not app
code. The candidate fix is `compress: false` in `next.config.js` so the origin stops gzipping —
but confirm the edge actually compresses first, or every page ships uncompressed at 313 KB.

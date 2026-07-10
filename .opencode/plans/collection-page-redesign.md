# Collection Page Redesign — Implementation Plan

Status: In progress
Owner: agent-implemented
Related skills used: gsap-core, gsap-scrolltrigger, gsap-plugins (SplitText, Flip), gsap-timeline, gsap-performance, gsap-utils

## Goal

Replace the existing thin, client-only `/collection/[collectionValue]` page with a
server-rendered, GSAP-powered collection experience:

1. **Act One — Intro overlay**: full-screen branded intro (collection name via
   SplitText char stagger + tagline), holds briefly, then animates away (3D
   scatter + curtain wipe) revealing the page. Skippable on scroll/click.
   Inspired by lassepedersen.biz's "Scroll / Swipe" cycling-label intro.
2. **Act Two — Stuck product grid**: pinned 4x4 GSAP ScrollTrigger scene where
   real product thumbnails from the collection zoom through 3D space
   (translateZ + opacity + blur) as the user scrolls, center 2x2 cell shows the
   collection name. Desktop only; mobile gets a simpler horizontal marquee
   fallback. Adapted from the user-supplied CSS `scroll-timeline` reference,
   reimplemented in GSAP for cross-browser support.
3. **Filter/sort bar + product grid**: sort dropdown + in-stock checkbox
   (mirrors `/categories/[slug]` UX), GSAP `ScrollTrigger.batch()` reveal for
   cards, GSAP Flip for smooth re-sort transitions, numbered pagination.

## Decisions (confirmed with user)

- Convert page to SSR (server component fetch + client component for
  interactivity), matching `CategoryPageClient` pattern.
- Add `sort` + `in_stock` query param support to the Go
  `GetProductsByCollection` handler (mirrors `ListProducts` logic).
- Add `gsap` + `@gsap/react` as real dependencies (previously removed from
  package.json; re-adding is approved).
- Stuck-grid hero uses **real product images** from the collection's color
  variants, not generic text/tech terms.
- Mobile: no 3D pin (perf/safety) — horizontal auto-scroll strip fallback.
- Reduced motion: skip intro exit animation (instant reveal), skip pin/3D
  (static collage fallback).

## Backend changes

`handlers/products.go` — `GetProductsByCollection`:
- Read `sort` query param, apply the same switch as `ListProducts`
  (newest/price-asc/price-desc/popular/discount) via `options.Find().SetSort(...)`.
- Read `in_stock=true` query param, add `filter["in_stock"] = true` when set
  (Note: existing filter checks `is_active`/`collection`; verify field name
  matches schema used in `ListProducts`, i.e. `in_stock` on the Product model).
- No model/schema changes — purely additive query parsing, backward
  compatible (existing calls without these params behave identically).

## Frontend file plan

| File | Action | Purpose |
|---|---|---|
| `front_end/package.json` | edit | add `gsap`, `@gsap/react` |
| `front_end/src/lib/gsap.ts` | new | central plugin registration (ScrollTrigger, SplitText, Flip), one-time |
| `front_end/src/app/collection/[collectionValue]/page.tsx` | rewrite | server component: SSR fetch, metadata, passes props |
| `front_end/src/app/collection/[collectionValue]/CollectionPageClient.tsx` | new | client component: intro + stuck grid + filter bar + product grid orchestration |
| `front_end/src/app/collection/[collectionValue]/loading.tsx` | new | skeleton via existing `ProductGridSkeleton` |
| `front_end/src/components/collection/CollectionIntro.tsx` | new | Act One overlay (SplitText intro/exit timeline) |
| `front_end/src/components/collection/StuckProductGrid.tsx` | new | Act Two pinned 3D scroll scene (desktop) + horizontal fallback (mobile) |
| `front_end/src/components/collection/CollectionFilterBar.tsx` | new | sort dropdown + in-stock checkbox, extracted/reusable |
| `front_end/src/components/collection/CollectionProductGrid.tsx` | new | wraps existing `ProductCard`, does ScrollTrigger.batch reveal + Flip on resort |

`ProductCard.tsx` / `ProductGrid.tsx` remain unmodified (still used elsewhere,
e.g. categories page) — the new `CollectionProductGrid` composes `ProductCard`
directly instead of using the generic `ProductGrid` wrapper, so we can attach
GSAP batch/Flip logic at the grid level without touching shared components.

## GSAP implementation notes (per skills)

- Central registration once in `lib/gsap.ts`:
  `gsap.registerPlugin(ScrollTrigger, SplitText, Flip)` — imported from
  `gsap/ScrollTrigger`, `gsap/SplitText`, `gsap/Flip` (all free, no auth
  token needed per gsap-plugins skill).
- All component-level GSAP usage via `useGSAP()` from `@gsap/react` for
  automatic cleanup/revert on unmount (per gsap-scrolltrigger + gsap-plugins
  best practices).
- `gsap.matchMedia()` for:
  - `isDesktop` (`min-width: 1024px`) → enables pin + 3D stuck grid.
  - `isMobile` → horizontal marquee fallback, no pin.
  - `prefersReducedMotion` → skip intro exit choreography and 3D animation,
    render static state immediately.
- Intro (`CollectionIntro.tsx`):
  - `SplitText.create(headlineRef, { type: "chars, words" })`, timeline:
    chars stagger in (`y, rotationX, blur` via autoAlpha) → hold → exit
    timeline scatters chars in 3D (`translateZ` per-char via function-based
    value + stagger from "random") while overlay clips away
    (`clipPath` polygon tween or two `scaleY` panels).
  - Cycling label ("اسکرول کنید" / "کشف کنید") via a small repeating
    timeline (`yoyo/repeat -1`) — killed on exit.
  - Skip-on-interaction: `Observer` (onDown/wheel/touch) or a simple
    scroll/click listener that calls `tl.progress(1)` (fast-forward) instead
    of restarting — respects an in-flight timeline per gsap-core "store the
    tween" best practice.
- Stuck grid (`StuckProductGrid.tsx`):
  - Desktop: `ScrollTrigger` with `pin: true`, `scrub: 1`, one master
    timeline; each grid-cell thumbnail gets its own `translateZ`/`opacity`/
    `filter blur` segment placed on the timeline at a distinct position
    (position parameter, not manual delays — per gsap-timeline best
    practice), replicating the reference CSS's per-item `animation-range`
    windows.
  - Uses real `ColorVariantListItem[]` thumbnails (first image per variant),
    cycling several products through each of the 16 grid cells across the
    scroll range (mirrors reference's cell reuse via multiple elements
    sharing one `grid-area`).
  - Center 2x2 cell = collection title (static, subtle float via
    `gsap.to(..., { y: "+=8", yoyo: true, repeat: -1 })`).
  - Mobile: `ScrollTrigger` free — plain `xPercent` marquee tween
    (`repeat: -1, ease: "none"`), no pin.
- Filter bar reveal: single `ScrollTrigger` (`toggleActions`), not scrub.
- Product grid (`CollectionProductGrid.tsx`):
  - `ScrollTrigger.batch(cardsSelector, { onEnter: stagger fade/y in,
    onLeaveBack: reset })` for scroll-in reveal (replaces framer-motion
    per-index delay).
  - On sort change: `Flip.getState(cards)` before re-fetch/re-render,
    `Flip.from(state, { duration: 0.5, ease: "power2.inOut" })` after DOM
    updates for smooth reflow.
- Performance: animate only `x/y/z/scale/rotation/opacity` (transform +
  autoAlpha), `will-change: transform` on actively-animating cells only,
  `ScrollTrigger.refresh()` called after images load if layout shifts.
- Cleanup: all ScrollTriggers/SplitText instances created inside
  `useGSAP(..., { scope: containerRef })` so `@gsap/react` reverts them
  automatically on unmount / route change (important since this is a
  client-navigable Next.js route).

## RTL considerations

- `x`/`translateX` GSAP transforms operate in physical (LTR) pixel space
  regardless of `dir="rtl"`. Horizontal marquee and any left/right-specific
  motion will be explicitly mirrored (negate direction) since the site is
  RTL-only (`html[dir="rtl"]`, see `layout.tsx:166`).
- Persian numerals/text in SplitText: default `type: "chars, words"` works
  for Persian script; verify visual stagger reads naturally in RTL (chars
  should reveal right-to-left, which stagger `from: "end"` or reversed array
  order may be needed to feel correct — verify visually during build and
  adjust `stagger.from` if needed).

## Accessibility / fallbacks

- `prefers-reduced-motion`: instant reveal, no pin, static grid image
  collage instead of animated stuck-grid.
- Intro must be skippable within ~1 interaction (scroll/click/tap) — no
  dead-end forced wait.
- All interactive thumbnails in the stuck grid get `pointer-events: none`
  except at/near peak visibility to avoid accidental navigation mid-animation.

## Verification plan (no test suite exists per AGENTS.md)

- `go vet ./...` after backend handler change.
- `npm run lint` in `front_end/` after all frontend changes.
- `npm run build` in `front_end/` to confirm production build succeeds with
  new gsap dependency and SSR conversion (catches type errors across
  server/client split).
- Manual smoke check: verify page compiles/dev-serves, no console errors
  from ScrollTrigger/SplitText registration order.

## Out of scope / explicitly deferred

- No changes to `ProductCard`/`ProductGrid` internals (kept intact for reuse
  on categories page etc.).
- No new smooth-scroll library (Lenis) — relying on native scroll +
  ScrollTrigger per plan Q&A.
- No changes to other collection-consuming surfaces (e.g.
  `SeasonalCollectionBanner.tsx`) beyond ensuring the link target still works.

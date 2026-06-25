# Plan: Migrate Voxcina Maps to Neshan (Complete Replacement)

## Goal

Replace all Leaflet/CARTO/OpenStreetMap usage in the Voxcina frontend with **Neshan Map Platform** (the same provider used by Digikala, Tapsi, Snapp, Divar). Add Persian address search and reverse geocoding for a significantly better UX for Iranian users, with fast tile loading from Iranian data centers.

## Current State

| File | Provider | Tile Source | Purpose |
|------|----------|-------------|---------|
| `front_end/src/components/ui/MapPicker.tsx` | Leaflet + CARTO Voyager | `basemaps.cartocdn.com` (US CDN) | Address picker (click + drag) — used in `/checkout` and `/dashboard/addresses` |
| `front_end/src/app/contact/ContactClient.tsx` | Leaflet + raw OSM | `tile.openstreetmap.org` (often blocked in Iran) | Static HQ marker on `/contact` page |
| `front_end/package.json` | `leaflet@^1.9.4` + `@types/leaflet@^1.9.18` | — | Both files use dynamic `import("leaflet")` |

Both files also pull CSS from `unpkg.com/leaflet.css` — a non-Iranian CDN.

### Issues with current setup
- Tiles served from US/EU CDNs → slow/blocked in Iran (matches the existing SOCKS proxy pain documented in AGENTS.md)
- No Persian place names or RTL rendering
- No address search — user can only click blindly on the map
- OSM raw tile server in the Contact page regularly 403s Iran IPs
- Inconsistent with major Iranian apps (Digikala, Tapsi, Snapp all use Neshan)

## Target Stack

**Neshan Map Platform** via **Mapbox-GL JS** (their official React wrapper):
- `@neshan-maps-platform/mapbox-gl-react` (official Neshan wrapper)
- `mapbox-gl` + `react-map-gl` v7 (peer dependencies)

Replaces `leaflet` + `@types/leaflet` entirely. Vector tiles, RTL support, Persian address search out of the box.

## What is needed from the user

**One secret: a Neshan API key** (single key covers Map + Search/Geocoding services).

### Steps to get the key
1. Register a free account at `https://platform.neshan.org/panel/login`
2. Create a project (e.g. "Voxcina Web")
3. Enable **Map (Web/Mobile SDK)** + **Search** services
4. Whitelist domains in the project settings: `voxcina.com`, `www.voxcina.com`, `localhost`
5. Copy the key (~40 character string) and paste it

### Free tier
- New accounts get **200,000 toman credit for 3 months** — covers development + low-traffic production
- Pay-as-you-go after that; typical small e-commerce site < 50,000 toman/month
- Tile loads: fractions of a toman per call
- Geocoding: tens of toman per request

### Key storage
- `front_end/.env` → `NEXT_PUBLIC_NESHAN_API_KEY=<key>` (gitignored, **not committed**)
- `front_end/.env.example` → `NEXT_PUBLIC_NESHAN_API_KEY=` placeholder (committed)
- `NEXT_PUBLIC_` prefix exposes it to the browser (Neshan SDK runs client-side, not server-side)
- `docker-compose.yml` → pass `NEXT_PUBLIC_NESHAN_API_KEY` to the running `front_end` container via the `environment:` block

## Decisions (confirmed with user)

1. **Reverse geocoding** — Yes, show the resolved Persian address below the map when the user clicks/drags the pin (matches Digikala/Snapp UX).
2. **Geolocation button** — Yes, add a "موقعیت من" (my-location) button using the browser geolocation API (HTTPS already on `voxcina.com`).
3. **Marker style** — Keep the current voxcina-blue drop pin (30px custom HTML marker) for visual consistency.
4. **Plan file location** — This file: `.opencode/plans/neshan-migration-plan.md`.

## Implementation Phases

### Phase 1 — Dependencies & config
1. `cd front_end && npm install @neshan-maps-platform/mapbox-gl-react mapbox-gl react-map-gl`
2. `npm uninstall leaflet @types/leaflet`
3. Create/update `front_end/.env` with `NEXT_PUBLIC_NESHAN_API_KEY=<key>` (gitignored)
4. Create/update `front_end/.env.example` with `NEXT_PUBLIC_NESHAN_API_KEY=` placeholder
5. Add `NEXT_PUBLIC_NESHAN_API_KEY: ${NEXT_PUBLIC_NESHAN_API_KEY}` to `docker-compose.yml` under `front_end.environment`

### Phase 2 — Rewrite `front_end/src/components/ui/MapPicker.tsx`

Props stay **identical** to the current implementation:
```ts
{ location: { lat: number; lng: number }, onChange: (loc: { lat: number; lng: number }) => void }
```

This means **no changes required** in:
- `front_end/src/app/(shop)/checkout/page.tsx` (line 987)
- `front_end/src/components/checkout/CheckoutForm.tsx` (line 423)
- `front_end/src/app/(dashboard)/dashboard/addresses/page.tsx` (line 765)

New features in the rewritten `MapPicker`:
- **Persian address search bar** above the map (Neshan Search API, 300ms debounce, RTL suggestions dropdown)
- **Reverse geocoding**: when the user clicks/drags the pin, the resolved Persian address is shown below the map
- **"موقعیت من" (my-location) button** using browser geolocation → map pans to current location
- Custom voxcina-blue drop pin marker (30px, HTML-styled) matching the current visual
- Iran-centered default view (Tehran, zoom 5) when no `location` is provided
- Smooth pan/zoom when the parent updates `location.lat` / `location.lng`
- Initial value at Iran's geographic center (32.427908, 53.688046) per current implementation

### Phase 3 — Extract the contact page map
- Create new file: `front_end/src/components/ui/NeshanStaticMap.tsx` — display-only map, no search/controls, custom marker + Persian popup
- Replace the inline `MapComponent` (lines 21–123) in `front_end/src/app/contact/ContactClient.tsx` with:
  ```tsx
  <NeshanStaticMap
    lat={35.762843063507674}
    lng={51.46413943689942}
    title="دفتر مرکزی Voxcina"
    address="تهران، پاسداران"
  />
  ```
- Same HQ coordinates, no functional change for the user

### Phase 4 — Verify, commit, deploy
1. `cd front_end && npm run lint` — must be clean
2. `cd front_end && npm run build` — must succeed
3. Commit on `develop` branch (no force-push, **no secrets in commit**)
4. Deploy via **full rebuild** (new npm packages — per AGENTS.md "Frontend deploy (new npm packages)"):
   ```bash
   ssh vps-ir "cd /root/voxcina && git pull origin develop && \
     docker compose build --no-cache front_end && \
     docker compose up -d front_end"
   ```
5. Verify on `voxcina.com`:
   - Map renders on `/contact` page
   - Map renders + search works in `/dashboard/addresses` and `/checkout`
   - Cart icon in dashboard still shows correct count (sanity check)

## Files to be changed/created

**Modified (4):**
- `front_end/package.json` — swap dependencies (remove `leaflet` + `@types/leaflet`, add `@neshan-maps-platform/mapbox-gl-react` + `mapbox-gl` + `react-map-gl`)
- `front_end/src/components/ui/MapPicker.tsx` — full rewrite using Neshan
- `front_end/src/app/contact/ContactClient.tsx` — replace inline `MapComponent` (lines 21–123) with `<NeshanStaticMap />`
- `docker-compose.yml` — add `NEXT_PUBLIC_NESHAN_API_KEY` env var under `front_end.environment`

**New (1):**
- `front_end/src/components/ui/NeshanStaticMap.tsx` — display-only map component for the contact page

**Config (2):**
- `front_end/.env` — `NEXT_PUBLIC_NESHAN_API_KEY=<key>` (**gitignored**)
- `front_end/.env.example` — `NEXT_PUBLIC_NESHAN_API_KEY=` placeholder (committed)

**Effectively removed (no manual deletion needed, replaced by rewrite):**
- Both `<link rel="stylesheet" href="https://unpkg.com/leaflet@.../leaflet.css" />` tags in `MapPicker.tsx` and `ContactClient.tsx`
- All dynamic `import("leaflet")` calls in both files
- The `Leaflet` CSS import
- `leaflet` and `@types/leaflet` from `package.json`

## What will NOT be done
- Will not change `MapPicker`'s public props interface → zero impact on its 3 callers
- Will not change the HQ marker coordinates on the contact page
- Will not proxy Neshan calls through the Go backend (called directly from the browser)
- Will not commit the API key to git
- Will not force-push or rewrite git history
- Will not touch the notification icon (per previous turn, kept decorative)
- Will not touch any unrelated UI (cart icon, search bar, etc. were already fixed in prior commits)

## Rollback plan

If something breaks after deploy:
1. Revert the `develop` branch: `git revert HEAD~N..HEAD && git push origin develop`
2. Rebuild + redeploy: `ssh vps-ir "cd /root/voxcina && docker compose build --no-cache front_end && docker compose up -d front_end"`
3. The previous Leaflet + CARTO implementation is preserved in git history

## Open follow-ups (not blocking)

- Consider adding Neshan static map image API for email confirmations (showing the order address in transactional emails) — separate task
- Consider a server-side proxy for the geocoding API to hide the key from network tab (current setup exposes `NEXT_PUBLIC_NESHAN_API_KEY` in the browser, which is the standard approach but worth knowing)

## To proceed

The user needs to provide the **Neshan API key**, then say "go" (or equivalent). Implementation will:
1. Install/uninstall dependencies
2. Rewrite `MapPicker.tsx`
3. Create `NeshanStaticMap.tsx`
4. Update `ContactClient.tsx`
5. Update `docker-compose.yml`, `.env`, `.env.example`
6. Run `npm run lint` and `npm run build` for verification
7. Commit on `develop` (no secrets)
8. Trigger the full rebuild deploy on `vps-ir`

#!/usr/bin/env bash
# Frontend deploy with cache safeguards.
#
# Sequence (matches AGENTS.md "Deployment" + "Caching and CDN"):
#   1. pull develop on the VPS (worktree must be clean)
#   2. build: image rebuild when package.json/package-lock.json/Dockerfile changed,
#      otherwise the fast flow (docker cp src [+ next.config.js] + in-container build)
#   3. restart the container and wait until Next is Ready
#   4. warm the homepage origin-direct until its ISR entry actually renders
#      product links — a fresh container starts from the build-time prerender,
#      which has no backend data, and an empty render must never reach the CDN
#   5. call /api/revalidate (origin-direct, REVALIDATE_SECRET) to drop stale tags
#   6. purge the ArvanCloud CDN (ARVAN_API_KEY); without a key, print a reminder
#   7. verify the public homepage
#
# Usage: scripts/deploy_frontend.sh [branch]

set -euo pipefail

BRANCH="${1:-develop}"
VPS="vps-ir"
VPS_DIR="/root/voxcina"
CONTAINER="voxcina_frontend"
PUBLIC_URL="https://voxcina.com"
# Max requests before giving up on a warm, healthy origin render.
WARM_MAX_TRIES=30
WARM_SLEEP=2

echo "==> Pulling ${BRANCH} on the VPS"
ssh -o ConnectTimeout=10 "${VPS}" "cd ${VPS_DIR} && git status --short | head -5 && git pull --ff-only origin ${BRANCH}" >/dev/null
SHA=$(ssh -o ConnectTimeout=10 "${VPS}" "cd ${VPS_DIR} && git rev-parse --short HEAD")
echo "VPS at ${SHA}"

# Fast flow vs image rebuild: package/lockfile/Dockerfile changes cannot reach
# the running container through docker cp alone (new dependencies would be
# missing), so those files force a compose image build.
NEEDS_IMAGE_BUILD=$(ssh -o ConnectTimeout=10 "${VPS}" "cd ${VPS_DIR} && git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -E '(^front_end/(package.json|package-lock.json|Dockerfile)$)' | head -1 || true")

if [ -n "${NEEDS_IMAGE_BUILD}" ]; then
  echo "==> package files changed — image rebuild"
  ssh -o ConnectTimeout=10 "${VPS}" "cd ${VPS_DIR} && docker compose build front_end && docker compose up -d front_end" >/dev/null
else
  echo "==> fast flow (docker cp + in-container build)"
  ssh -o ConnectTimeout=10 "${VPS}" "docker cp ${VPS_DIR}/front_end/src/. ${CONTAINER}:/app/src/" >/dev/null
  if ssh -o ConnectTimeout=10 "${VPS}" "git -C ${VPS_DIR} diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -q 'front_end/next.config.js'" ; then
    echo "    next.config.js changed — copying it too"
    ssh -o ConnectTimeout=10 "${VPS}" "docker cp ${VPS_DIR}/front_end/next.config.js ${CONTAINER}:/app/next.config.js" >/dev/null
  fi
  ssh -o ConnectTimeout=10 "${VPS}" "docker exec ${CONTAINER} npm run build" >/dev/null
  ssh -o ConnectTimeout=10 "${VPS}" "docker restart ${CONTAINER}" >/dev/null
fi

echo "==> Waiting for Next to become Ready"
for i in $(seq 1 30); do
  if ssh -o ConnectTimeout=10 "${VPS}" "docker logs ${CONTAINER} --since 5m 2>&1 | grep -q 'Ready in'"; then
    echo "    Ready (attempt ${i})"
    break
  fi
  sleep 2
done

warm_origin() {
  local tries="$1"
  local i count
  for i in $(seq 1 "${tries}"); do
    count=$(ssh -o ConnectTimeout=10 "${VPS}" "curl -sS --compressed http://localhost:3000/ | grep -o 'href=\"/products/' | wc -l" || echo 0)
    if [ "${count}" -gt 0 ]; then
      echo "    healthy on attempt ${i} (${count} product links)"
      return 0
    fi
    sleep "${WARM_SLEEP}"
  done
  return 1
}

echo "==> Warming the homepage (origin-direct) until it renders products"
# A fresh container serves its build-time prerender (no backend data) and its
# in-memory ISR cache can hold a poisoned empty entry from the first seconds —
# disk flushes and tag revalidation do NOT evict it. Warm first; if the origin
# keeps serving an empty page, flush the disk caches and restart the process
# (restart = clean regen; verified to converge), then warm again.
if ! warm_origin "${WARM_MAX_TRIES}"; then
  echo "    origin still empty — flushing disk caches and restarting (clean regen)"
  ssh -o ConnectTimeout=10 "${VPS}" "docker exec ${CONTAINER} sh -c 'rm -rf /app/.next/cache/fetch-cache; rm -f /app/.next/server/app/index.html /app/.next/server/app/index.meta /app/.next/server/app/index.rsc; rm -f /app/.next/server/app/index.segments/*.rsc 2>/dev/null; true' && docker restart ${CONTAINER}" >/dev/null
  sleep 8
  if ! warm_origin "${WARM_MAX_TRIES}"; then
    echo "FATAL: origin never rendered a healthy homepage — NOT purging the CDN (an empty page would be cached for visitors)." >&2
    exit 1
  fi
fi

echo "==> Revalidating ISR tags (origin-direct)"
ssh -o ConnectTimeout=10 "${VPS}" "cd ${VPS_DIR} && SECRET=\$(grep '^REVALIDATE_SECRET=' .env | cut -d= -f2-); curl -sS -X POST http://localhost:3000/api/revalidate -H 'Content-Type: application/json' -H \"x-revalidate-secret: \${SECRET}\" -d '{\"tags\":[\"home\",\"featured-products\",\"new-products\",\"hero-images\",\"sliders\",\"categories\"]}'"
echo

echo "==> Purging the ArvanCloud CDN"
ssh -o ConnectTimeout=10 "${VPS}" "cd ${VPS_DIR} && KEY=\$(grep '^ARVAN_API_KEY=' .env | cut -d= -f2-); if [ -n \"\${KEY}\" ]; then curl -sS -X POST 'https://napi.arvancloud.ir/cdn/4.0/domains/voxcina.com/caching/purge' -H \"Authorization: Apikey \${KEY}\" -H 'Content-Type: application/json' -d '{\"purge\":\"all\"}' | head -c 200; echo; else echo 'ARVAN_API_KEY not set in .env — purge the CDN manually from the ArvanCloud dashboard now.'; fi"

echo "==> Verifying the public homepage"
sleep 5
PUBLIC_COUNT=$(curl -sS --compressed "${PUBLIC_URL}/" | grep -o 'href="/products/' | wc -l || echo 0)
if [ "${PUBLIC_COUNT}" -gt 0 ]; then
  echo "OK: public homepage renders ${PUBLIC_COUNT} product links."
else
  echo "WARNING: public homepage still renders no products — if ARVAN_API_KEY was missing, purge the CDN manually and re-check with:"
  echo "  curl -sSI --compressed ${PUBLIC_URL}/ | grep -iE 'x-cache|server-timing'"
  exit 1
fi

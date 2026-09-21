#!/usr/bin/env bash
# Purge the ArvanCloud CDN cache for voxcina.com.
#
#   scripts/purge_arvan_cache.sh                  # purge everything
#   scripts/purge_arvan_cache.sh --urls U1,U2     # purge 1-50 specific URLs
#   scripts/purge_arvan_cache.sh --no-verify      # skip the HIT warm-up
#
# The API key is read from $ARVAN_API_KEY, else $ARVAN_API_KEY_FILE, else
# ~/.config/voxcina/arvan_api_key (mode 600). Never commit it.
#
# Notes for whoever runs this next:
#   - A purge only marks entries stale; the next request repopulates them, so
#     verify with GET (HEAD always answers x-cache: MISS, even when warm).
#   - `purge: all` sends every visitor's next request to the origin; prefer
#     `--urls` when you know what changed.
#   - ARVAN_PURGE_USE_PROXY=1 routes curl through the shell's HTTP(S)_PROXY.
#
# Usage as a deploy tail: PURGE_CDN=1 scripts/deploy_frontend.sh

set -euo pipefail

DOMAIN="${ARVAN_DOMAIN:-voxcina.com}"
API_URL="https://napi.arvancloud.ir/cdn/4.0/domains/${DOMAIN}/caching/purge"
KEY_FILE="${ARVAN_API_KEY_FILE:-${HOME}/.config/voxcina/arvan_api_key}"

MODE="all"
VERIFY=1
URLS=()

usage() {
  sed -n '3,9p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --urls)
      [[ $# -ge 2 ]] || { echo "error: --urls needs a comma-separated list" >&2; exit 2; }
      MODE="individual"
      IFS=',' read -r -a URLS <<<"$2"
      shift 2
      ;;
    --no-verify) VERIFY=0; shift ;;
    -h|--help) usage 0 ;;
    *) echo "error: unknown argument '$1'" >&2; usage 2 ;;
  esac
done

if [[ "$MODE" == "individual" ]]; then
  if [[ "${#URLS[@]}" -lt 1 || "${#URLS[@]}" -gt 50 ]]; then
    echo "error: ArvanCloud accepts 1-50 URLs per individual purge (got ${#URLS[@]})" >&2
    exit 2
  fi
fi

if [[ -n "${ARVAN_API_KEY:-}" ]]; then
  KEY="$ARVAN_API_KEY"
elif [[ -f "$KEY_FILE" ]]; then
  KEY="$(tr -d '[:space:]' <"$KEY_FILE")"
else
  echo "error: no API key. Set ARVAN_API_KEY or write it to ${KEY_FILE}" >&2
  exit 1
fi

CURL=(curl -sS --max-time 30)
[[ "${ARVAN_PURGE_USE_PROXY:-0}" == "1" ]] || CURL+=(--noproxy '*')

if [[ "$MODE" == "all" ]]; then
  PAYLOAD='{"purge":"all"}'
  echo "==> Purging the entire ${DOMAIN} cache"
else
  PAYLOAD="$(printf '%s\n' "${URLS[@]}" | grep -v '^$' | sed 's/.*/"&"/' | paste -sd, -)"
  PAYLOAD="{\"purge\":\"individual\",\"purge_urls\":[${PAYLOAD}]}"
  echo "==> Purging ${#URLS[@]} URL(s) on ${DOMAIN}"
fi

RESPONSE="$("${CURL[@]}" -o - -w $'\n%{http_code}' -X POST "$API_URL" \
  -H "Authorization: Apikey ${KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")"
STATUS="${RESPONSE##*$'\n'}"
BODY="${RESPONSE%$'\n'*}"

if [[ "$STATUS" != "202" && "$STATUS" != "200" ]]; then
  echo "error: purge failed with HTTP ${STATUS}: ${BODY}" >&2
  exit 1
fi
echo "    $(grep -o '"message":"[^"]*"' <<<"$BODY" | cut -d'"' -f4 || echo "$BODY")"

[[ "$VERIFY" == "1" ]] || exit 0

if [[ "$MODE" == "individual" ]]; then
  VERIFY_URLS=("${URLS[@]}")
else
  VERIFY_URLS=("https://${DOMAIN}/")
fi

for url in "${VERIFY_URLS[@]}"; do
  if [[ "$url" != http* ]]; then url="https://${DOMAIN}${url}"; fi
  cache="MISS"
  for _ in 1 2 3 4 5; do
    cache="$(curl -sS --compressed --max-time 30 --noproxy '*' -o /dev/null -D - "$url" |
      tr -d '\r' | awk 'tolower($1) == "x-cache:" { print $2; exit }')"
    [[ "$cache" == "HIT" ]] && break
    sleep 2
  done
  if [[ "$cache" == "HIT" ]]; then
    echo "    ${url} -> x-cache: HIT"
  else
    echo "warning: ${url} never reported x-cache: HIT (the edge may be revalidating)" >&2
  fi
done

#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-develop}"
SERVICE="${2:-front_end}"
REPO_DIR="$( cd -- "$(dirname "$0")/.." && pwd )"
cd "$REPO_DIR"

while true; do
  git fetch origin "$BRANCH"
  LOCAL=$(git rev-parse "$BRANCH")
  REMOTE=$(git rev-parse "origin/$BRANCH")

  if [[ "$LOCAL" != "$REMOTE" ]]; then
    printf '\n[%s] New commits detected – redeploying…\n' "$(date +'%F %T')"
    git pull --ff-only origin "$BRANCH"
    docker compose stop "$SERVICE"
    docker compose build "$SERVICE"
    docker compose up -d "$SERVICE" --remove-orphans
    printf '[%s] Done.\n' "$(date +'%F %T')"
  else
    printf '[%s] No changes.\n' "$(date +'%F %T')"
  fi
  sleep 60
done 
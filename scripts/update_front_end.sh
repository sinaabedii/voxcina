#!/usr/bin/env bash
set -uo pipefail

BRANCH="${1:-develop}"
REPO_DIR="$( cd -- "$(dirname "$0")/.." && pwd )"
cd "$REPO_DIR"

# Network retry configuration
MAX_RETRIES=5
BASE_RETRY_DELAY=5

# Function to perform network operations with retry and exponential backoff
retry_network_operation() {
  local cmd="$1"
  local operation_name="$2"
  local retry_count=0
  
  while [[ $retry_count -lt $MAX_RETRIES ]]; do
    if eval "$cmd"; then
      return 0
    fi
    
    retry_count=$((retry_count + 1))
    local delay=$((BASE_RETRY_DELAY * (2 ** (retry_count - 1))))
    
    if [[ $retry_count -lt $MAX_RETRIES ]]; then
      printf '[%s] Network error: %s failed (attempt %d/%d). Retrying in %d seconds...\n' \
        "$(date +'%F %T')" "$operation_name" "$retry_count" "$MAX_RETRIES" "$delay"
      sleep "$delay"
    else
      printf '[%s] Network error: %s failed after %d attempts. Will retry full cycle in 60 seconds...\n' \
        "$(date +'%F %T')" "$operation_name" "$MAX_RETRIES"
      return 1
    fi
  done
}

# Function to check basic network connectivity
check_network() {
  # Try to resolve DNS and ping a reliable host
  if ! timeout 10 nslookup github.com >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

while true; do
  # Check basic network connectivity first
  if ! check_network; then
    printf '[%s] Network connectivity issue detected. Waiting 30 seconds before retrying...\n' "$(date +'%F %T')"
    sleep 30
    continue
  fi

  # Fetch with timeout and retry logic
  if ! retry_network_operation "timeout 30 git fetch origin '$BRANCH' 2>/dev/null" "git fetch"; then
    sleep 60
    continue
  fi
  
  if ! LOCAL=$(git rev-parse "$BRANCH" 2>/dev/null); then
    printf '[%s] Error: Failed to get local branch revision. Retrying in 60 seconds...\n' "$(date +'%F %T')"
    sleep 60
    continue
  fi
  
  if ! REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null); then
    printf '[%s] Error: Failed to get remote branch revision. Retrying in 60 seconds...\n' "$(date +'%F %T')"
    sleep 60
    continue
  fi

  if [[ "$LOCAL" != "$REMOTE" ]]; then
    printf '\n[%s] New commits detected – redeploying…\n' "$(date +'%F %T')"
    
    # Pull with timeout and retry logic
    if ! retry_network_operation "timeout 60 git pull origin '$BRANCH'" "git pull"; then
      sleep 60
      continue
    fi
    
    if ! docker compose stop; then
      printf '[%s] Warning: Failed to stop services, continuing with build...\n' "$(date +'%F %T')"
    fi
    
    if ! docker compose build; then
      printf '[%s] Error: Failed to build services. Retrying in 60 seconds...\n' "$(date +'%F %T')"
      sleep 60
      continue
    fi
    
    if ! docker compose up -d --remove-orphans; then
      printf '[%s] Error: Failed to start services. Retrying in 60 seconds...\n' "$(date +'%F %T')"
      sleep 60
      continue
    fi
    
    if ! sudo docker system prune -f; then
      printf '[%s] Warning: Failed to prune docker system, continuing...\n' "$(date +'%F %T')"
    fi
    
    printf '[%s] Done.\n' "$(date +'%F %T')"
  else
    printf '[%s] No changes.\n' "$(date +'%F %T')"
  fi
  sleep 60
done
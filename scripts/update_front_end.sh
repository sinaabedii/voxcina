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

initial_deployment_done=false

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

  # Check if there are new commits or if it's the initial deployment phase
  if [[ "$LOCAL" != "$REMOTE" ]] || [[ "$initial_deployment_done" == "false" ]]; then
    
    # --- Log reason for action ---
    if [[ "$initial_deployment_done" == "false" ]]; then
      printf '[%s] Performing initial service deployment (or retrying a failed one)...\n' "$(date +'%F %T')"
      if [[ "$LOCAL" == "$REMOTE" ]]; then
        printf '[%s] No new commits on %s. Will ensure services are (re)started.\n' "$(date +'%F %T')" "$BRANCH"
      else # New commits found during initial check
        printf '[%s] New commits detected on %s during initial check. Will pull and deploy.\n' "$(date +'%F %T')" "$BRANCH"
      fi
    else # This means $LOCAL != $REMOTE and initial_deployment_done is true
      printf '[%s] New commits detected on %s – redeploying…\n' "$(date +'%F %T')" "$BRANCH"
    fi

    # --- Git Pull (if needed) ---
    if [[ "$LOCAL" != "$REMOTE" ]]; then
      printf '[%s] Pulling changes from origin/%s...\n' "$(date +'%F %T')" "$BRANCH"
      if ! retry_network_operation "timeout 60 git pull origin '$BRANCH'" "git pull"; then
        sleep 60
        continue # Retry the whole loop; initial_deployment_done remains false if it was
      fi
    fi
    
    # --- Docker Operations ---
    printf '[%s] Stopping services (if any)...\n' "$(date +'%F %T')"
    if ! docker compose stop; then
      printf '[%s] Warning: Failed to stop services, continuing with build...\n' "$(date +'%F %T')"
    fi
    
    printf '[%s] Building services...\n' "$(date +'%F %T')"
    if ! docker compose build; then
      printf '[%s] Error: Failed to build services. Retrying full cycle in 60 seconds...\n' "$(date +'%F %T')"
      sleep 60
      continue # Retry; initial_deployment_done remains false if it was
    fi
    
    printf '[%s] Starting services...\n' "$(date +'%F %T')"
    if ! docker compose up -d --remove-orphans; then
      printf '[%s] Error: Failed to start services. Retrying full cycle in 60 seconds...\n' "$(date +'%F %T')"
      sleep 60
      continue # Retry; initial_deployment_done remains false if it was
    fi
    
    printf '[%s] Pruning Docker system...\n' "$(date +'%F %T')"
    if ! sudo docker system prune -f; then
      printf '[%s] Warning: Failed to prune docker system, continuing...\n' "$(date +'%F %T')"
    fi
    
    # --- Finalize and set flag ---
    if [[ "$initial_deployment_done" == "false" ]]; then
      printf '[%s] Initial service deployment successful. Monitoring for changes.\n' "$(date +'%F %T')"
      initial_deployment_done=true # Crucial: set flag AFTER all operations succeeded
    else
      printf '[%s] Service update successful. Monitoring for changes.\n' "$(date +'%F %T')"
    fi

  else
    # This case means $LOCAL == $REMOTE AND initial_deployment_done is true
    printf '[%s] No changes on %s. Services are confirmed running.\n' "$(date +'%F %T')" "$BRANCH"
  fi
  sleep 60
done
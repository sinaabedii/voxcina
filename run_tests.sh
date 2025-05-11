#!/bin/sh

echo "Waiting for API server to be ready..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
  attempt=$((attempt+1))
  
  # Try to connect to the API health endpoint
  response=$(curl -s -o /dev/null -w "%{http_code}" http://server:8080/api/health || echo "000")
  
  if [ "$response" = "200" ]; then
    echo "API server is ready!"
    break
  fi
  
  echo "API server not ready yet (attempt $attempt/$max_attempts)..."
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo "API server failed to start after $max_attempts attempts"
  exit 1
fi

echo "Starting API tests..."
cd /app && go test -v ./test/...
test_result=$?

echo "Tests completed with exit code: $test_result"
exit $test_result 
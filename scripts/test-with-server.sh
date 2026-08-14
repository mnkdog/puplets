#!/bin/bash
set -e

# Dave Farley approach: Autonomous test execution
# Start server, wait for ready, test, cleanup - all automatic

# Kill any existing server on port 8080
echo "Checking for existing server on port 8080..."
pkill -f "http-server.*8080" 2>/dev/null || true
sleep 0.5

echo "Starting dev server on port 8080..."
npx http-server src -p 8080 > /dev/null 2>&1 &
SERVER_PID=$!

# Ensure cleanup on exit
cleanup() {
  echo "Stopping dev server..."
  kill $SERVER_PID 2>/dev/null || true
  wait $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for server to be ready
echo "Waiting for server to be ready..."
npx wait-on http://localhost:8080 -t 10000

echo "Running BDD tests..."
cucumber-js

echo "✓ Tests complete"

#!/usr/bin/env bash
# Run backend and frontend dev servers together.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for dir in backend frontend; do
  if [ ! -f "$ROOT_DIR/$dir/.env" ]; then
    echo "Warning: $dir/.env not found (copy $dir/.env.example first)" >&2
  fi
  if [ ! -d "$ROOT_DIR/$dir/node_modules" ]; then
    echo "Installing $dir dependencies..."
    (cd "$ROOT_DIR/$dir" && npm install)
  fi
done

cleanup() {
  echo "Stopping dev servers..."
  kill 0
}
trap cleanup EXIT INT TERM

(cd "$ROOT_DIR/backend" && npm run dev) &
(cd "$ROOT_DIR/frontend" && npm run dev) &

wait

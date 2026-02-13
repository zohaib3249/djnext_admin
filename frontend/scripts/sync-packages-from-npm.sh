#!/usr/bin/env bash
# List current frontend package versions (like pip show for backend).
# Run from repo root or frontend/: uses frontend/package.json and node_modules.
# Usage: ./scripts/sync-packages-from-npm.sh
#
# Use output to align package.json "dependencies" and "devDependencies" with installed versions.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$FRONTEND_DIR"

if ! command -v npm &>/dev/null; then
  echo "Error: npm not found. Install Node.js and ensure npm is on PATH." >&2
  exit 1
fi

echo "Frontend dir: $FRONTEND_DIR"
echo "Installed versions (npm list --depth=0):"
echo ""
npm list --depth=0 2>&1

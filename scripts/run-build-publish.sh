#!/usr/bin/env bash
# Local automation for .github/workflows/build-publish.yml
# Run from repo root (ecom) or from djnext_admin. Builds frontend + Python package; optionally publishes to PyPI.
#
# Usage:
#   ./scripts/run-build-publish.sh              # build only (dry run)
#   ./scripts/run-build-publish.sh --publish     # build and publish (requires PYPI_API_TOKEN)
#   VERSION=0.2.0 ./scripts/run-build-publish.sh  # build with specific version
#
# Env:
#   DRY_RUN=1           Skip PyPI publish (default if --publish not passed)
#   PYPI_API_TOKEN      Required for --publish
#   VERSION             Override version (e.g. 0.2.0); else read from __init__.py

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Package dir: parent of scripts/ (djnext_admin when in monorepo or standalone)
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PKG_DIR/frontend"

if [ ! -f "$PKG_DIR/setup.py" ] || [ ! -d "$FRONTEND_DIR" ]; then
  echo "Error: setup.py and frontend/ not found under $PKG_DIR" >&2
  exit 1
fi
cd "$PKG_DIR"

echo "== Package directory: $PKG_DIR"
echo ""

# --- Build frontend ---
echo "== [1/4] Building frontend (no NEXT_PUBLIC_* env)..."
if ! command -v npm &>/dev/null; then
  echo "Error: npm not found. Install Node.js 20+ and ensure npm is on PATH." >&2
  exit 1
fi
cd "$FRONTEND_DIR"
npm ci
npm run build
cd "$PKG_DIR"
echo "   Frontend build OK: $FRONTEND_DIR/out"
echo ""

# --- Version ---
DO_PUBLISH=false
if [[ " $* " == *" --publish "* ]]; then
  DO_PUBLISH=true
fi

if [ -n "$VERSION" ]; then
  echo "== [2/4] Using version from env: $VERSION"
  sed -i.bak "s/^__version__ = .*/__version__ = '$VERSION'/" "$PKG_DIR/__init__.py"
  rm -f "$PKG_DIR/__init__.py.bak"
else
  VERSION=$(grep -E "^__version__\s*=\s*['\"]" "$PKG_DIR/__init__.py" | sed -E "s/^__version__\s*=\s*['\"]([^'\"]+)['\"].*/\1/")
  if [ -z "$VERSION" ]; then VERSION="0.1.0"; fi
  echo "== [2/4] Version from __init__.py: $VERSION"
fi
echo ""

# --- Build Python package ---
echo "== [3/4] Building Python package (wheel + sdist)..."
if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
  echo "Error: python not found. Install Python 3.12+." >&2
  exit 1
fi
PYTHON=$(command -v python3 2>/dev/null || command -v python)
$PYTHON -m pip install --upgrade pip -q
$PYTHON -m pip install -r requirements-build.txt -q
$PYTHON -m build
echo "   Build OK: $PKG_DIR/dist/"
echo ""

# --- Publish (optional) ---
echo "== [4/4] Publish to PyPI"
if [ "$DO_PUBLISH" = true ]; then
  if [ -z "$PYPI_API_TOKEN" ]; then
    echo "Error: PYPI_API_TOKEN is required for --publish." >&2
    exit 1
  fi
  $PYTHON -m pip install twine -q
  $PYTHON -m twine upload --skip-existing -u __token__ -p "$PYPI_API_TOKEN" dist/*
  echo "   Published version $VERSION to PyPI."
else
  echo "   Skipped (dry run). To publish: PYPI_API_TOKEN=xxx $0 --publish"
fi

echo ""
echo "Done. Version: $VERSION | Frontend: $FRONTEND_DIR/out | Dist: $PKG_DIR/dist/"

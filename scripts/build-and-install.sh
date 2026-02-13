#!/usr/bin/env bash
# Build djnext_admin (frontend + post-build + wheel) and install into a target Django project's venv.
#
# Usage:
#   VENV=/path/to/your/project/.venv   ./scripts/build-and-install.sh
#   # or
#   TARGET_PROJECT=/path/to/django/project  VENV=/path/to/venv  ./scripts/build-and-install.sh
#
# Required:
#   VENV         Path to virtualenv (directory that contains bin/python). Used for build and install.
#
# Optional:
#   TARGET_PROJECT  Django project root (directory with manage.py). Default: same as VENV parent (e.g. /path/to/project/.venv -> /path/to/project).
#   SKIP_FRONTEND=1  Skip npm build and post-build; use existing frontend/out and templates/static if present.
#
# Examples:
#   VENV=/home/me/myproject/.venv ./scripts/build-and-install.sh
#   VENV=/home/me/.venv TARGET_PROJECT=/home/me/myproject ./scripts/build-and-install.sh
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PKG_DIR/frontend"

if [ -z "$VENV" ]; then
  echo "Error: VENV is required (path to virtualenv, e.g. /path/to/myproject/.venv)." >&2
  echo "Usage: VENV=/path/to/venv ./scripts/build-and-install.sh" >&2
  exit 1
fi

VENV="$(cd "$VENV" && pwd)"
if [ ! -x "$VENV/bin/python" ]; then
  echo "Error: $VENV does not contain bin/python." >&2
  exit 1
fi

if [ -n "$TARGET_PROJECT" ]; then
  TARGET_PROJECT="$(cd "$TARGET_PROJECT" && pwd)"
else
  TARGET_PROJECT="$(cd "$(dirname "$VENV")" && pwd)"
fi

if [ ! -f "$TARGET_PROJECT/manage.py" ]; then
  echo "Error: $TARGET_PROJECT has no manage.py. Set TARGET_PROJECT to your Django project root." >&2
  exit 1
fi

if [ ! -f "$PKG_DIR/setup.py" ] || [ ! -d "$FRONTEND_DIR" ]; then
  echo "Error: setup.py and frontend/ not found under $PKG_DIR" >&2
  exit 1
fi

PYTHON="$VENV/bin/python"
PIP="$VENV/bin/pip"

cd "$PKG_DIR"
echo "== Package: $PKG_DIR"
echo "== Venv:    $VENV"
echo "== Target:  $TARGET_PROJECT"
echo ""

# --- 1. Frontend build ---
echo "== [1/4] Frontend build..."
if [ "$SKIP_FRONTEND" = "1" ]; then
  echo "   Skipped (SKIP_FRONTEND=1)"
else
  if ! command -v npm &>/dev/null; then
    echo "Error: npm not found. Install Node.js 20+." >&2
    exit 1
  fi
  cd "$FRONTEND_DIR"
  npm ci
  npm run build
  cd "$PKG_DIR"
  echo "   OK: $FRONTEND_DIR/out"
  "$PYTHON" scripts/post-build-to-static.py
  echo "   OK: templates/ + static/ (post-build)"
fi
echo ""

# --- 2. Wheel build ---
echo "== [2/4] PyPI build (wheel + sdist)..."
"$PIP" install -q --upgrade pip
"$PIP" install -q -r requirements-build.txt
"$PYTHON" -m build
echo "   OK: $PKG_DIR/dist/"
echo ""

# --- 3. Uninstall ---
echo "== [3/4] Uninstall djnext-admin from venv..."
"$PIP" uninstall -y djnext-admin 2>/dev/null || true
echo "   OK"
echo ""

# --- 4. Install wheel ---
WHEEL=$(ls -1 "$PKG_DIR/dist"/djnext_admin-*-py3-none-any.whl 2>/dev/null | head -1)
if [ -z "$WHEEL" ]; then
  echo "Error: No wheel in $PKG_DIR/dist/" >&2
  exit 1
fi
echo "== [4/4] Install: $WHEEL"
"$PIP" install --no-deps "$WHEEL"
echo "   OK"
echo ""

# --- Validate ---
echo "== Validate (Django check)..."
cd "$TARGET_PROJECT"
"$PYTHON" manage.py check
echo ""
echo "Done. Version: $("$PYTHON" -c "import djnext_admin; print(djnext_admin.__version__)")"

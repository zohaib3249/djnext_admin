#!/usr/bin/env bash
# One script: frontend build → PyPI build (using .venv) → uninstall from ecom-be → install in ecom-be.
# Run from repo root (ecom) or from djnext_admin. Uses ecom-be/.venv for Python (no global python).
#
# Usage:
#   ./scripts/build-and-install-ecom-be.sh
#
# Env:
#   ECOMBE_DIR       Optional. Default: ../ecom-be when run from djnext_admin (monorepo).
#   SKIP_FRONTEND=1  Skip frontend build (use existing frontend/out if any).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PKG_DIR/frontend"

# ecom-be location: env or sibling of djnext_admin
if [ -n "$ECOMBE_DIR" ]; then
  ECOMBE="$(cd "$ECOMBE_DIR" && pwd)"
else
  ECOMBE="$(cd "$PKG_DIR/../ecom-be" 2>/dev/null && pwd)" || true
fi

if [ ! -f "$PKG_DIR/setup.py" ] || [ ! -d "$FRONTEND_DIR" ]; then
  echo "Error: setup.py and frontend/ not found under $PKG_DIR" >&2
  exit 1
fi

if [ -z "$ECOMBE" ] || [ ! -d "$ECOMBE/.venv" ]; then
  echo "Error: ecom-be/.venv not found. Set ECOMBE_DIR or run from monorepo (ecom/djnext_admin)." >&2
  exit 1
fi

VENV_PYTHON="$ECOMBE/.venv/bin/python"
VENV_PIP="$ECOMBE/.venv/bin/pip"

cd "$PKG_DIR"
echo "== Package: $PKG_DIR"
echo "== ecom-be venv: $ECOMBE/.venv"
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
  # Convert to Jinja + copy to templates/ and static/ (Django {% static %} only)
  "$VENV_PYTHON" scripts/post-build-to-static.py
  echo "   OK: templates/ + static/ (post-build-to-static)"
fi
echo ""

# --- 2. PyPI build (using .venv, not global python) ---
echo "== [2/4] PyPI build (wheel + sdist) using .venv..."
"$VENV_PIP" install -q --upgrade pip
"$VENV_PIP" install -q -r requirements-build.txt
"$VENV_PYTHON" -m build
echo "   OK: $PKG_DIR/dist/"
echo ""

# --- 3. Uninstall from ecom-be ---
echo "== [3/4] Uninstall djnext-admin from ecom-be..."
"$VENV_PIP" uninstall -y djnext-admin 2>/dev/null || true
echo "   OK"
echo ""

# --- 4. Install built wheel in ecom-be ---
WHEEL=$(ls -1 "$PKG_DIR/dist"/djnext_admin-*-py3-none-any.whl 2>/dev/null | head -1)
if [ -z "$WHEEL" ]; then
  echo "Error: No wheel in $PKG_DIR/dist/" >&2
  exit 1
fi
echo "== [4/4] Install in ecom-be: $WHEEL"
"$VENV_PIP" install --no-deps "$WHEEL"
echo "   OK"
echo ""

# --- Validate ---
echo "== Validate (Django check in ecom-be)..."
cd "$ECOMBE"
"$VENV_PYTHON" manage.py check
echo ""
echo "Done. Run your server and open <your-mount>/ (e.g. /admin/ or /djnext/ per your urls.py) and <your-mount>/api/health/"
echo "Version: $("$VENV_PYTHON" -c "import djnext_admin; print(djnext_admin.__version__)")"

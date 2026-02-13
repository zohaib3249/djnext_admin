#!/usr/bin/env bash
# Sync requirements.txt and setup.py install_requires from current package versions in a venv.
# Usage:
#   ./scripts/sync-requirements-from-venv.sh              # use ecom-be/.venv or .venv or system pip
#   ./scripts/sync-requirements-from-venv.sh /path/to/venv
#
# Uses: pip show Django djangorestframework djangorestframework-simplejwt

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="${1:-}"

if [ -n "$VENV_DIR" ]; then
  PIP="$VENV_DIR/bin/pip"
  [ -x "$PIP" ] || { echo "Error: $PIP not found or not executable" >&2; exit 1; }
elif [ -d "$PKG_DIR/../ecom-be/.venv" ]; then
  PIP="$PKG_DIR/../ecom-be/.venv/bin/pip"
elif [ -d "$PKG_DIR/.venv" ]; then
  PIP="$PKG_DIR/.venv/bin/pip"
else
  PIP="pip"
fi

echo "Using: $PIP"
echo ""

for pkg in Django djangorestframework djangorestframework-simplejwt; do
  V=$("$PIP" show "$pkg" 2>/dev/null | sed -n 's/^Version: //p')
  if [ -z "$V" ]; then
    echo "Warning: $pkg not found in environment" >&2
    continue
  fi
  echo "$pkg: $V"
done

echo ""
echo "To update requirements.txt and setup.py, run this and then set install_requires / requirements.txt to >= these versions."
echo "Example: Django>=5.2, djangorestframework>=3.16, djangorestframework-simplejwt>=5.5"

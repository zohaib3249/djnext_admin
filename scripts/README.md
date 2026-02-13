# Scripts

## build-and-install-ecom-be.sh (one-shot local test)

Runs the full local flow using **ecom-be’s .venv** (no global python): frontend build → PyPI build → uninstall from ecom-be → install wheel in ecom-be → Django check.

**Use this** when you want to test the package in ecom-be without running separate commands.

**Requirements:** Node.js 20+ (npm), ecom-be with `.venv` (monorepo layout).

**Usage:**

```bash
# From djnext_admin directory (ecom-be must be at ../ecom-be)
cd /path/to/djnext_admin
./scripts/build-and-install-ecom-be.sh

# Or set ecom-be explicitly
ECOMBE_DIR=/path/to/ecom-be ./scripts/build-and-install-ecom-be.sh
```

**What it does:**

1. Builds the frontend (`npm ci && npm run build` in `frontend/`).
2. Builds the Python package (wheel + sdist) using `ecom-be/.venv/bin/python -m build`.
3. Uninstalls `djnext-admin` from ecom-be’s venv.
4. Installs the new wheel into ecom-be’s venv (`--no-deps`).
5. Runs `manage.py check` in ecom-be to validate.

---

## run-build-publish.sh

Runs the same steps as the GitHub Action [build-publish.yml](../.github/workflows/build-publish.yml) locally: build frontend, build Python package, optionally publish to PyPI.

**Requirements:** Node.js 20+ (npm), Python 3.12+ (pip, build).

**Usage:**

```bash
# From djnext_admin directory
cd /path/to/djnext_admin
./scripts/run-build-publish.sh

# Build only (dry run) – no publish
./scripts/run-build-publish.sh

# Build and publish to PyPI (requires PYPI_API_TOKEN)
PYPI_API_TOKEN=pypi-xxx ./scripts/run-build-publish.sh --publish

# Build with a specific version (updates __init__.py)
VERSION=0.2.0 ./scripts/run-build-publish.sh
```

**What it does:**

1. Builds the frontend (`frontend/out/`) with no `NEXT_PUBLIC_*` env (same as CI).
2. Reads or sets version from `__init__.py`.
3. Builds the Python package (wheel + sdist) into `dist/`.
4. If `--publish` is passed and `PYPI_API_TOKEN` is set, uploads to PyPI with `twine upload --skip-existing`.

Use this to verify the full pipeline before pushing a tag or running the workflow on GitHub.

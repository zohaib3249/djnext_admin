# Building the admin frontend for static packaging

The frontend is built as a **static export**: one-time build produces HTML + JS + CSS with fixed filenames (hashed at build time). There is no runtime “dynamic” build—Django (or any server) serves these pre-built files.

## How it works

- **`output: 'export'`** in `next.config.js` makes `next build` write to the **`out/`** directory:
  - `out/index.html` (and other HTML for pre-rendered routes)
  - `out/_next/static/chunks/*.js` (hashed filenames, e.g. `main-abc123.js`)
  - `out/_next/static/css/*.css` (hashed filenames)
- **JS and CSS are “hardcoded”** for that build: the same HTML always references the same script/link tags until you run a new build.
- **basePath** (e.g. `/admin`) can be set in two ways:
  - **Build time:** `NEXT_PUBLIC_BASE_PATH` so asset URLs work when the app is served under a prefix.
  - **Runtime (API):** The global schema returns `site.frontend_base_path` from Django settings `DJNEXT_ADMIN.FRONTEND_BASE_PATH`. The frontend uses this when available for links and navigation so you can configure the base path per deployment without rebuilding.
- **API base URL** is resolved in this order:
  - **Runtime (API):** After loading the schema, the frontend uses `site.api_origin` and `site.api_path` from the schema (Django settings `DJNEXT_ADMIN.API_ORIGIN` and `DJNEXT_ADMIN.API_PATH`; if `API_ORIGIN` is empty, the backend uses the request origin).
  - **Fallback:** `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_API_PATH` (or defaults `http://localhost:8000` and `/api/djnext`) for the initial schema request and if schema does not provide them.

## Build commands

```bash
cd djnext_admin/frontend

# Install and build (default: basePath '' for dev)
npm install
npm run build

# Build with base path for Django (e.g. admin at /admin/)
NEXT_PUBLIC_BASE_PATH=/admin npm run build

# Build and generate build-manifest.json (lists scripts/styles for optional server use)
npm run build:package
```

After `npm run build`, the **package** is the **`out/`** directory. Deploy it by copying `out/` to your server.

## Serving from Django

1. **Copy the build**  
   Copy the contents of `out/` into a directory served as static files (e.g. Django’s `STATICFILES_DIRS` or a dedicated static root for the admin).

2. **Route admin URLs to the SPA**  
   For any admin path (e.g. `/admin/`, `/admin/users/user/`, etc.), serve **`out/index.html`**. The HTML already includes the correct `<script>` and `<link>` tags for that build. The React app loads and handles routing on the client.

3. **Optional: use the manifest**  
   If you run `npm run build:package`, `out/build-manifest.json` is created with `scripts` and `styles` arrays. You can use this to inject script/link tags from a Django template instead of serving the built `index.html` as-is.

## Env for production build

- **`NEXT_PUBLIC_BASE_PATH`** – URL prefix (e.g. `/admin`). Must match the path where Django serves the admin.
- **`NEXT_PUBLIC_API_URL`** – Backend origin (e.g. `https://api.example.com`). Fallback for API calls when schema is not yet loaded or when Django does not expose API URL via settings.
- **`NEXT_PUBLIC_API_PATH`** – API path prefix (e.g. `/api/djnext`). Fallback; prefer configuring `DJNEXT_ADMIN.API_ORIGIN` and `DJNEXT_ADMIN.API_PATH` in Django so the frontend gets them from the schema.
- **`NEXT_PUBLIC_ASSET_PREFIX`** – Optional CDN prefix for assets (e.g. `https://static.example.com/admin`).

Example:

```bash
NEXT_PUBLIC_BASE_PATH=/admin NEXT_PUBLIC_API_URL=https://api.example.com npm run build
```

## CI and PyPI

The repo includes a GitHub Action (`.github/workflows/build-publish.yml`) that:

1. Builds the frontend **without** `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_BASE_PATH`; API URL and base path are taken from Django settings/schema at runtime.
2. Builds the Python package (wheel + sdist) using **Python 3.12** and `requirements-build.txt`.
3. On **tag push `v*`** (e.g. `v0.1.0`), sets version from the tag and **publishes to PyPI**.

Package deps: `requirements.txt` (install) and `requirements-build.txt` (CI build). Python version in CI matches `setup.py` (e.g. 3.12).

To publish: create a `PYPI_API_TOKEN` secret in the repo, then push a tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

For a dry run (build only, no publish), run the workflow manually and enable “Build only, do not publish to PyPI”.

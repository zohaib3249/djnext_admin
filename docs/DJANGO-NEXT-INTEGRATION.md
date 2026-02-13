# Making the Next.js App Compatible with Django

This document describes how the Next.js admin frontend is built and served by Django so it works under any mount path (e.g. `/djnext/`, `/admin/`) without hardcoding.

---

## 1. Goal

- **One Django include** – Project uses `path('djnext/', include('djnext_admin.urls'))` (or any path). No env var for the mount.
- **Base path at runtime** – The frontend learns its base path from Django when the page loads, not from build-time env.
- **Single HTML entry** – Django serves one HTML for all routes (`/djnext/`, `/djnext/login`, `/djnext/dashboard`, etc.). The client-side router handles navigation.
- **Assets under the same mount** – All JS/CSS are requested under the same path (e.g. `/djnext/_next/...`) so one URL config serves both the SPA and its assets.

---

## 2. Next.js Side

### 2.1 No build-time base path

- **`next.config.js`** does **not** set `basePath` from env. Base path is only known when Django serves the page.
- **`output: 'export'`** – Static export so we get a static HTML + JS/CSS that Django can serve.
- **`generateBuildId: async () => 'djnext_admin'`** – Stable build ID so asset filenames are predictable across builds.
- **`LimitChunkCountPlugin({ maxChunks: 1 })`** – Reduces extra client chunks; the framework may still emit multiple files (main-app, layout, page chunks).

### 2.2 Single route: optional catch-all

- The app has **one route**: `app/[[...path]]/page.tsx` (optional catch-all). There is **no** root `app/page.tsx` (that would conflict with the catch-all).
- **`SPARouterClient`** (client component):
  - Reads **base path** from `getBasePathFromPathname()` → `window.__DJNEXT_BASE_PATH` (injected by Django).
  - Uses **`usePathname()`** and strips the base path to get “segments” (e.g. `/djnext/login` → `['login']`).
  - Renders the right page: login, dashboard, settings, list, create, detail, etc.

### 2.3 Base path and API

- **`src/lib/basePath.ts`** – `getBasePathFromPathname()` returns `window.__DJNEXT_BASE_PATH` when set (from Django), else `''` for dev at `/` or `localhost:3001`.
- **`src/lib/api.ts`** – API base URL is built from that same value (or first path segment) so requests go to `/{mount}/api/`, e.g. `/djnext/api/`.
- **Navigation** – All `router.push`, `router.replace`, and `Link` hrefs use the runtime base path so links stay under the Django mount.

---

## 3. Build and Post-Build

### 3.1 Build

- `npm run build` in `frontend/` produces `frontend/out/`: `index.html`, `_next/` (JS/CSS), and optionally `djnext-custom.css`.

### 3.2 Post-build script: `scripts/post-build-to-static.py`

Run from package root after `next build`. It does three things:

1. **Single HTML**  
   Keeps only `index.html` in `out/`; removes other HTML and route dirs. Django will serve this one HTML for every path.

2. **Rewrite catch-all path → `_catchall_`**  
   Next emits a chunk under a directory named `[[...path]]`. Brackets in URLs cause encoding issues and 404s when served by Django. So we:
   - In **HTML** (including inlined RSC payload): replace `app/[[...path]]` and `app/%5B%5B...path%5D%5D` with `app/_catchall_`.
   - When **copying** `out/_next/` → `static/djnext_admin/_next/`, rename any directory named `[[...path]]` to `_catchall_`.
   - Result: no brackets in any URL; Django and the browser only see `_catchall_`.

3. **Convert to Django static + template**  
   - Replace asset URLs in the HTML with `{% static 'djnext_admin/...' %}` and write the result to `templates/djnext_admin/app.html`.
   - Copy `out/_next/` (with the rename above) and `djnext-custom.css` to `static/djnext_admin/`.

After this, the package has one template and a flat(ish) static tree with no bracket path segments.

---

## 4. Django Side

### 4.1 URL config (`djnext_admin/urls.py`)

- `path('api/', ...)` – API under the same mount.
- `path('_next/<path:path>', serve_static, kwargs={'under_next': True})` – Serves JS/CSS from `static/djnext_admin/_next/`.
- `path('djnext-custom.css', serve_static, ...)` – Custom CSS.
- `re_path(r'^.*$', spa_view)` – Catch-all: every other path under the mount returns the SPA HTML.

### 4.2 SPA view: `views/template_serve.spa_view`

For every request that hits the catch-all (e.g. `/djnext/`, `/djnext/login`):

1. **Render** the Jinja template `app.html` (from post-build). It already contains `{% static 'djnext_admin/...' %}` for assets.
2. **Inject base path** – Insert `<script>window.__DJNEXT_BASE_PATH="/djnext";</script>` (or whatever the mount is) right after `<head>`. The mount is taken from the first segment of `request.path` (e.g. `request.path == "/djnext/login"` → mount `"/djnext"`). No hardcoding.
3. **Rewrite asset URLs to use the mount** so the browser requests assets under the same mount:
   - Replace `"/_next/` and `'/_next/` (and escaped forms) with `"/{mount}/_next/`.
   - Replace `(src|href)="...static/djnext_admin/_next/..."` with `(src|href)="/{mount}/_next/..."`.
   - Rewrite RSC payload: `"static/chunks/` → `"/{mount}/_next/static/chunks/` so dynamic chunk paths in the payload also point under the mount.

The response is HTML with all asset and chunk URLs pointing to `/{mount}/_next/...`, so every asset request goes to the same mount and is handled by `serve_static`.

### 4.3 Static file view: `views/template_serve.serve_static`

- Serves files from the package directory `static/djnext_admin/`.
- For `_next/<path:path>` the path is the part after `_next/` (e.g. `static/chunks/app/_catchall_/page-xxx.js`). Path is **unquoted** so URL-encoded segments (if any) resolve to the real file path.
- For `.js`/`.mjs`/`.css` under `_next/`, the response body is read and every `/_next/` is rewritten to `/{mount}/_next/` so that chunk content that references other chunks still loads under the mount.
- No bracket path segments anymore: post-build renamed `[[...path]]` → `_catchall_`.

---

## 5. End-to-End Flow

1. User opens `https://example.com/djnext/`.
2. Django matches the catch-all and calls `spa_view`. It renders `app.html`, injects `window.__DJNEXT_BASE_PATH="/djnext"`, and rewrites all asset URLs to `/djnext/_next/...`.
3. Browser receives HTML and loads scripts/CSS from `/djnext/_next/...`. Those requests hit `serve_static`, which serves files from `static/djnext_admin/_next/` (with `_catchall_` in path, no brackets).
4. When JS runs, `getBasePathFromPathname()` returns `"/djnext"`, the router derives segments from the current pathname, and the correct page (e.g. redirect to login or dashboard) is rendered. API calls go to `/djnext/api/`.

---

## 6. Summary Table

| Concern              | Approach |
|----------------------|----------|
| Base path            | Injected by Django in HTML as `window.__DJNEXT_BASE_PATH`; no `NEXT_PUBLIC_BASE_PATH` for routing. |
| Single HTML          | One route `[[...path]]` in Next; post-build keeps one `index.html` → `app.html`. |
| Asset URLs           | Post-build converts to `{% static %}`; `spa_view` rewrites to `/{mount}/_next/...`. |
| Bracket path `[[...path]]` | Post-build renames dir to `_catchall_` and rewrites all refs in HTML so no brackets in URLs. |
| Chunk paths in payload | `spa_view` rewrites `"static/chunks/` to `"/{mount}/_next/static/chunks/` in the response body. |
| API base URL         | Frontend builds it from `window.__DJNEXT_BASE_PATH` (or first path segment). |
| Mount detection      | Django uses first segment of `request.path`; no hardcoded `/djnext`. |

This is what was implemented to make the Next.js app compatible with Django under an arbitrary mount path.

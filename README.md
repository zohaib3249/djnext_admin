# DJNext Admin

Headless Django Admin API that exposes REST from your existing admin registry, with an optional Next.js frontend. No separate registration—your `admin.py` is the source of truth.

- PyPI: [djnext-admin](https://pypi.org/project/djnext-admin/)
- Source: [github.com/zohaib3249/djnext_admin](https://github.com/zohaib3249/djnext_admin)

## Screenshots

| Dashboard | List / detail |
|-----------|----------------|
| ![Dashboard](https://raw.githubusercontent.com/zohaib3249/djnext_admin/master/image/dashbaord.png) | ![Dashboard layout](https://raw.githubusercontent.com/zohaib3249/djnext_admin/master/image/dashbaord1.png) |

| Global search | Logs |
|----------------|------|
| ![Global search](https://raw.githubusercontent.com/zohaib3249/djnext_admin/master/image/global-search.png) | ![Logs](https://raw.githubusercontent.com/zohaib3249/djnext_admin/master/image/logs.png) |

## Intro

DJNext Admin reads your Django admin site registry and provides:

- REST APIs for list, create, detail, and update for every registered model
- Schema and auth endpoints (JWT)
- Optional SPA (Next.js) served by Django under any mount path

You add one URL include; the app handles API and UI routing. The frontend is built once and packaged so `pip install djnext-admin` gives you both the Python package and the static assets (after the project runs the post-build step in CI or locally).

---

## Examples

**Minimal setup in your project `urls.py`:**

```python
from django.urls import path, include

urlpatterns = [
    path('admin/', include('djnext_admin.urls')),  # or path('djnext/', ...)
]
```

You get:

- `/admin/` — Admin SPA
- `/admin/api/` — REST API (schema, auth, CRUD)
- `/admin/_next/...` — Static assets

**Django settings:**

```python
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'rest_framework_simplejwt',
    'djnext_admin',
]

DJNEXT_ADMIN = {
    'SITE_NAME': 'My Admin',
    'LAYOUT': 'glassmorphism',  # basic | glassmorphism | aurora | neumorphism | minimal
}
```

**Wire JWT (in project settings):**

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}
```

---

## Usage

### Install

```bash
pip install djnext-admin
```

### Build from source and install into your project

From the `djnext_admin` source directory, use the generic build script. You must set **VENV** to your Django project’s virtualenv (the one where you want `djnext-admin` installed).

```bash
# Required: path to the virtualenv of the Django project you’re installing into
VENV=/path/to/your/project/.venv ./scripts/build-and-install.sh
```

The script will:

1. Build the frontend (`npm ci`, `npm run build` in `frontend/`)
2. Run the post-build step (Jinja template + static files, `[[...path]]` → `_catchall_`)
3. Build the wheel (`python -m build`)
4. Uninstall any existing `djnext-admin` from that venv, then install the new wheel
5. Run `manage.py check` in the target project

**Optional:**

- `TARGET_PROJECT=/path/to/django/root` — Django project root (directory with `manage.py`). Default: parent of `VENV` (e.g. if `VENV` is `/home/me/myproject/.venv`, target is `/home/me/myproject`).
- `SKIP_FRONTEND=1` — Reuse existing `frontend/out` and skip npm build and post-build (only build the wheel and install).

**Examples:**

```bash
VENV=/home/me/myproject/.venv ./scripts/build-and-install.sh
VENV=/home/me/.venv TARGET_PROJECT=/home/me/myproject ./scripts/build-and-install.sh
SKIP_FRONTEND=1 VENV=/home/me/myproject/.venv ./scripts/build-and-install.sh
```

The packaged wheel includes templates and static files produced by the post-build step. PyPI/CI runs the same steps so the published package is ready to serve.

### Mount path

Use any path in `include('djnext_admin.urls')`. The frontend gets the base path from Django at runtime (`window.__DJNEXT_BASE_PATH`), so no env var is needed for routing.

---

## Default settings

All options go under `DJNEXT_ADMIN` in your Django settings. Override only what you need; defaults are below.

**Site**

| Key | Default | Notes |
|-----|---------|--------|
| `SITE_NAME` | `None` | Fallback: Django admin `site_header` / `site_title`, else `'Admin'` |
| `SITE_VERSION` | `'1.0.0'` | Shown in UI |

**Auth**

| Key | Default | Notes |
|-----|---------|--------|
| `REQUIRE_AUTHENTICATION` | `True` | Require login for API |
| `REQUIRE_STAFF` | `True` | Require staff for API |
| `ACCESS_TOKEN_LIFETIME` | `None` | JWT access lifetime; `None` = use SIMPLE_JWT default (e.g. 5 min). Wire in project SIMPLE_JWT if set |
| `REFRESH_TOKEN_LIFETIME` | `None` | JWT refresh lifetime; `None` = use SIMPLE_JWT default (e.g. 1 day) |

**Permissions**

| Key | Default | Notes |
|-----|---------|--------|
| `USE_DJANGO_PERMISSIONS` | `True` | Use Django model/admin permissions |
| `SUPERUSER_FULL_ACCESS` | `True` | Superusers bypass permission checks |

**Pagination**

| Key | Default | Notes |
|-----|---------|--------|
| `PAGE_SIZE` | `25` | Default list page size |
| `MAX_PAGE_SIZE` | `100` | Max `page_size` query param |
| `PAGE_SIZE_QUERY_PARAM` | `'page_size'` | Query param name |

**Features**

| Key | Default | Notes |
|-----|---------|--------|
| `ENABLE_BULK_ACTIONS` | `True` | Bulk actions in list view |
| `ENABLE_EXPORT` | `True` | Export in list view |
| `ENABLE_SEARCH` | `True` | Search in list view |
| `ENABLE_FILTERS` | `True` | Sidebar filters |
| `ENABLE_ORDERING` | `True` | Sortable columns |

**Cache**

| Key | Default | Notes |
|-----|---------|--------|
| `SCHEMA_CACHE_TIMEOUT` | `300` | Schema cache TTL (seconds) |

**Models**

| Key | Default | Notes |
|-----|---------|--------|
| `EXCLUDE_APPS` | `['contenttypes', 'sessions']` | App labels to hide from API |
| `EXCLUDE_MODELS` | `[]` | `(app_label, model_name)` to hide |
| `INCLUDE_ONLY_MODELS` | `None` | If set, only these `(app_label, model_name)` are exposed |

**Custom assets**

| Key | Default | Notes |
|-----|---------|--------|
| `CUSTOM_CSS` | `[]` | List of static paths (e.g. `['djnext_admin/custom.css']`) |
| `CUSTOM_JS` | `[]` | List of static paths |

**Layout**

| Key | Default | Notes |
|-----|---------|--------|
| `LAYOUT` | `'basic'` | One of: `basic`, `glassmorphism`, `aurora`, `neumorphism`, `minimal` |
| `LAYOUT_ALLOW_SWITCH` | `False` | Let users change layout in UI |
| `LAYOUT_OPTIONS` | all five above | Layouts offered when switching |

**Theme**

| Key | Default | Notes |
|-----|---------|--------|
| `THEME_MODE` | `'dark'` | One of: `dark`, `light`, `system` |
| `THEME_PRIMARY_COLOR` | `None` | CSS color for primary |
| `THEME_ACCENT_COLOR` | `None` | CSS color for accent |

**API / frontend**

| Key | Default | Notes |
|-----|---------|--------|
| `FRONTEND_BASE_PATH` | `''` | URL prefix for frontend (e.g. `'/admin'`). Empty = derived from mount |
| `API_ORIGIN` | `''` | Origin for API calls (e.g. `'http://localhost:8000'`). Empty = request origin |
| `API_PATH` | `''` | Path prefix for API. Empty = derived from mount (e.g. `/admin/api/`) |

Custom views and object tools: use `djnext_custom_views` and `djnext_object_tools` on your `ModelAdmin` (see [FEATURES.md](https://github.com/zohaib3249/djnext_admin/blob/master/FEATURES.md) in the repo).

---

## Contributing

1. Fork [github.com/zohaib3249/djnext_admin](https://github.com/zohaib3249/djnext_admin).
2. Clone, create a branch, make changes.
3. Before testing, build and install into a Django project venv:  
   `VENV=/path/to/your/project/.venv ./scripts/build-and-install.sh` (see “Build from source” above).
4. Open a pull request.

Report bugs and feature requests in the [GitHub issue tracker](https://github.com/zohaib3249/djnext_admin/issues).

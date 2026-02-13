"""
URL Configuration for DJNext Admin.

One include gives both UI and API. In your project urls.py use any path you want:

    path('admin/', include('djnext_admin.urls'))   # or path('djnext/', ...), etc.

Then you get (for path('admin/', ...)):
  - /admin/           → admin UI (SPA)
  - /admin/api/       → API (schema, auth, models, etc.)
  - /admin/_next/...  → static JS/CSS

API base URL is derived from the request; no hardcoded paths.
"""

from django.urls import path, re_path, include

from .views.template_serve import spa_view, serve_static

urlpatterns = [
    # API under same mount so user adds only one include
    path('api/', include('djnext_admin.api_urls')),
    # Static JS/CSS
    path('_next/<path:path>', serve_static, kwargs={'under_next': True}),
    path('djnext-custom.css', serve_static, kwargs={'path': 'djnext-custom.css'}),
    # SPA (catch-all)
    re_path(r'^.*$', spa_view),
]

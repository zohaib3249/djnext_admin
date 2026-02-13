#!/usr/bin/env python3
"""
After Next.js build: one entry point, convert index to Jinja, copy assets to static.

Run from package root (djnext_admin/) with:
  python scripts/post-build-to-static.py

- Keeps only index.html in out/ (removes other .html, .txt, and route dirs like login/, dashboard/, _/).
  This is intentional: Django serves this single app.html for every path (e.g. /djnext, /djnext/login).
  The client-side router then shows the right page from the URL. We are not "deleting" pages—login,
  dashboard, etc. still exist in the JS bundle and render when the URL matches (see basePath below).
- Converts index.html to a Jinja template with {% static 'djnext_admin/...' %} for asset URLs.
- Copies out/_next/ and out/djnext-custom.css to static/djnext_admin/.

Base path is injected by Django at runtime (window.__DJNEXT_BASE_PATH); no env var for routing.
Post-build renames [[...path]] -> _catchall_ so asset URLs have no brackets (simpler serving).
"""

import os
import re
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PKG_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(PKG_ROOT, "frontend", "out")
TEMPLATES_DIR = os.path.join(PKG_ROOT, "templates", "djnext_admin")
STATIC_DIR = os.path.join(PKG_ROOT, "static", "djnext_admin")
STATIC_PREFIX = "djnext_admin/"

# Dir name used in Next build for optional catch-all route; we rename to avoid brackets in URLs
CATCHALL_DIR = "[[...path]]"
CATCHALL_RENAME = "_catchall_"


def _copytree_rename_catchall(src: str, dst: str) -> None:
    """Copy directory tree, renaming any path component equal to [[...path]] to _catchall_."""
    os.makedirs(dst, exist_ok=True)
    for name in os.listdir(src):
        src_item = os.path.join(src, name)
        dst_name = CATCHALL_RENAME if name == CATCHALL_DIR else name
        dst_item = os.path.join(dst, dst_name)
        if os.path.isdir(src_item):
            _copytree_rename_catchall(src_item, dst_item)
        else:
            shutil.copy2(src_item, dst_item)


def main():
    if not os.path.isdir(OUT_DIR):
        print(f"Missing {OUT_DIR}. Run npm run build in frontend/ first.")
        return 1

    index_path = os.path.join(OUT_DIR, "index.html")
    if not os.path.isfile(index_path):
        print(f"Missing {index_path}. Run npm run build in frontend/ first.")
        return 1

    # 1) Keep only one entry: remove other HTML, .txt, and route dirs (SPA: one HTML, router handles paths)
    for name in os.listdir(OUT_DIR):
        path = os.path.join(OUT_DIR, name)
        if name == "index.html" or name == "_next":
            continue
        if name == "djnext-custom.css":
            continue
        if name.endswith(".html") or name.endswith(".txt"):
            os.remove(path)
            print(f"Removed {name}")
        elif os.path.isdir(path):
            shutil.rmtree(path)
            print(f"Removed dir {name}/")

    # 2) Read index.html; rewrite catch-all path to _catchall_ (no brackets in URLs), then convert to Jinja
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Use _catchall_ everywhere so Django never sees [[...path]] or %5B%5B in URLs
    html = re.sub(r"app/%5B%5B\.\.\.path%5D%5D", "app/_catchall_", html, flags=re.IGNORECASE)
    html = re.sub(r"app/\[\[\.\.\.path\]\]", "app/_catchall_", html)

    if "{% load static %}" not in html:
        html = "{% load static %}\n" + html

    def to_static(match):
        attr, quote, path = match.group(1), match.group(2), match.group(3)
        # path is _next/... or djnext-custom.css (any base path stripped by regex)
        return attr + "=" + quote + "{% static '" + STATIC_PREFIX + path + "' %}" + quote

    # Replace (src|href)="/<any-base>/_next/..." or ".../djnext-custom.css" (any mount path)
    html = re.sub(
        r'(src|href)=(["\'])/[^/]+/(_next/[^"\']+|djnext-custom\.css)\2',
        to_static,
        html,
    )
    # Catch /_next/... (build without basePath)
    html = re.sub(
        r'(src|href)=(["\'])/_next/([^"\']+)\2',
        lambda m: m.group(1) + "=" + m.group(2) + "{% static '" + STATIC_PREFIX + "_next/" + m.group(3) + "' %}" + m.group(2),
        html,
    )

    os.makedirs(TEMPLATES_DIR, exist_ok=True)
    app_html = os.path.join(TEMPLATES_DIR, "app.html")
    with open(app_html, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Wrote {app_html}")

    # 3) Copy _next/ to static, renaming [[...path]] -> _catchall_ so no brackets in URLs (simpler Django serving)
    os.makedirs(STATIC_DIR, exist_ok=True)
    next_src = os.path.join(OUT_DIR, "_next")
    next_dst = os.path.join(STATIC_DIR, "_next")
    if os.path.isdir(next_dst):
        shutil.rmtree(next_dst)
    _copytree_rename_catchall(next_src, next_dst)
    print(f"Copied _next/ to {STATIC_DIR}/_next/ ([[...path]] -> _catchall_)")

    css_src = os.path.join(OUT_DIR, "djnext-custom.css")
    if os.path.isfile(css_src):
        shutil.copy2(css_src, os.path.join(STATIC_DIR, "djnext-custom.css"))
        print(f"Copied djnext-custom.css to {STATIC_DIR}/")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

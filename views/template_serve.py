"""
Serve the admin UI: render Jinja template for the SPA, serve static files for
_next/ and djnext-custom.css so JS/CSS return correct MIME types (not HTML).
"""

import mimetypes
import os
import re
from urllib.parse import unquote

from django.shortcuts import render
from django.http import HttpResponse, Http404, FileResponse
from django.templatetags.static import static


def _static_root():
    """Path to our package static dir (static/djnext_admin/)."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(root, 'static', 'djnext_admin')


def _get_mount_from_request(request):
    """First path segment (e.g. /djnext from /djnext or /djnext/login). No hardcoding."""
    path = (request.path or '').strip('/')
    if not path:
        return ''
    return '/' + path.split('/')[0]


def serve_static(request, path=None, under_next=False):
    """
    Serve a file from static/djnext_admin/. For _next/<path:path> the path is
    the part after _next/ (e.g. static/chunks/foo.js). For .js/.css we rewrite
    /_next/ to {mount}/_next/ using the request path so dynamic chunk loads work.
    """
    base = _static_root()
    if not path:
        raise Http404
    while path != unquote(path):
        path = unquote(path)
    path = path.lstrip('/')
    if path.startswith('../') or '..' in path:
        raise Http404
    if under_next:
        full = os.path.normpath(os.path.join(base, '_next', path))
    else:
        full = os.path.normpath(os.path.join(base, path))
    if not full.startswith(base) or not os.path.isfile(full):
        raise Http404
    content_type, _ = mimetypes.guess_type(full) or ('application/octet-stream', None)

    if under_next and path.endswith(('.js', '.mjs', '.css')):
        with open(full, 'r', encoding='utf-8', errors='replace') as f:
            body = f.read()
        mount = _get_mount_from_request(request)
        next_prefix = (mount.rstrip('/') + '/_next/') if mount else '/_next/'
        body = body.replace('/_next/', next_prefix)
        return HttpResponse(body, content_type=content_type)
    return FileResponse(open(full, 'rb'), content_type=content_type)


def spa_view(request):
    """Render the single SPA entry (app.html). Injects mount and rewrites /_next/ so all assets (including dynamic chunks) load under the same mount; no hardcoding."""
    try:
        response = render(request, 'djnext_admin/app.html')
        content = response.content.decode('utf-8')
        mount = _get_mount_from_request(request)
        inject = f'<script>window.__DJNEXT_BASE_PATH="{mount}";</script>'
        if '<head>' in content:
            content = content.replace('<head>', '<head>' + inject, 1)
        # Use mount so asset requests hit our serve_static and get /_next/ rewritten in .js/.css
        next_prefix = (mount.rstrip('/') + '/_next/') if mount else (static('djnext_admin/_next/') or '').rstrip('/') + '/'
        if not next_prefix.endswith('/'):
            next_prefix += '/'
        content = content.replace('"/_next/', '"' + next_prefix)
        content = content.replace("'/_next/", "'" + next_prefix)
        content = content.replace('\\"/_next/', '\\"' + next_prefix)
        # Rewrite "static/chunks/ and \"static/chunks/ in RSC payload so client loads chunks under mount
        if mount:
            mount_next_static = (mount.rstrip('/') + '/_next/static/')
            content = re.sub(r'(["\'])static/chunks/', r'\1' + mount_next_static + 'chunks/', content)
            content = re.sub(r'\\"static/chunks/', '\\"' + mount_next_static + 'chunks/', content)
        # Rewrite (src|href)="...static/djnext_admin/_next/..." so script/link hit our serve_static
        static_next = (static('djnext_admin/_next/') or '').strip()
        if static_next and mount:
            mount_next = (mount.rstrip('/') + '/_next/')
            content = re.sub(
                r'(src|href)=(["\'])(' + re.escape(static_next) + r')([^"\']*)\2',
                r'\1=\2' + mount_next + r'\4\2',
                content,
            )
        # Post-build renames [[...path]] -> _catchall_, so no bracket encoding to fix here
        return HttpResponse(content, content_type=response.get('Content-Type', 'text/html; charset=utf-8'))
    except Exception:
        return _fallback_response(request)


def _fallback_response(request):
    """When template/static not present (e.g. package installed without build)."""
    html = (
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>DJNext Admin</title></head><body>'
        '<h1>DJNext Admin</h1>'
        '<p>Include in your urls: <code>path(\'your-path/\', include(\'djnext_admin.urls\'))</code>. '
        'API is at <code>&lt;your-path&gt;/api/</code>.</p>'
        '<p>Build the frontend and run <code>python scripts/post-build-to-static.py</code> to include templates and static.</p>'
        '</body></html>'
    )
    return HttpResponse(html, content_type='text/html; charset=utf-8')

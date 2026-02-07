"""
Global search across all registered models (char/text fields).
Returns matching records with concatenated display fields for the frontend.
"""

from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response

from ..core.registry import get_registered_models, get_model_permissions
from ..permissions import DJNextBasePermission
from ..settings import djnext_settings


# Max records per model and total to avoid huge responses
SEARCH_LIMIT_PER_MODEL = 5
SEARCH_LIMIT_TOTAL = 30
SEARCH_MIN_QUERY_LENGTH = 2


def _get_searchable_field_names(model, model_admin):
    """
    Field names to search. Id/pk are for navigation only, not search.
    Order: djnext_search_fields (wrapper) -> search_fields -> auto char/text (excl. id/pk).
    """
    # 1. Wrapper: djnext_search_fields (exclude id/pk from search)
    names = getattr(model_admin, 'djnext_search_fields', None)
    if names is not None:
        return [n for n in names if n not in ('id', 'pk')]

    # 2. Django admin search_fields
    names = list(getattr(model_admin, 'search_fields', None) or [])
    if names:
        return [n for n in names if n not in ('id', 'pk')]

    # 3. Auto: char/text/email/url fields, excluding id and pk
    skip = {'id', 'pk'}
    out = []
    for f in model._meta.get_fields():
        if getattr(f, 'concrete', True) and hasattr(f, 'get_internal_type'):
            if f.name not in skip and f.get_internal_type() in (
                'CharField', 'TextField', 'EmailField', 'URLField', 'SlugField'
            ):
                out.append(f.name)
    return out


def _get_display_string(obj, model, model_admin):
    """
    Display string for global search results. Uses djnext_display (wrapper)
    if set; otherwise the model's __str__. Id/pk are for navigation only.
    """
    display_spec = getattr(model_admin, 'djnext_display', None)

    if display_spec is None:
        # Default: __str__ only
        try:
            return str(obj)
        except Exception:
            return f'#{obj.pk}'

    # Use configured fields (e.g. ['name', 'email'] or ['__str__'])
    parts = []
    max_parts = 5
    for fname in list(display_spec)[:max_parts]:
        if fname == '__str__':
            try:
                parts.append(str(obj))
            except Exception:
                parts.append(f'#{obj.pk}')
            continue
        if hasattr(model_admin, fname):
            attr = getattr(model_admin, fname)
            if callable(attr):
                try:
                    parts.append(str(attr(obj)))
                except Exception:
                    pass
                continue
        if hasattr(obj, fname):
            try:
                val = getattr(obj, fname)
                parts.append(str(val) if val is not None else '')
            except Exception:
                pass
    return ' · '.join(p for p in parts if p) or str(obj) or f'#{obj.pk}'


class GlobalSearchView(APIView):
    """
    Search across all registered models (char/text fields).
    GET /api/{path}/search/?q=...

    Returns records the user can view, with app_label, model_name, id, display.
    """

    permission_classes = [DJNextBasePermission]

    def get(self, request):
        q = (request.GET.get('q') or '').strip()
        if len(q) < SEARCH_MIN_QUERY_LENGTH:
            return Response({'results': []})

        user = request.user
        results = []
        total = 0

        for model, model_admin in get_registered_models():
            if total >= SEARCH_LIMIT_TOTAL:
                break

            perms = get_model_permissions(user, model)
            if not perms.get('view'):
                continue

            search_fields = _get_searchable_field_names(model, model_admin)
            if not search_fields:
                continue

            q_obj = Q()
            for fname in search_fields:
                try:
                    q_obj |= Q(**{f'{fname}__icontains': q})
                except Exception:
                    continue

            try:
                qs = model.objects.all()
                if hasattr(model_admin, 'get_queryset'):
                    try:
                        qs = model_admin.get_queryset(request)
                    except TypeError:
                        pass
                qs = qs.filter(q_obj)[:SEARCH_LIMIT_PER_MODEL]
            except Exception:
                continue

            app_label = model._meta.app_label
            model_name = model._meta.model_name
            model_label = str(model._meta.verbose_name_plural)

            for obj in qs:
                if total >= SEARCH_LIMIT_TOTAL:
                    break
                display = _get_display_string(obj, model, model_admin)
                if not display:
                    display = str(obj) if hasattr(obj, '__str__') else f'#{obj.pk}'
                results.append({
                    'app_label': app_label,
                    'model_name': model_name,
                    'id': obj.pk,
                    'display': display[:200],
                    'model_label': model_label,
                })
                total += 1

        # Order: keep by model (already grouped by loop), then by display
        return Response({'results': results})

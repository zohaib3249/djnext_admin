"""
Generic relation options endpoint for relation fields (FK, M2M).
Use when the related model is not registered with DJNext (e.g. auth.Group, auth.Permission)
so the normal model autocomplete is not available.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..permissions import DJNextBasePermission


class RelationOptionsView(APIView):
    """
    GET /api/{path}/relation-options/?app_label=auth&model_name=group&q=...&page_size=20

    Returns { results: [ { id, text } ], has_more } for any Django model.
    Used by relation fields when the target model may not be registered (e.g. Group, Permission).
    """

    permission_classes = [DJNextBasePermission]

    def get(self, request):
        app_label = request.query_params.get('app_label', '').strip()
        model_name = request.query_params.get('model_name', '').strip()
        search = request.query_params.get('q', '').strip()
        page_size = min(int(request.query_params.get('page_size', 50)), 100)

        if not app_label or not model_name:
            return Response(
                {'error': 'app_label and model_name are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from django.apps import apps
            model = apps.get_model(app_label, model_name)
        except LookupError:
            return Response(
                {'error': f'Model {app_label}.{model_name} not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        qs = model._default_manager.all()

        if search:
            from django.db.models import Q
            text_fields = []
            for f in model._meta.get_fields():
                if getattr(f, 'concrete', True) and getattr(f, 'get_internal_type', None) and not getattr(f, 'many_to_many', False) and not getattr(f, 'one_to_many', False):
                    if f.get_internal_type() in ('CharField', 'TextField', 'SlugField'):
                        text_fields.append(f.name)
            if not text_fields:
                for name in ('name', 'username', 'codename', 'title', 'label'):
                    if hasattr(model._meta, 'get_field'):
                        try:
                            model._meta.get_field(name)
                            text_fields.append(name)
                            break
                        except Exception:
                            pass
            if text_fields:
                query = Q()
                for field_name in text_fields[:5]:
                    query |= Q(**{f'{field_name}__icontains': search})
                qs = qs.filter(query)

        qs = qs[:page_size]
        results = [{'id': obj.pk, 'text': str(obj)} for obj in qs]

        return Response({
            'results': results,
            'has_more': len(results) == page_size,
        })

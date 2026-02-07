"""
Factory for creating dynamic ViewSets.
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter

from .base import DJNextBaseViewSet
from ..serializers.factory import SerializerFactory
from ..core.introspection import ModelIntrospector
from ..core.registry import get_model_permissions
from ..settings import djnext_settings


class ViewSetFactory:
    """
    Creates ViewSet classes dynamically for each model.
    """

    _cache = {}

    @classmethod
    def create(cls, model, model_admin):
        """
        Create a ViewSet for the model.

        Args:
            model: Django model class
            model_admin: Django ModelAdmin instance

        Returns:
            ViewSet class
        """
        cache_key = model._meta.label

        if cache_key not in cls._cache:
            cls._cache[cache_key] = cls._create_viewset(model, model_admin)

        return cls._cache[cache_key]

    @classmethod
    def _create_viewset(cls, model, model_admin):
        """Create the ViewSet class."""

        # Get filter backends
        filter_backends = []
        if djnext_settings.ENABLE_SEARCH:
            filter_backends.append(SearchFilter)
        if djnext_settings.ENABLE_ORDERING:
            filter_backends.append(OrderingFilter)

        # Try to add DjangoFilterBackend if available
        if djnext_settings.ENABLE_FILTERS:
            try:
                from django_filters.rest_framework import DjangoFilterBackend
                filter_backends.insert(0, DjangoFilterBackend)
            except ImportError:
                pass

        # Create class attributes
        attrs = {
            'model': model,
            'model_admin': model_admin,
            'queryset': model.objects.all(),
            'filter_backends': filter_backends,
        }

        # Add get_serializer_class
        def get_serializer_class(self):
            return SerializerFactory.get_serializer(
                self.model,
                self.model_admin,
                self.action
            )

        attrs['get_serializer_class'] = get_serializer_class

        # Add filterset_fields property
        def get_filterset_fields(self):
            if not self.model_admin:
                return []
            list_filter = getattr(self.model_admin, 'list_filter', [])
            # Filter out non-string filters (custom filter classes)
            return [f for f in list_filter if isinstance(f, str)]

        attrs['filterset_fields'] = property(get_filterset_fields)

        # Add search_fields property
        def get_search_fields(self):
            if not self.model_admin:
                return []
            return list(getattr(self.model_admin, 'search_fields', []))

        attrs['search_fields'] = property(get_search_fields)

        # Add schema action
        @action(detail=False, methods=['get'])
        def schema(self, request):
            """Return model schema for frontend."""
            introspector = ModelIntrospector(self.model, self.model_admin)
            schema_data = introspector.get_schema(request)

            # Add permissions
            schema_data['permissions'] = get_model_permissions(
                request.user, self.model
            )

            # Add endpoints
            api_base = cls._get_api_base(request, self.model)
            app_label = self.model._meta.app_label
            model_name = self.model._meta.model_name

            schema_data['endpoints'] = {
                'list': f'{api_base}{app_label}/{model_name}/',
                'create': f'{api_base}{app_label}/{model_name}/',
                'detail': f'{api_base}{app_label}/{model_name}/{{id}}/',
                'schema': f'{api_base}{app_label}/{model_name}/schema/',
                'autocomplete': f'{api_base}{app_label}/{model_name}/autocomplete/',
            }

            return Response(schema_data)

        attrs['schema'] = schema

        # Add autocomplete action for relation fields
        @action(detail=False, methods=['get'])
        def autocomplete(self, request):
            """Return options for select fields."""
            search = request.query_params.get('q', '')
            page_size = int(request.query_params.get('page_size', 20))

            qs = self.get_queryset()

            # Apply search if search_fields defined
            search_fields = getattr(self, 'search_fields', [])
            if search and search_fields:
                from django.db.models import Q
                query = Q()
                for field in search_fields:
                    query |= Q(**{f'{field}__icontains': search})
                qs = qs.filter(query)

            # Limit results
            qs = qs[:page_size]

            results = [
                {'id': obj.pk, 'text': str(obj)}
                for obj in qs
            ]

            return Response({
                'results': results,
                'has_more': len(results) == page_size
            })

        attrs['autocomplete'] = autocomplete

        # Add bulk actions from admin
        if model_admin and djnext_settings.ENABLE_BULK_ACTIONS:
            admin_actions = getattr(model_admin, 'actions', []) or []
            for action_item in admin_actions:
                if callable(action_item):
                    action_func = action_item
                    action_name = action_func.__name__
                else:
                    action_name = action_item
                    action_func = getattr(model_admin, action_name, None)

                if action_func and action_name != 'delete_selected':
                    attrs[f'action_{action_name}'] = cls._create_action_endpoint(
                        action_name,
                        action_func,
                        model_admin
                    )

        # Create ViewSet class
        viewset_class = type(
            f'{model.__name__}ViewSet',
            (DJNextBaseViewSet,),
            attrs
        )

        return viewset_class

    @classmethod
    def _get_api_base(cls, request, model):
        """Detect API base from request path."""
        path = request.path
        app_label = model._meta.app_label
        model_name = model._meta.model_name

        # Remove '{app}/{model}/...' from the end
        suffix = f'{app_label}/{model_name}/'
        idx = path.find(suffix)
        if idx > 0:
            return path[:idx]
        return '/'

    @classmethod
    def _create_action_endpoint(cls, action_name, action_func, model_admin):
        """Create an action endpoint from admin action."""

        @action(detail=False, methods=['post'], url_path=f'actions/{action_name}')
        def action_endpoint(self, request):
            """Execute bulk action."""
            ids = request.data.get('ids', [])

            if not ids:
                return Response(
                    {'error': 'No items selected.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            queryset = self.get_queryset().filter(pk__in=ids)
            count = queryset.count()

            # Execute action
            try:
                result = action_func(model_admin, request, queryset)
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )

            description = getattr(
                action_func,
                'short_description',
                action_name.replace('_', ' ').title()
            )

            return Response({
                'success': True,
                'affected_count': count,
                'message': f'{description} completed for {count} items.',
            })

        action_endpoint.__name__ = f'action_{action_name}'
        return action_endpoint

    @classmethod
    def clear_cache(cls):
        """Clear the ViewSet cache."""
        cls._cache.clear()

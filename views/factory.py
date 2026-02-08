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
            """Return options for select fields. Uses search_fields or fallback text fields."""
            search = request.query_params.get('q', '').strip()
            page_size = int(request.query_params.get('page_size', 20))

            qs = self.get_queryset()

            search_fields = getattr(self, 'search_fields', [])
            if search:
                from django.db.models import Q
                if search_fields:
                    query = Q()
                    for field in search_fields:
                        query |= Q(**{f'{field}__icontains': search})
                    qs = qs.filter(query)
                else:
                    # Fallback: try common text field names (e.g. Group.name, Permission.codename)
                    fallback = []
                    for f in model._meta.get_fields():
                        if getattr(f, 'get_internal_type', None) and not getattr(f, 'many_to_many', False) and not getattr(f, 'one_to_many', False):
                            if f.get_internal_type() in ('CharField', 'TextField', 'SlugField'):
                                fallback.append(f.name)
                    if not fallback:
                        for name in ('name', 'username', 'codename', 'title'):
                            try:
                                model._meta.get_field(name)
                                fallback.append(name)
                                break
                            except Exception:
                                pass
                    if fallback:
                        query = Q()
                        for field_name in fallback[:5]:
                            query |= Q(**{f'{field_name}__icontains': search})
                        qs = qs.filter(query)

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

        # Add bulk_update action for list_editable
        @action(detail=False, methods=['post'], url_path='bulk-update')
        def bulk_update(self, request):
            """
            Bulk update multiple objects in a single request.
            Used for list_editable inline editing.

            Expects: { "updates": [ {"id": 1, "field1": "value1"}, ... ] }
            """
            updates = request.data.get('updates', [])

            if not updates:
                return Response(
                    {'error': 'No updates provided.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get list_editable fields from admin
            list_editable = []
            if self.model_admin:
                list_editable = list(getattr(self.model_admin, 'list_editable', []) or [])

            if not list_editable:
                return Response(
                    {'error': 'No editable fields configured.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            updated_count = 0
            errors = []

            for update in updates:
                obj_id = update.get('id') or update.get('pk')
                if not obj_id:
                    errors.append({'error': 'Missing id in update'})
                    continue

                try:
                    obj = self.get_queryset().get(pk=obj_id)
                except self.model.DoesNotExist:
                    errors.append({'id': obj_id, 'error': 'Object not found'})
                    continue

                # Only allow updating list_editable fields
                changed = False
                for field_name in list_editable:
                    if field_name in update:
                        setattr(obj, field_name, update[field_name])
                        changed = True

                if changed:
                    try:
                        obj.save(update_fields=list_editable)
                        updated_count += 1
                    except Exception as e:
                        errors.append({'id': obj_id, 'error': str(e)})

            return Response({
                'success': True,
                'updated_count': updated_count,
                'errors': errors if errors else None,
            })

        attrs['bulk_update'] = bulk_update

        # Add date_hierarchy endpoint
        @action(detail=False, methods=['get'], url_path='date-hierarchy')
        def date_hierarchy(self, request):
            """
            Return available dates for date_hierarchy navigation.

            Query params:
            - year: filter by year (returns months)
            - month: filter by month (returns days, requires year)

            Returns hierarchy data based on current drill-down level.
            """
            if not self.model_admin:
                return Response({'field': None, 'dates': []})

            date_field = getattr(self.model_admin, 'date_hierarchy', None)
            if not date_field:
                return Response({'field': None, 'dates': []})

            from django.db.models.functions import ExtractYear, ExtractMonth, ExtractDay

            year = request.query_params.get('year')
            month = request.query_params.get('month')

            qs = self.get_queryset()

            # Apply current filters from request
            for key, value in request.query_params.items():
                if key not in ('year', 'month', 'day', 'page', 'page_size', 'search', 'ordering'):
                    qs = qs.filter(**{key: value})

            if year and month:
                # Show days in the selected month
                qs = qs.filter(**{
                    f'{date_field}__year': int(year),
                    f'{date_field}__month': int(month),
                })
                days = (
                    qs.annotate(day=ExtractDay(date_field))
                    .values_list('day', flat=True)
                    .distinct()
                    .order_by('day')
                )
                return Response({
                    'field': date_field,
                    'level': 'day',
                    'year': int(year),
                    'month': int(month),
                    'dates': list(days),
                })
            elif year:
                # Show months in the selected year
                qs = qs.filter(**{f'{date_field}__year': int(year)})
                months = (
                    qs.annotate(month=ExtractMonth(date_field))
                    .values_list('month', flat=True)
                    .distinct()
                    .order_by('month')
                )
                return Response({
                    'field': date_field,
                    'level': 'month',
                    'year': int(year),
                    'dates': list(months),
                })
            else:
                # Show years
                years = (
                    qs.annotate(year=ExtractYear(date_field))
                    .values_list('year', flat=True)
                    .distinct()
                    .order_by('-year')
                )
                return Response({
                    'field': date_field,
                    'level': 'year',
                    'dates': list(years),
                })

        attrs['date_hierarchy'] = date_hierarchy

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

        # Add object tools (detail-level actions) from admin
        if model_admin:
            object_tools = getattr(model_admin, 'djnext_object_tools', []) or []
            for tool_item in object_tools:
                if callable(tool_item):
                    tool_func = tool_item
                    tool_name = tool_func.__name__
                else:
                    tool_name = tool_item
                    tool_func = getattr(model_admin, tool_name, None)

                if tool_func and callable(tool_func):
                    attrs[f'object_tool_{tool_name}'] = cls._create_object_tool_endpoint(
                        tool_name,
                        tool_func,
                        model_admin
                    )

        # Add custom views from admin (get_urls equivalent)
        if model_admin:
            custom_views = getattr(model_admin, 'djnext_custom_views', []) or []
            for view_item in custom_views:
                if callable(view_item):
                    view_func = view_item
                    view_name = view_func.__name__
                else:
                    view_name = view_item
                    view_func = getattr(model_admin, view_name, None)

                if view_func and callable(view_func):
                    attrs[f'custom_view_{view_name}'] = cls._create_custom_view_endpoint(
                        view_name,
                        view_func,
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
    def _create_object_tool_endpoint(cls, tool_name, tool_func, model_admin):
        """Create a detail-level action endpoint for object tools."""

        @action(detail=True, methods=['post'], url_path=f'tools/{tool_name}')
        def tool_endpoint(self, request, pk=None):
            """Execute object tool on single object."""
            try:
                obj = self.get_object()
            except Exception:
                return Response(
                    {'error': 'Object not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Execute tool
            try:
                result = tool_func(model_admin, request, obj)

                # If tool returns a Response, use it directly
                if isinstance(result, Response):
                    return result

                # If tool returns a dict, wrap it
                if isinstance(result, dict):
                    return Response(result)

                # Default success response
                description = getattr(
                    tool_func,
                    'short_description',
                    tool_name.replace('_', ' ').title()
                )
                return Response({
                    'success': True,
                    'message': f'{description} completed successfully.',
                })
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )

        tool_endpoint.__name__ = f'object_tool_{tool_name}'
        return tool_endpoint

    @classmethod
    def _create_custom_view_endpoint(cls, view_name, view_func, model_admin):
        """
        Create a custom view endpoint (get_urls equivalent).

        Supports both list-level and detail-level views based on
        the `.detail` attribute on the view function.
        """
        # Check if this is a detail-level view (requires pk)
        is_detail = getattr(view_func, 'detail', False)
        # Get allowed HTTP methods (default to GET)
        allowed_methods = getattr(view_func, 'methods', ['GET'])
        # Normalize to lowercase
        allowed_methods = [m.lower() for m in allowed_methods]

        if is_detail:
            # Detail-level view: /api/admin/{app}/{model}/{pk}/views/{view_name}/
            @action(detail=True, methods=allowed_methods, url_path=f'views/{view_name}')
            def view_endpoint(self, request, pk=None):
                """Execute custom detail-level view."""
                try:
                    obj = self.get_object()
                except Exception:
                    return Response(
                        {'error': 'Object not found.'},
                        status=status.HTTP_404_NOT_FOUND
                    )

                try:
                    result = view_func(model_admin, request, pk)

                    # If view returns a Response, use it directly
                    if isinstance(result, Response):
                        return result

                    # If view returns a dict, wrap it
                    if isinstance(result, dict):
                        return Response(result)

                    # Default response with result as data
                    return Response({'data': result})
                except Exception as e:
                    return Response(
                        {'error': str(e)},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            view_endpoint.__name__ = f'custom_view_{view_name}'
            return view_endpoint
        else:
            # List-level view: /api/admin/{app}/{model}/views/{view_name}/
            @action(detail=False, methods=allowed_methods, url_path=f'views/{view_name}')
            def view_endpoint(self, request):
                """Execute custom list-level view."""
                try:
                    result = view_func(model_admin, request)

                    # If view returns a Response, use it directly
                    if isinstance(result, Response):
                        return result

                    # If view returns a dict, wrap it
                    if isinstance(result, dict):
                        return Response(result)

                    # Default response with result as data
                    return Response({'data': result})
                except Exception as e:
                    return Response(
                        {'error': str(e)},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            view_endpoint.__name__ = f'custom_view_{view_name}'
            return view_endpoint

    @classmethod
    def clear_cache(cls):
        """Clear the ViewSet cache."""
        cls._cache.clear()

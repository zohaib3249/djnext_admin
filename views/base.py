"""
Base ViewSet class for DJNext Admin.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from ..permissions import DJNextModelPermission
from ..settings import djnext_settings


class DJNextPagination(PageNumberPagination):
    """Custom pagination for DJNext Admin."""

    page_size = djnext_settings.PAGE_SIZE
    page_size_query_param = djnext_settings.PAGE_SIZE_QUERY_PARAM
    max_page_size = djnext_settings.MAX_PAGE_SIZE

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'total_pages': self.page.paginator.num_pages,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })


class DJNextBaseViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet with common functionality.
    """

    permission_classes = [DJNextModelPermission]
    pagination_class = DJNextPagination

    # These are set by factory
    model = None
    model_admin = None

    def get_queryset(self):
        """Get queryset with admin's customizations."""
        qs = self.model.objects.all()

        # Apply admin's get_queryset if exists
        if self.model_admin and hasattr(self.model_admin, 'get_queryset'):
            try:
                qs = self.model_admin.get_queryset(self.request)
            except TypeError:
                pass

        return qs

    def get_serializer_context(self):
        """Add extra context for serializers."""
        context = super().get_serializer_context()
        context.update({
            'model': self.model,
            'model_admin': self.model_admin,
        })
        return context

    @property
    def filterset_fields(self):
        """Get filter fields from admin's list_filter."""
        if not self.model_admin:
            return []
        return list(getattr(self.model_admin, 'list_filter', []))

    @property
    def search_fields(self):
        """Get search fields from admin's search_fields."""
        if not self.model_admin:
            return []
        return list(getattr(self.model_admin, 'search_fields', []))

    @property
    def ordering_fields(self):
        """Allow ordering on all fields."""
        return '__all__'

    @property
    def ordering(self):
        """Default ordering from admin."""
        if not self.model_admin:
            return ['-pk']
        ordering = getattr(self.model_admin, 'ordering', None)
        return list(ordering) if ordering else ['-pk']

    # ==========================================
    # CRUD with hooks
    # ==========================================

    def perform_create(self, serializer):
        """Handle object creation with hooks."""
        # Call admin's save_model if exists
        instance = serializer.save()

        if self.model_admin and hasattr(self.model_admin, 'save_model'):
            try:
                self.model_admin.save_model(
                    self.request,
                    instance,
                    None,  # form
                    change=False
                )
            except TypeError:
                pass

        return instance

    def perform_update(self, serializer):
        """Handle object update with hooks."""
        instance = serializer.save()

        if self.model_admin and hasattr(self.model_admin, 'save_model'):
            try:
                self.model_admin.save_model(
                    self.request,
                    instance,
                    None,
                    change=True
                )
            except TypeError:
                pass

        return instance

    def perform_destroy(self, instance):
        """Handle object deletion with hooks."""
        # Call admin's delete_model if exists
        if self.model_admin and hasattr(self.model_admin, 'delete_model'):
            try:
                self.model_admin.delete_model(self.request, instance)
                return
            except TypeError:
                pass

        instance.delete()

    # ==========================================
    # Response customization
    # ==========================================

    def create(self, request, *args, **kwargs):
        """Override create to add message."""
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            response.data['_message'] = f'{self.model._meta.verbose_name} created successfully.'
        return response

    def update(self, request, *args, **kwargs):
        """Override update to add message."""
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            response.data['_message'] = f'{self.model._meta.verbose_name} updated successfully.'
        return response

    def destroy(self, request, *args, **kwargs):
        """Override delete with message."""
        instance = self.get_object()

        try:
            self.perform_destroy(instance)
        except Exception as e:
            from ..exceptions import DeleteProtected
            raise DeleteProtected()

        return Response(
            {'_message': f'{self.model._meta.verbose_name} deleted successfully.'},
            status=status.HTTP_200_OK
        )

"""
Base ViewSet class for DJNext Admin.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from ..audit import log_audit
from ..models import AuditLog
from ..permissions import DJNextModelPermission
from ..settings import djnext_settings


def _audit_serialize(value):
    """Make a value JSON-serializable for audit log storage."""
    if value is None:
        return None
    if hasattr(value, 'pk'):
        return value.pk
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (list, tuple)):
        return [_audit_serialize(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _audit_serialize(v) for k, v in value.items()}
    return str(value)


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

        log_audit('create', self.request, instance=instance)
        return instance

    def perform_update(self, serializer):
        """Handle object update with hooks. Computes changes for audit log."""
        old_instance = serializer.instance
        validated = serializer.validated_data
        changes = {}
        if old_instance is not None and validated:
            for field_name in validated:
                if not hasattr(old_instance, field_name):
                    continue
                try:
                    old_val = getattr(old_instance, field_name, None)
                    new_val = validated[field_name]
                    old_ser = _audit_serialize(old_val)
                    new_ser = _audit_serialize(new_val)
                    if old_ser != new_ser:
                        changes[field_name] = {'old': old_ser, 'new': new_ser}
                except Exception:
                    continue

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

        log_audit('update', self.request, instance=instance, changes=changes)
        return instance

    def perform_destroy(self, instance):
        """Handle object deletion with hooks."""
        log_audit('delete', self.request, instance=instance)
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
        """Override create to add message. AuditLog is view-only."""
        if self.model == AuditLog:
            return Response({'detail': 'Cannot create audit log entries.'}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            response.data['_message'] = f'{self.model._meta.verbose_name} created successfully.'
        return response

    def update(self, request, *args, **kwargs):
        """Override update to add message. AuditLog is view-only."""
        if self.model == AuditLog:
            return Response({'detail': 'Cannot modify audit log entries.'}, status=status.HTTP_403_FORBIDDEN)
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            response.data['_message'] = f'{self.model._meta.verbose_name} updated successfully.'
        return response

    def destroy(self, request, *args, **kwargs):
        """Override delete with message. AuditLog is view-only."""
        if self.model == AuditLog:
            return Response({'detail': 'Cannot delete audit log entries.'}, status=status.HTTP_403_FORBIDDEN)
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

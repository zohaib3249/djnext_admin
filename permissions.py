"""
Permission classes for DJNext Admin.
Uses Django's built-in permission system.
"""

from rest_framework import permissions
from .settings import djnext_settings


class DJNextBasePermission(permissions.BasePermission):
    """
    Base permission that requires authentication and optionally staff status.
    """

    def has_permission(self, request, view):
        # Check authentication
        if djnext_settings.REQUIRE_AUTHENTICATION:
            if not request.user or not request.user.is_authenticated:
                return False

        # Check active status
        if request.user and not request.user.is_active:
            return False

        # Check staff status
        if djnext_settings.REQUIRE_STAFF:
            if not request.user or not request.user.is_staff:
                return False

        return True


class DJNextModelPermission(DJNextBasePermission):
    """
    Permission class that maps HTTP methods to Django model permissions.

    Django creates these permissions automatically for each model:
    - {app}.add_{model}    -> POST (create)
    - {app}.change_{model} -> PUT/PATCH (update)
    - {app}.delete_{model} -> DELETE
    - {app}.view_{model}   -> GET (list/retrieve)
    """

    # Map HTTP methods to permission types
    METHOD_PERMISSION_MAP = {
        'GET': 'view',
        'HEAD': 'view',
        'OPTIONS': 'view',
        'POST': 'add',
        'PUT': 'change',
        'PATCH': 'change',
        'DELETE': 'delete',
    }

    def has_permission(self, request, view):
        # Check base permissions first
        if not super().has_permission(request, view):
            return False

        # Superusers have all permissions
        if djnext_settings.SUPERUSER_FULL_ACCESS and request.user.is_superuser:
            return True

        # Get model from view
        model = getattr(view, 'model', None)
        if not model:
            return True  # No model specified, allow

        # Check Django permission
        return self._check_model_permission(request, model)

    def _check_model_permission(self, request, model):
        """Check if user has the required permission for the model."""
        perm_type = self.METHOD_PERMISSION_MAP.get(request.method, 'view')
        app_label = model._meta.app_label
        model_name = model._meta.model_name
        permission = f'{app_label}.{perm_type}_{model_name}'
        return request.user.has_perm(permission)

    def has_object_permission(self, request, view, obj):
        """Check object-level permission."""
        # Superusers bypass
        if djnext_settings.SUPERUSER_FULL_ACCESS and request.user.is_superuser:
            return True

        # Get model admin for custom permission checks
        model_admin = getattr(view, 'model_admin', None)
        if not model_admin:
            return True

        perm_type = self.METHOD_PERMISSION_MAP.get(request.method, 'view')

        # Check admin's permission method if exists
        if perm_type == 'view':
            method = getattr(model_admin, 'has_view_permission', None)
        elif perm_type == 'change':
            method = getattr(model_admin, 'has_change_permission', None)
        elif perm_type == 'delete':
            method = getattr(model_admin, 'has_delete_permission', None)
        else:
            return True

        if method:
            try:
                return method(request, obj)
            except TypeError:
                # Method signature might be different
                try:
                    return method(request)
                except TypeError:
                    return True

        return True


class IsAdminUser(permissions.BasePermission):
    """Only allow admin/superusers."""

    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class IsStaffUser(permissions.BasePermission):
    """Only allow staff users."""

    def has_permission(self, request, view):
        return request.user and request.user.is_staff

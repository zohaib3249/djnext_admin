"""
Custom exceptions for DJNext Admin.
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class DJNextException(APIException):
    """Base exception for DJNext Admin."""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'An error occurred.'
    default_code = 'djnext_error'


class ModelNotRegistered(DJNextException):
    """Raised when trying to access a model not in Django admin."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Model is not registered in Django admin.'
    default_code = 'model_not_registered'


class ModelNotFound(DJNextException):
    """Raised when model doesn't exist."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Model not found.'
    default_code = 'model_not_found'


class ObjectNotFound(DJNextException):
    """Raised when object doesn't exist."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Object not found.'
    default_code = 'object_not_found'


class PermissionDenied(DJNextException):
    """Raised when user lacks permission."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action.'
    default_code = 'permission_denied'


class ValidationError(DJNextException):
    """Raised for validation errors."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid data.'
    default_code = 'validation_error'


class DeleteProtected(DJNextException):
    """Raised when delete is blocked by protected relations."""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Cannot delete: object is referenced by other objects.'
    default_code = 'delete_protected'

    def __init__(self, protected_objects=None):
        super().__init__()
        self.protected_objects = protected_objects or []
        self.detail = {
            'error': self.default_detail,
            'code': self.default_code,
            'protected_objects': self.protected_objects,
        }


class BulkActionError(DJNextException):
    """Raised when bulk action fails."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Bulk action failed.'
    default_code = 'bulk_action_error'

"""
Views module for DJNext Admin.
Contains all API endpoints.
"""

from .schema import GlobalSchemaView, ModelSchemaView
from .factory import ViewSetFactory
from .auth import AuthViewSet

__all__ = [
    'GlobalSchemaView',
    'ModelSchemaView',
    'ViewSetFactory',
    'AuthViewSet',
]

"""
URL Configuration for DJNext Admin.

Dynamic URL generation for all registered models.
Include this in your project's urls.py:

    path('api/admin/', include('djnext_admin.urls'))

You can use any path you want - it's NOT hardcoded!
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views.schema import GlobalSchemaView, ModelSchemaView
from .views.auth import AuthViewSet
from .views.search import GlobalSearchView
from .views.factory import ViewSetFactory
from .core.registry import get_registered_models
from .settings import djnext_settings


class DJNextRouter(DefaultRouter):
    """
    Custom router for DJNext Admin.
    Automatically registers all models from Django admin.
    """

    def __init__(self):
        super().__init__()
        self._registered = False

    def get_urls(self):
        """Override to register models lazily."""
        if not self._registered:
            self._register_models()
            self._registered = True
        return super().get_urls()

    def _register_models(self):
        """Register all Django admin models."""
        for model, model_admin in get_registered_models():
            app_label = model._meta.app_label
            model_name = model._meta.model_name

            # Create ViewSet
            viewset = ViewSetFactory.create(model, model_admin)

            # Register: /{app_label}/{model_name}/
            self.register(
                f'{app_label}/{model_name}',
                viewset,
                basename=f'{app_label}_{model_name}'
            )


# Create router instance
router = DJNextRouter()

# App name for namespacing
app_name = 'djnext_admin'

# URL patterns
urlpatterns = [
    # Global schema endpoint
    path('schema/', GlobalSchemaView.as_view(), name='global-schema'),

    # Global search across models (char fields, record-level)
    path('search/', GlobalSearchView.as_view(), name='global-search'),

    # Authentication endpoints
    path('auth/login/', AuthViewSet.as_view({'post': 'login'}), name='auth-login'),
    path('auth/logout/', AuthViewSet.as_view({'post': 'logout'}), name='auth-logout'),
    path('auth/user/', AuthViewSet.as_view({'get': 'user'}), name='auth-user'),
    path('auth/refresh/', AuthViewSet.as_view({'post': 'refresh'}), name='auth-refresh'),

    # Model-specific schema endpoint
    path(
        '<str:app_label>/<str:model_name>/schema/',
        ModelSchemaView.as_view(),
        name='model-schema'
    ),

    # Model endpoints (from router)
    path('', include(router.urls)),
]

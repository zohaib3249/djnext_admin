"""
API URL Configuration for DJNext Admin.

Included under path('api/', ...) from the main urls.py, so the API is at
<your-mount>/api/ (e.g. path('admin/', include('djnext_admin.urls')) -> /admin/api/).
Do not include api_urls in your project; use only include('djnext_admin.urls').
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views.schema import GlobalSchemaView, ModelSchemaView, SiteInfoView
from .views.auth import AuthViewSet
from .views.search import GlobalSearchView
from .views.health import HealthView
from .views.relation_options import RelationOptionsView
from .views.factory import ViewSetFactory
from .core.registry import get_registered_models


class DJNextRouter(DefaultRouter):
    """Router for DJNext Admin API. Registers all models from Django admin."""

    def __init__(self):
        super().__init__()
        self._registered = False

    def get_urls(self):
        if not self._registered:
            self._register_models()
            self._registered = True
        return super().get_urls()

    def _register_models(self):
        for model, model_admin in get_registered_models():
            app_label = model._meta.app_label
            model_name = model._meta.model_name
            viewset = ViewSetFactory.create(model, model_admin)
            self.register(
                f'{app_label}/{model_name}',
                viewset,
                basename=f'{app_label}_{model_name}'
            )


router = DJNextRouter()

app_name = 'djnext_admin'

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('site/', SiteInfoView.as_view(), name='site-info'),
    path('schema/', GlobalSchemaView.as_view(), name='global-schema'),
    path('search/', GlobalSearchView.as_view(), name='global-search'),
    path('relation-options/', RelationOptionsView.as_view(), name='relation-options'),
    path('auth/login/', AuthViewSet.as_view({'post': 'login'}), name='auth-login'),
    path('auth/logout/', AuthViewSet.as_view({'post': 'logout'}), name='auth-logout'),
    path('auth/user/', AuthViewSet.as_view({'get': 'user', 'patch': 'profile_update'}), name='auth-user'),
    path('auth/refresh/', AuthViewSet.as_view({'post': 'refresh'}), name='auth-refresh'),
    path('auth/password-reset/', AuthViewSet.as_view({'post': 'password_reset_request'}), name='auth-password-reset'),
    path('auth/password-reset/confirm/', AuthViewSet.as_view({'post': 'password_reset_confirm'}), name='auth-password-reset-confirm'),
    path('auth/password-change/', AuthViewSet.as_view({'post': 'password_change'}), name='auth-password-change'),
    path(
        '<str:app_label>/<str:model_name>/schema/',
        ModelSchemaView.as_view(),
        name='model-schema'
    ),
    path('', include(router.urls)),
]

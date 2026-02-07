"""
Schema endpoints - return admin configuration for frontend.
"""

from rest_framework.views import APIView
from rest_framework.response import Response

from ..core.registry import (
    get_models_by_app,
    get_model_admin,
    get_app_config,
    get_model_permissions,
)
from ..core.introspection import ModelIntrospector
from ..permissions import DJNextBasePermission
from ..settings import djnext_settings


class GlobalSchemaView(APIView):
    """
    Returns complete admin schema for all registered models.
    Frontend uses this to build the entire admin UI.

    GET /api/{path}/schema/
    """

    permission_classes = [DJNextBasePermission]

    def get(self, request):
        # Detect API base path from request
        api_base = self._get_api_base(request)

        return Response({
            'site': self._get_site_info(request, api_base),
            'user': self._get_user_info(request),
            'apps': self._get_apps_schema(request, api_base),
            'navigation': self._get_navigation(request, api_base),
        })

    def _get_api_base(self, request):
        """Detect API base path from request URL."""
        path = request.path
        # Remove 'schema/' from the end to get base
        if path.endswith('schema/'):
            return path[:-7]  # Remove 'schema/'
        elif path.endswith('schema'):
            return path[:-6]  # Remove 'schema'
        return path

    def _get_site_info(self, request, api_base):
        """Site-level information. Relative URLs in custom_css/js are made absolute."""
        info = {
            'name': djnext_settings.SITE_NAME,
            'version': djnext_settings.SITE_VERSION,
            'api_base': api_base,
        }
        def _absolute(u):
            if u and str(u).startswith('/'):
                return request.build_absolute_uri(u)
            return u
        if getattr(djnext_settings, 'CUSTOM_CSS', None):
            info['custom_css'] = [_absolute(u) for u in djnext_settings.CUSTOM_CSS]
        if getattr(djnext_settings, 'CUSTOM_JS', None):
            info['custom_js'] = [_absolute(u) for u in djnext_settings.CUSTOM_JS]
        return info

    def _get_user_info(self, request):
        """Current user information."""
        user = request.user

        if not user or not user.is_authenticated:
            return None

        return {
            'id': user.pk,
            'username': getattr(user, 'username', None) or getattr(user, 'email', ''),
            'email': getattr(user, 'email', ''),
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
        }

    def _get_apps_schema(self, request, api_base):
        """Get schema for all apps and their models."""
        apps = []
        models_by_app = get_models_by_app()

        for app_label, models in models_by_app.items():
            app_config = get_app_config(app_label)

            app_schema = {
                'app_label': app_label,
                'verbose_name': app_config.verbose_name if app_config else app_label.title(),
                'models': [],
            }

            for model, model_admin in models:
                # Check if user has any permission for this model
                permissions = get_model_permissions(request.user, model)
                if not any(permissions.values()):
                    continue

                model_schema = self._get_model_summary(
                    model, model_admin, permissions, api_base
                )
                app_schema['models'].append(model_schema)

            # Only include apps with accessible models
            if app_schema['models']:
                apps.append(app_schema)

        return apps

    def _get_model_summary(self, model, model_admin, permissions, api_base):
        """Get summary schema for a model (used in global schema)."""
        opts = model._meta
        app_label = opts.app_label
        model_name = opts.model_name

        # Get list_display from admin
        list_display = ['id', '__str__']
        if model_admin:
            ld = getattr(model_admin, 'list_display', None)
            if ld:
                list_display = [f for f in ld if f != '__str__']
                if 'id' not in list_display:
                    list_display = ['id'] + list_display

        out = {
            'name': opts.object_name,
            'model_name': model_name,
            'verbose_name': str(opts.verbose_name),
            'verbose_name_plural': str(opts.verbose_name_plural),
            'endpoints': {
                'list': f'{api_base}{app_label}/{model_name}/',
                'create': f'{api_base}{app_label}/{model_name}/',
                'schema': f'{api_base}{app_label}/{model_name}/schema/',
            },
            'permissions': permissions,
            'list_display': list_display,
        }
        if model_admin and hasattr(model_admin, 'djnext_icon'):
            icon = getattr(model_admin, 'djnext_icon', None)
            if icon:
                out['icon'] = str(icon)
        return out

    def _get_navigation(self, request, api_base):
        """Get navigation structure for sidebar."""
        nav = []
        models_by_app = get_models_by_app()

        for app_label, models in models_by_app.items():
            app_config = get_app_config(app_label)
            app_nav = {
                'label': app_config.verbose_name if app_config else app_label.title(),
                'app_label': app_label,
                'items': [],
            }

            for model, model_admin in models:
                permissions = get_model_permissions(request.user, model)
                if not any(permissions.values()):
                    continue

                model_name = model._meta.model_name
                item = {
                    'label': str(model._meta.verbose_name_plural),
                    'model_name': model_name,
                    'url': f'{api_base}{app_label}/{model_name}/',
                }
                # Optional: icon name from admin (e.g. Lucide name: Users, ShoppingCart)
                if model_admin and hasattr(model_admin, 'djnext_icon'):
                    icon = getattr(model_admin, 'djnext_icon', None)
                    if icon:
                        item['icon'] = str(icon)
                app_nav['items'].append(item)

            if app_nav['items']:
                nav.append(app_nav)

        return nav


class ModelSchemaView(APIView):
    """
    Returns detailed schema for a specific model.

    GET /api/{path}/{app}/{model}/schema/
    """

    permission_classes = [DJNextBasePermission]

    def get(self, request, app_label, model_name):
        result = get_model_admin(app_label, model_name)

        if not result:
            from ..exceptions import ModelNotRegistered
            raise ModelNotRegistered()

        model, model_admin = result

        # Detect API base
        api_base = self._get_api_base(request, app_label, model_name)

        # Full introspection
        introspector = ModelIntrospector(model, model_admin)
        schema = introspector.get_schema(request)

        # Add permissions
        schema['permissions'] = get_model_permissions(request.user, model)

        # Per-model custom CSS/JS (like ModelAdmin.media / djnext_media)
        # Relative URLs (e.g. /static/...) are converted to absolute so the frontend can load them
        media = getattr(model_admin, 'djnext_media', None)
        if isinstance(media, dict):
            def _absolute(u):
                if u and str(u).startswith('/'):
                    return request.build_absolute_uri(u)
                return u
            schema['custom_css'] = [_absolute(u) for u in (media.get('css') or [])]
            schema['custom_js'] = [_absolute(u) for u in (media.get('js') or [])]
        else:
            schema['custom_css'] = []
            schema['custom_js'] = []

        # Add endpoints
        schema['endpoints'] = {
            'list': f'{api_base}{app_label}/{model_name}/',
            'create': f'{api_base}{app_label}/{model_name}/',
            'detail': f'{api_base}{app_label}/{model_name}/{{id}}/',
            'update': f'{api_base}{app_label}/{model_name}/{{id}}/',
            'delete': f'{api_base}{app_label}/{model_name}/{{id}}/',
            'schema': f'{api_base}{app_label}/{model_name}/schema/',
            'autocomplete': f'{api_base}{app_label}/{model_name}/autocomplete/',
        }

        return Response(schema)

    def _get_api_base(self, request, app_label, model_name):
        """Detect API base from request path."""
        path = request.path
        # Remove '{app}/{model}/schema/' from the end
        suffix = f'{app_label}/{model_name}/schema/'
        if path.endswith(suffix):
            return path[:-len(suffix)]
        return path

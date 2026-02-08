"""
DJNext Admin Settings.

Simple usage in Django settings.py:

    DJNEXT_ADMIN = {
        'SITE_NAME': 'My Admin',
        'LAYOUT': 'glassmorphism',
        'LAYOUT_ALLOW_SWITCH': True,
    }

All settings are optional:
- If not set, falls back to Django admin settings (site_header, site_title)
- If Django admin not configured, uses sensible defaults
"""

from django.conf import settings as django_settings


# Allowed values
ALLOWED_LAYOUTS = ('basic', 'glassmorphism', 'aurora', 'neumorphism', 'minimal')
ALLOWED_THEME_MODES = ('dark', 'light', 'system')


# All defaults in one place
DEFAULTS = {
    # Site (None means: try Django admin, then fallback)
    'SITE_NAME': None,
    'SITE_VERSION': '1.0.0',

    # Auth
    'REQUIRE_AUTHENTICATION': True,
    'REQUIRE_STAFF': True,

    # Permissions
    'USE_DJANGO_PERMISSIONS': True,
    'SUPERUSER_FULL_ACCESS': True,

    # Pagination
    'PAGE_SIZE': 25,
    'MAX_PAGE_SIZE': 100,
    'PAGE_SIZE_QUERY_PARAM': 'page_size',

    # Features
    'ENABLE_BULK_ACTIONS': True,
    'ENABLE_EXPORT': True,
    'ENABLE_SEARCH': True,
    'ENABLE_FILTERS': True,
    'ENABLE_ORDERING': True,

    # Cache
    'SCHEMA_CACHE_TIMEOUT': 300,

    # Models
    'EXCLUDE_APPS': ['contenttypes', 'sessions'],
    'EXCLUDE_MODELS': [],
    'INCLUDE_ONLY_MODELS': None,

    # Custom assets
    'CUSTOM_CSS': [],
    'CUSTOM_JS': [],

    # Layout
    'LAYOUT': 'basic',
    'LAYOUT_ALLOW_SWITCH': False,
    'LAYOUT_OPTIONS': list(ALLOWED_LAYOUTS),

    # Theme
    'THEME_MODE': 'dark',
    'THEME_PRIMARY_COLOR': None,
    'THEME_ACCENT_COLOR': None,

    # Frontend base path (served under this URL prefix; e.g. '' or '/admin')
    # Exposed in schema so the SPA can use it at runtime; also set NEXT_PUBLIC_BASE_PATH when building.
    'FRONTEND_BASE_PATH': '',

    # API base URL for the frontend (so it can call the backend without env vars).
    # Exposed in schema; frontend uses these when available, else falls back to NEXT_PUBLIC_* or defaults.
    # API_ORIGIN: origin only (e.g. 'http://localhost:8000'). Empty means use request origin.
    'API_ORIGIN': '',
    # API_PATH: path prefix (e.g. '/api/djnext').
    'API_PATH': '/api/djnext',
}


def _get_django_admin_site():
    """Get Django admin site for fallback values."""
    try:
        from django.contrib import admin
        return admin.site
    except Exception:
        return None


class DJNextSettings:
    """
    Settings accessor with validation and Django admin fallback.

    Priority:
    1. DJNEXT_ADMIN setting
    2. Django admin site setting (for site_header, site_title)
    3. Default value
    """

    @property
    def _user_settings(self):
        """Get user settings dict from Django settings."""
        return getattr(django_settings, 'DJNEXT_ADMIN', {})

    def __getattr__(self, name):
        if name.startswith('_') or name not in DEFAULTS:
            raise AttributeError(f"Invalid setting: '{name}'")

        # Get value from user settings
        value = self._user_settings.get(name, DEFAULTS[name])

        # Handle fallbacks for site info
        if name == 'SITE_NAME' and not value:
            admin_site = _get_django_admin_site()
            if admin_site:
                # Try site_header first, then site_title
                value = getattr(admin_site, 'site_header', None)
                if not value or value == 'Django administration':
                    value = getattr(admin_site, 'site_title', None)
                if not value or value == 'Django site admin':
                    value = 'Admin'
            else:
                value = 'Admin'

        # Validate layout
        if name == 'LAYOUT':
            return value if value in ALLOWED_LAYOUTS else 'basic'

        # Validate layout options
        if name == 'LAYOUT_OPTIONS':
            if not isinstance(value, (list, tuple)):
                return list(ALLOWED_LAYOUTS)
            valid = [v for v in value if v in ALLOWED_LAYOUTS]
            return valid if valid else list(ALLOWED_LAYOUTS)

        # Validate theme mode
        if name == 'THEME_MODE':
            return value if value in ALLOWED_THEME_MODES else 'dark'

        return value

    def get_layout_config(self):
        """Validated layout config for API."""
        current = self.LAYOUT
        allow_switch = self.LAYOUT_ALLOW_SWITCH
        options = self.LAYOUT_OPTIONS

        # Ensure current is in options
        if current not in options:
            current = options[0] if options else 'basic'

        # If no switching, only show current
        if not allow_switch:
            options = [current]

        return {
            'current': current,
            'allow_switch': allow_switch,
            'options': options,
        }

    def get_theme_config(self):
        """Validated theme config for API."""
        return {
            'mode': self.THEME_MODE,
            'primary_color': self.THEME_PRIMARY_COLOR,
            'accent_color': self.THEME_ACCENT_COLOR,
        }


# Global instance
djnext_settings = DJNextSettings()

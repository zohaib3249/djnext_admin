"""
DJNext Admin Settings.

All settings with defaults. User can override via DJNEXT_ADMIN in Django settings.
"""

from django.conf import settings


class DJNextSettings:
    """
    Settings manager for DJNext Admin.
    Reads from Django settings with sensible defaults.
    """

    DEFAULTS = {
        # Site info
        'SITE_NAME': 'Admin',
        'SITE_VERSION': '1.0.0',

        # Authentication
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

        # Schema
        'SCHEMA_CACHE_TIMEOUT': 300,  # 5 minutes

        # Models
        'EXCLUDE_APPS': [
            'contenttypes',
            'sessions',
        ],
        'EXCLUDE_MODELS': [],
        'INCLUDE_ONLY_MODELS': None,  # If set, only these models exposed

        # Custom CSS/JS (like Django admin Media) – URLs loaded on every page
        'CUSTOM_CSS': [],
        'CUSTOM_JS': [],
    }

    def __getattr__(self, name):
        """
        Get setting value.
        First check user settings, then defaults.
        """
        if name not in self.DEFAULTS:
            raise AttributeError(f"Invalid DJNext Admin setting: '{name}'")

        user_settings = getattr(settings, 'DJNEXT_ADMIN', {})
        return user_settings.get(name, self.DEFAULTS[name])

    def __contains__(self, name):
        return name in self.DEFAULTS

    def get_all(self):
        """Get all settings as dict."""
        result = self.DEFAULTS.copy()
        user_settings = getattr(settings, 'DJNEXT_ADMIN', {})
        result.update(user_settings)
        return result


# Global settings instance
djnext_settings = DJNextSettings()

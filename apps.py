"""
Django App Configuration for DJNext Admin.
"""

from django.apps import AppConfig


class DjnextAdminConfig(AppConfig):
    """
    Configuration for DJNext Admin app.
    """

    name = 'djnext_admin'
    verbose_name = 'DJNext Admin'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        """
        Called when Django starts.
        Validates settings after all apps are loaded.
        """
        self._validate_dependencies()

    def _validate_dependencies(self):
        """
        Check that required dependencies are installed.
        """
        try:
            import rest_framework
        except ImportError:
            raise ImportError(
                "DJNext Admin requires Django REST Framework. "
                "Install it with: pip install djangorestframework"
            )

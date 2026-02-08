"""
Registry module - reads from Django admin's registry.

This is the KEY file that enables "no separate registration" -
we read directly from django.contrib.admin.site._registry
"""

from typing import Generator, Tuple, Type, Optional, Dict, List
from django.contrib import admin
from django.apps import apps

from ..settings import djnext_settings


def get_admin_site():
    """
    Get the Django admin site instance.
    Default is django.contrib.admin.site.
    """
    return admin.site


def get_registry() -> Dict:
    """
    Get the raw Django admin registry.

    Returns:
        dict: {Model: ModelAdmin} mapping
    """
    return get_admin_site()._registry


def get_registered_models() -> Generator[Tuple[Type, object], None, None]:
    """
    Generator yielding (Model, ModelAdmin) tuples for all registered models.

    Applies exclusion filters from settings.

    Yields:
        Tuple[Model, ModelAdmin]: Each registered model and its admin instance

    Example:
        for model, admin_instance in get_registered_models():
            print(f"{model.__name__}: {admin_instance.__class__.__name__}")
    """
    registry = get_registry()

    for model, model_admin in registry.items():
        # Get model info
        app_label = model._meta.app_label
        model_name = model._meta.object_name
        model_path = f'{app_label}.{model_name}'

        # Check app exclusions
        if app_label in djnext_settings.EXCLUDE_APPS:
            continue

        # Check model exclusions
        if model_path in djnext_settings.EXCLUDE_MODELS:
            continue

        # Check include-only filter
        include_only = djnext_settings.INCLUDE_ONLY_MODELS
        if include_only and model_path not in include_only:
            continue

        yield model, model_admin


def get_model_admin(app_label: str, model_name: str) -> Optional[Tuple[Type, object]]:
    """
    Get specific model and its admin instance.

    Args:
        app_label: Django app label (e.g., 'shop')
        model_name: Model name in lowercase (e.g., 'product')

    Returns:
        Tuple[Model, ModelAdmin] or None if not found/registered
    """
    try:
        model = apps.get_model(app_label, model_name)
    except LookupError:
        return None

    registry = get_registry()
    model_admin = registry.get(model)

    if model_admin is None:
        return None

    # Check exclusions
    model_path = f'{app_label}.{model._meta.object_name}'
    if app_label in djnext_settings.EXCLUDE_APPS:
        return None
    if model_path in djnext_settings.EXCLUDE_MODELS:
        return None

    return model, model_admin


def is_model_registered(model) -> bool:
    """
    Check if a model is registered in Django admin.
    """
    if model is None:
        return False
    return model in get_registry()


def get_models_by_app() -> Dict[str, List[Tuple[Type, object]]]:
    """
    Get registered models grouped by app.

    Returns:
        dict: {app_label: [(Model, ModelAdmin), ...]}
    """
    by_app = {}

    for model, model_admin in get_registered_models():
        app_label = model._meta.app_label

        if app_label not in by_app:
            by_app[app_label] = []

        by_app[app_label].append((model, model_admin))

    return by_app


def get_app_config(app_label: str):
    """
    Get Django app config for an app.
    """
    try:
        return apps.get_app_config(app_label)
    except LookupError:
        return None


def get_model_permissions(user, model) -> Dict[str, bool]:
    """
    Get all permissions for a model for a user.

    Returns:
        dict: {add: bool, change: bool, delete: bool, view: bool}
    """
    app_label = model._meta.app_label
    model_name = model._meta.model_name

    # AuditLog is view-only: no add, edit, or delete in admin or frontend
    if app_label == 'djnext_admin' and model_name == 'auditlog':
        return {
            'add': False,
            'change': False,
            'delete': False,
            'view': True,
        }

    if user.is_superuser and djnext_settings.SUPERUSER_FULL_ACCESS:
        return {
            'add': True,
            'change': True,
            'delete': True,
            'view': True,
        }

    return {
        'add': user.has_perm(f'{app_label}.add_{model_name}'),
        'change': user.has_perm(f'{app_label}.change_{model_name}'),
        'delete': user.has_perm(f'{app_label}.delete_{model_name}'),
        'view': user.has_perm(f'{app_label}.view_{model_name}'),
    }

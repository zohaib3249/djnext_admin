"""
DJNext Admin - Headless Django Admin API

A Django app that reads from existing Django admin registry
and exposes REST APIs automatically.

No separate registration needed - your existing admin.py works!
"""

__version__ = '0.0.2'

# Convenience imports
from .core.registry import get_registry, get_registered_models, get_model_admin

__all__ = [
    'get_registry',
    'get_registered_models',
    'get_model_admin',
    '__version__',
]

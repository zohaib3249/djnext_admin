"""
Core module for DJNext Admin.
Contains registry reader, model introspection, and schema generation.
"""

from .registry import (
    get_registry,
    get_registered_models,
    get_model_admin,
    get_models_by_app,
    is_model_registered,
)
from .introspection import ModelIntrospector, FieldIntrospector

__all__ = [
    'get_registry',
    'get_registered_models',
    'get_model_admin',
    'get_models_by_app',
    'is_model_registered',
    'ModelIntrospector',
    'FieldIntrospector',
]

"""
Model introspection - extracts schema from Django models.

Converts Django models and ModelAdmin configuration into
JSON schema for frontend consumption.
"""

from typing import Dict, List, Any, Optional


def _title_name(s):
    """Capitalize model/verbose name for display (e.g. 'user address' -> 'User Address')."""
    if s is None:
        return ''
    return str(s).replace('_', ' ').title()
from django.db import models
from django.db.models.fields import Field
from django.db.models.fields.related import RelatedField


class FieldIntrospector:
    """
    Introspects a Django model field and returns schema.
    """

    # Django field type to JSON schema type mapping
    TYPE_MAP = {
        # String types
        'CharField': {'type': 'string', 'widget': 'text'},
        'TextField': {'type': 'string', 'widget': 'textarea'},
        'EmailField': {'type': 'string', 'format': 'email', 'widget': 'email'},
        'URLField': {'type': 'string', 'format': 'uri', 'widget': 'url'},
        'SlugField': {'type': 'string', 'widget': 'slug'},
        'UUIDField': {'type': 'string', 'format': 'uuid', 'widget': 'text'},
        'IPAddressField': {'type': 'string', 'format': 'ipv4', 'widget': 'text'},
        'GenericIPAddressField': {'type': 'string', 'widget': 'text'},

        # Number types
        'IntegerField': {'type': 'integer', 'widget': 'number'},
        'SmallIntegerField': {'type': 'integer', 'widget': 'number'},
        'BigIntegerField': {'type': 'integer', 'widget': 'number'},
        'PositiveIntegerField': {'type': 'integer', 'minimum': 0, 'widget': 'number'},
        'PositiveSmallIntegerField': {'type': 'integer', 'minimum': 0, 'widget': 'number'},
        'PositiveBigIntegerField': {'type': 'integer', 'minimum': 0, 'widget': 'number'},
        'FloatField': {'type': 'number', 'widget': 'number'},
        'DecimalField': {'type': 'string', 'widget': 'decimal'},

        # Boolean
        'BooleanField': {'type': 'boolean', 'widget': 'checkbox'},
        'NullBooleanField': {'type': 'boolean', 'nullable': True, 'widget': 'select'},

        # Date/Time
        'DateField': {'type': 'string', 'format': 'date', 'widget': 'date'},
        'DateTimeField': {'type': 'string', 'format': 'date-time', 'widget': 'datetime'},
        'TimeField': {'type': 'string', 'format': 'time', 'widget': 'time'},
        'DurationField': {'type': 'string', 'widget': 'duration'},

        # File types
        'FileField': {'type': 'string', 'widget': 'file'},
        'ImageField': {'type': 'string', 'widget': 'image'},
        'FilePathField': {'type': 'string', 'widget': 'filepath'},

        # Other
        'JSONField': {'type': 'object', 'widget': 'json'},
        'BinaryField': {'type': 'string', 'widget': 'binary'},

        # Auto fields (read-only)
        'AutoField': {'type': 'integer', 'widget': 'hidden', 'readonly': True},
        'BigAutoField': {'type': 'integer', 'widget': 'hidden', 'readonly': True},
        'SmallAutoField': {'type': 'integer', 'widget': 'hidden', 'readonly': True},
    }

    def __init__(self, field: Field):
        self.field = field

    def get_schema(self) -> Dict[str, Any]:
        """Get complete schema for this field."""
        field = self.field
        field_type = field.__class__.__name__

        # Start with base type info
        base_schema = self.TYPE_MAP.get(
            field_type,
            {'type': 'string', 'widget': 'text'}
        ).copy()

        # Build schema
        schema = {
            'name': field.name,
            'verbose_name': str(getattr(field, 'verbose_name', field.name)),
            'help_text': str(field.help_text) if field.help_text else None,
            'required': not getattr(field, 'blank', True) and not self._has_default(field),
            'nullable': getattr(field, 'null', False),
            'editable': getattr(field, 'editable', True),
            'primary_key': getattr(field, 'primary_key', False),
            **base_schema,
        }

        # Add constraints
        if hasattr(field, 'max_length') and field.max_length:
            schema['max_length'] = field.max_length

        if hasattr(field, 'max_digits') and field.max_digits:
            schema['max_digits'] = field.max_digits

        if hasattr(field, 'decimal_places') and field.decimal_places:
            schema['decimal_places'] = field.decimal_places

        # Add default
        if self._has_default(field):
            default = self._get_default(field)
            if default is not None:
                schema['default'] = default
            schema['has_default'] = True

        # Add choices
        if field.choices:
            schema['choices'] = [
                {'value': value, 'label': str(label)}
                for value, label in field.choices
            ]
            schema['widget'] = 'select'

        # Handle relations
        if isinstance(field, RelatedField):
            schema.update(self._get_relation_schema())

        return schema

    def _has_default(self, field) -> bool:
        """Check if field has a default value."""
        return field.has_default() if hasattr(field, 'has_default') else False

    def _get_default(self, field):
        """Get field's default value (if not callable)."""
        if not self._has_default(field):
            return None
        default = field.get_default()
        if callable(default):
            return None  # Don't include callable defaults
        return default

    def _get_relation_schema(self) -> Dict[str, Any]:
        """Get schema for relation field."""
        field = self.field
        related_model = field.related_model

        relation_info = {
            'relation': {
                'model': related_model._meta.label,
                'app_label': related_model._meta.app_label,
                'model_name': related_model._meta.model_name,
                'verbose_name': str(related_model._meta.verbose_name),
            }
        }

        if field.many_to_many:
            relation_info['type'] = 'array'
            relation_info['widget'] = 'multiselect'
            relation_info['relation']['type'] = 'many_to_many'
        elif field.one_to_one:
            relation_info['widget'] = 'select'
            relation_info['relation']['type'] = 'one_to_one'
        elif field.many_to_one:  # ForeignKey
            relation_info['widget'] = 'select'
            relation_info['relation']['type'] = 'foreign_key'

        return relation_info


class ModelIntrospector:
    """
    Introspects a Django model and returns complete schema.
    """

    def __init__(self, model, model_admin=None):
        self.model = model
        self.admin = model_admin
        self.opts = model._meta

    def get_schema(self, request=None) -> Dict[str, Any]:
        """Get complete schema for the model."""
        return {
            'model': self._get_model_info(),
            'fields': self._get_fields(request),
            'fieldsets': self._get_fieldsets(request),
            'list_display': self._get_list_display(request),
            'list_filter': self._get_list_filter(request),
            'search_fields': self._get_search_fields(request),
            'ordering': self._get_ordering(request),
            'actions': self._get_actions(request),
            'inlines': self._get_inlines(request),
        }

    def _get_model_info(self) -> Dict[str, Any]:
        """Basic model information."""
        return {
            'name': self.opts.object_name,
            'app_label': self.opts.app_label,
            'model_name': self.opts.model_name,
            'verbose_name': _title_name(self.opts.verbose_name),
            'verbose_name_plural': _title_name(self.opts.verbose_name_plural),
            'db_table': self.opts.db_table,
            'pk_field': self.opts.pk.name if self.opts.pk else 'id',
        }

    def _get_fields(self, request=None) -> List[Dict[str, Any]]:
        """Get schema for all fields."""
        fields = []

        # Get admin configuration
        readonly_fields = self._get_admin_attr('readonly_fields', [])
        exclude_fields = self._get_admin_attr('exclude', []) or []

        for field in self.opts.get_fields():
            # Skip excluded fields
            if field.name in exclude_fields:
                continue

            # Skip reverse relations (unless explicitly included)
            if field.one_to_many or (field.many_to_many and not field.concrete):
                continue

            # Skip non-field attributes
            if not hasattr(field, 'get_internal_type'):
                continue

            try:
                field_schema = FieldIntrospector(field).get_schema()
            except Exception:
                continue

            # Mark as readonly if in admin's readonly_fields
            if field.name in readonly_fields:
                field_schema['readonly'] = True

            fields.append(field_schema)

        return fields

    def _get_fieldsets(self, request=None) -> Optional[List[Dict]]:
        """
        Get fieldsets from admin. Supports Django's structure: each section
        has 'fields' as a tuple of field names or nested tuples (same row).
        Normalized to list of (string | list of strings) for frontend.
        """
        fieldsets = self._get_admin_attr('fieldsets', None)
        if not fieldsets:
            return None

        result = []
        for name, options in fieldsets:
            raw_fields = options.get('fields', [])
            # Normalize: each item is either a string or a list of strings (row)
            normalized = []
            for item in raw_fields:
                if isinstance(item, (list, tuple)):
                    normalized.append([str(x) for x in item])
                else:
                    normalized.append(str(item))
            result.append({
                'name': name,
                'title': name or 'General',
                'fields': normalized,
                'classes': list(options.get('classes', [])),
                'description': options.get('description'),
            })

        return result

    def _get_list_display(self, request=None) -> List[str]:
        """Get list_display from admin."""
        list_display = self._get_admin_attr('list_display', None)
        if list_display:
            return [f for f in list_display if f != '__str__']
        return ['id', '__str__']

    def _get_list_filter(self, request=None) -> List[str]:
        """Get list_filter from admin."""
        return list(self._get_admin_attr('list_filter', []))

    def _get_search_fields(self, request=None) -> List[str]:
        """Get search_fields from admin."""
        return list(self._get_admin_attr('search_fields', []))

    def _get_ordering(self, request=None) -> List[str]:
        """Get ordering from admin."""
        ordering = self._get_admin_attr('ordering', None)
        if ordering:
            return list(ordering)
        return ['-pk']

    def _get_actions(self, request=None) -> List[Dict[str, Any]]:
        """Get available actions from admin."""
        actions = []
        admin_actions = self._get_admin_attr('actions', [])

        for action_item in admin_actions:
            if callable(action_item):
                action_func = action_item
                action_name = action_func.__name__
            else:
                action_name = action_item
                action_func = getattr(self.admin, action_name, None) if self.admin else None

            if action_func:
                actions.append({
                    'name': action_name,
                    'description': getattr(
                        action_func,
                        'short_description',
                        action_name.replace('_', ' ').title()
                    ),
                })

        return actions

    def _get_inlines(self, request=None) -> List[Dict[str, Any]]:
        """Get inline configurations from admin."""
        inlines = []
        admin_inlines = self._get_admin_attr('inlines', [])

        for inline_class in admin_inlines:
            try:
                inline_model = inline_class.model
                inlines.append({
                    'model': inline_model._meta.label,
                    'app_label': inline_model._meta.app_label,
                    'model_name': inline_model._meta.model_name,
                    'verbose_name': _title_name(inline_model._meta.verbose_name),
                    'verbose_name_plural': _title_name(inline_model._meta.verbose_name_plural),
                    'fk_name': getattr(inline_class, 'fk_name', None),
                    'extra': getattr(inline_class, 'extra', 3),
                    'min_num': getattr(inline_class, 'min_num', 0),
                    'max_num': getattr(inline_class, 'max_num', None),
                })
            except Exception:
                continue

        return inlines

    def _get_admin_attr(self, attr_name: str, default=None):
        """Safely get attribute from admin."""
        if not self.admin:
            return default
        return getattr(self.admin, attr_name, default)

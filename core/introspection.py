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
            'list_display_links': self._get_list_display_links(request),
            'list_editable': self._get_list_editable(request),
            'date_hierarchy': self._get_date_hierarchy(request),
            'list_filter': self._get_list_filter(request),
            'search_fields': self._get_search_fields(request),
            'ordering': self._get_ordering(request),
            'actions': self._get_actions(request),
            'object_tools': self._get_object_tools(request),
            'custom_views': self._get_custom_views(request),
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

    def _get_list_display(self, request=None) -> List[Dict[str, Any]]:
        """
        Get list_display from admin with metadata.
        Returns list of dicts with field info including:
        - name: field name
        - label: display label (from short_description or field verbose_name)
        - is_html: whether field can contain HTML (via allow_html attribute)
        - is_method: whether it's a computed/method field
        - sortable: whether column is sortable
        """
        list_display = self._get_admin_attr('list_display', None)
        if not list_display:
            list_display = ['id']

        result = []
        model_fields = {f.name: f for f in self.model._meta.get_fields()}

        for field_name in list_display:
            if field_name == '__str__':
                continue

            field_info = {
                'name': field_name,
                'label': field_name.replace('_', ' ').title(),
                'is_html': False,
                'is_method': False,
                'sortable': False,
            }

            # Check if it's a model field
            if field_name in model_fields:
                model_field = model_fields[field_name]
                field_info['label'] = getattr(model_field, 'verbose_name', field_name).title()
                field_info['sortable'] = True
            else:
                # It's a method field - check admin then model
                method = getattr(self.admin, field_name, None) if self.admin else None
                if not method:
                    method = getattr(self.model, field_name, None)

                if method and callable(method):
                    field_info['is_method'] = True
                    # Check for allow_html attribute (Django convention)
                    field_info['is_html'] = getattr(method, 'allow_html', False)
                    # Check for short_description
                    short_desc = getattr(method, 'short_description', None)
                    if short_desc:
                        field_info['label'] = str(short_desc)
                    # Check for admin_order_field for sortability
                    order_field = getattr(method, 'admin_order_field', None)
                    if order_field:
                        field_info['sortable'] = True
                        field_info['order_field'] = order_field

            result.append(field_info)

        return result

    def _get_list_display_links(self, request=None) -> Optional[List[str]]:
        """
        Get list_display_links from admin.

        Django Admin behavior:
        - If None (default): first column in list_display is clickable
        - If empty tuple/list: no columns are clickable
        - If list of field names: those columns are clickable links to detail

        Returns:
        - None: default behavior (first column clickable)
        - []: no links
        - ['field1', 'field2']: specific fields are clickable
        """
        list_display_links = self._get_admin_attr('list_display_links', None)

        # None means default behavior - return None to let frontend decide
        if list_display_links is None:
            return None

        # Return as list
        return list(list_display_links)

    def _get_list_editable(self, request=None) -> List[str]:
        """
        Get list_editable from admin.

        Returns list of field names that can be edited inline in the list view.
        Note: fields in list_editable cannot be in list_display_links (Django rule).
        """
        list_editable = self._get_admin_attr('list_editable', None)
        if not list_editable:
            return []
        return list(list_editable)

    def _get_date_hierarchy(self, request=None) -> Optional[str]:
        """
        Get date_hierarchy field from admin.

        Returns the field name to use for date-based drill-down navigation,
        or None if not configured.
        """
        return self._get_admin_attr('date_hierarchy', None)

    def _get_list_display_names(self, request=None) -> List[str]:
        """Get just the field names for list_display (backward compatible)."""
        list_display = self._get_list_display(request)
        return [f['name'] for f in list_display]

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

    def _get_object_tools(self, request=None) -> List[Dict[str, Any]]:
        """
        Get object tools (action buttons on detail page) from admin.

        Object tools are defined via `djnext_object_tools` attribute on the admin:
            djnext_object_tools = ['view_on_site', 'clone_object', 'send_email']

        Each tool can be:
        - A string referencing a method on the admin class
        - Methods should accept (self, request, obj) and return a Response or dict

        Method attributes:
        - short_description: Button label (defaults to method name titleized)
        - icon: Lucide icon name (e.g., 'ExternalLink', 'Copy', 'Mail')
        - variant: Button variant ('primary', 'secondary', 'danger', 'ghost')
        - confirm: Confirmation message (shows confirm dialog before executing)
        """
        tools = []
        object_tools = self._get_admin_attr('djnext_object_tools', [])

        for tool_item in object_tools:
            if callable(tool_item):
                tool_func = tool_item
                tool_name = tool_func.__name__
            else:
                tool_name = tool_item
                tool_func = getattr(self.admin, tool_name, None) if self.admin else None

            if tool_func and callable(tool_func):
                tools.append({
                    'name': tool_name,
                    'label': getattr(
                        tool_func,
                        'short_description',
                        tool_name.replace('_', ' ').title()
                    ),
                    'icon': getattr(tool_func, 'icon', None),
                    'variant': getattr(tool_func, 'variant', 'secondary'),
                    'confirm': getattr(tool_func, 'confirm', None),
                })

        return tools

    def _get_custom_views(self, request=None) -> List[Dict[str, Any]]:
        """
        Get custom views (get_urls equivalent) from admin.

        Custom views are defined via `djnext_custom_views` attribute on the admin:
            djnext_custom_views = ['export_csv', 'statistics', 'preview']

        Each view should be a method on the admin class.

        Method attributes:
        - detail: True for detail-level (requires pk), False for list-level (default)
        - methods: HTTP methods allowed, default ['GET']
        - short_description: Description for documentation

        Endpoints are accessible at:
        - List-level: /api/admin/{app}/{model}/views/{view_name}/
        - Detail-level: /api/admin/{app}/{model}/{pk}/views/{view_name}/
        """
        views = []
        custom_views = self._get_admin_attr('djnext_custom_views', [])

        for view_item in custom_views:
            if callable(view_item):
                view_func = view_item
                view_name = view_func.__name__
            else:
                view_name = view_item
                view_func = getattr(self.admin, view_name, None) if self.admin else None

            if view_func and callable(view_func):
                views.append({
                    'name': view_name,
                    'description': getattr(
                        view_func,
                        'short_description',
                        view_name.replace('_', ' ').title()
                    ),
                    'detail': getattr(view_func, 'detail', False),
                    'methods': getattr(view_func, 'methods', ['GET']),
                })

        return views

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

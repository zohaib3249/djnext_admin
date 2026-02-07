"""
Dynamic serializer generation.

Creates DRF serializers on-the-fly based on model and admin configuration.
"""

from rest_framework import serializers
from .fields import RelatedFieldSerializer, FileFieldSerializer, ImageFieldSerializer


class SerializerFactory:
    """
    Dynamically creates serializers for models.
    """

    _cache = {}

    @classmethod
    def get_serializer(cls, model, model_admin, action='list'):
        """
        Get or create serializer for model and action.

        Args:
            model: Django model class
            model_admin: Django ModelAdmin instance
            action: 'list', 'retrieve', 'create', 'update', 'partial_update'

        Returns:
            Serializer class
        """
        cache_key = f'{model._meta.label}_{action}'

        if cache_key not in cls._cache:
            cls._cache[cache_key] = cls._create_serializer(
                model, model_admin, action
            )

        return cls._cache[cache_key]

    @classmethod
    def _create_serializer(cls, model, model_admin, action):
        """Create a serializer class dynamically."""

        # Determine fields based on action
        if action == 'list':
            fields = cls._get_list_fields(model, model_admin)
        elif action in ['create', 'update', 'partial_update']:
            fields = cls._get_write_fields(model, model_admin)
        else:  # retrieve
            fields = cls._get_detail_fields(model, model_admin)

        # Get readonly fields
        readonly_fields = cls._get_readonly_fields(model_admin)

        # Build serializer attributes
        serializer_attrs = {}
        extra_fields = []

        # Add computed fields for list/retrieve
        if action in ['list', 'retrieve']:
            extra_fields.append('_display')
            serializer_attrs['_display'] = serializers.SerializerMethodField()
            serializer_attrs['get__display'] = lambda self, obj: str(obj)

            # Get relation field serializers - only for fields in our list
            relation_fields = cls._get_relation_read_fields(model, model_admin)
            if fields != '__all__':
                # Only include relation serializers for fields in our list
                fields_set = set(fields)
                relation_fields = {
                    k: v for k, v in relation_fields.items()
                    if k in fields_set
                }
            serializer_attrs.update(relation_fields)

        # Build Meta class
        if fields != '__all__':
            # Add extra fields to the list
            meta_fields = list(fields) + extra_fields
        else:
            meta_fields = '__all__'

        meta_attrs = {
            'model': model,
            'fields': meta_fields,
        }

        if readonly_fields and action not in ['create', 'update', 'partial_update']:
            meta_attrs['read_only_fields'] = readonly_fields

        Meta = type('Meta', (), meta_attrs)
        serializer_attrs['Meta'] = Meta

        # Create serializer class
        serializer_class = type(
            f'{model.__name__}{action.title()}Serializer',
            (serializers.ModelSerializer,),
            serializer_attrs
        )

        return serializer_class

    @classmethod
    def _get_list_fields(cls, model, model_admin):
        """Get fields for list view."""
        if model_admin:
            list_display = getattr(model_admin, 'list_display', None)
            if list_display:
                # Filter out methods/non-fields
                valid_fields = {f.name for f in model._meta.get_fields()}
                fields = ['id']  # Always include id
                for f in list_display:
                    if f in valid_fields and f != '__str__':
                        fields.append(f)
                return fields

        return '__all__'

    @classmethod
    def _get_detail_fields(cls, model, model_admin):
        """Get fields for detail view."""
        if model_admin:
            # Check for explicit fields
            fields = getattr(model_admin, 'fields', None)
            if fields:
                return list(fields)

            # Check for fieldsets
            fieldsets = getattr(model_admin, 'fieldsets', None)
            if fieldsets:
                fields = []
                for name, options in fieldsets:
                    fs_fields = options.get('fields', [])
                    # Handle nested tuples in fieldsets
                    for f in fs_fields:
                        if isinstance(f, (list, tuple)):
                            fields.extend(f)
                        else:
                            fields.append(f)
                return fields

        return '__all__'

    @classmethod
    def _get_write_fields(cls, model, model_admin):
        """Get fields for create/update."""
        editable_fields = []

        for field in model._meta.get_fields():
            # Skip non-editable fields
            if not getattr(field, 'editable', True):
                continue

            # Skip auto fields
            if getattr(field, 'primary_key', False):
                continue

            # Skip reverse relations
            if field.one_to_many:
                continue

            # Skip auto_now fields
            if getattr(field, 'auto_now', False) or getattr(field, 'auto_now_add', False):
                continue

            editable_fields.append(field.name)

        # Apply admin exclusions
        if model_admin:
            exclude = getattr(model_admin, 'exclude', []) or []
            readonly = getattr(model_admin, 'readonly_fields', []) or []
            editable_fields = [
                f for f in editable_fields
                if f not in exclude and f not in readonly
            ]

        return editable_fields

    @classmethod
    def _get_readonly_fields(cls, model_admin):
        """Get readonly fields from admin."""
        if not model_admin:
            return []
        return list(getattr(model_admin, 'readonly_fields', []) or [])

    @classmethod
    def _get_relation_read_fields(cls, model, model_admin):
        """Create read-only serializer fields for relations."""
        relation_fields = {}

        for field in model._meta.get_fields():
            if not field.is_relation:
                continue

            # Skip reverse relations
            if field.one_to_many or (field.many_to_many and not field.concrete):
                continue

            # Create nested serializer for relations
            if field.many_to_many:
                relation_fields[field.name] = RelatedFieldSerializer(
                    many=True,
                    read_only=True
                )
            else:
                relation_fields[field.name] = RelatedFieldSerializer(
                    read_only=True
                )

        return relation_fields

    @classmethod
    def clear_cache(cls):
        """Clear the serializer cache."""
        cls._cache.clear()

    @classmethod
    def invalidate_model(cls, model):
        """Invalidate cache for a specific model."""
        label = model._meta.label
        keys_to_remove = [k for k in cls._cache if k.startswith(label)]
        for key in keys_to_remove:
            del cls._cache[key]

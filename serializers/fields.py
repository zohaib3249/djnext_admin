"""
Custom serializer fields for DJNext Admin.
"""

from rest_framework import serializers


class RelatedFieldSerializer(serializers.Serializer):
    """
    Generic serializer for related objects.
    Shows id and string representation.
    """

    id = serializers.IntegerField(source='pk', read_only=True)
    _display = serializers.SerializerMethodField()

    def get__display(self, obj):
        return str(obj)

    def to_representation(self, instance):
        if instance is None:
            return None
        return {
            'id': instance.pk,
            '_display': str(instance),
        }


class FileFieldSerializer(serializers.FileField):
    """
    Custom file field that returns URL and metadata.
    """

    def to_representation(self, value):
        if not value:
            return None

        try:
            return {
                'url': value.url if hasattr(value, 'url') else None,
                'name': value.name.split('/')[-1] if value.name else None,
                'size': value.size if hasattr(value, 'size') else None,
            }
        except Exception:
            return None


class ImageFieldSerializer(FileFieldSerializer):
    """
    Custom image field with dimensions.
    """

    def to_representation(self, value):
        data = super().to_representation(value)

        if data and value:
            try:
                if hasattr(value, 'width') and hasattr(value, 'height'):
                    data['width'] = value.width
                    data['height'] = value.height
            except Exception:
                pass

        return data


class ChoiceDisplayField(serializers.ChoiceField):
    """
    Choice field that includes display value.
    """

    def to_representation(self, value):
        if value is None:
            return None

        display = None
        for choice_value, choice_display in self.choices.items():
            if str(choice_value) == str(value):
                display = choice_display
                break

        return {
            'value': value,
            'display': display or value,
        }

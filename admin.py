"""
Admin for DJNext – mixin + full ModelAdmin so one registration works for both
Django admin and djnext_admin (API + frontend).

Use the complete admin: class MyAdmin(DJNextModelAdmin): ...
Or mixin only: class MyAdmin(DJNextAdminMixin, admin.ModelAdmin): ...
"""

from django.contrib import admin


class DJNextAdminMixin:
    """
    Mixin for ModelAdmin. Overrides save_model and delete_model so that
    optional hooks run in both Django admin and djnext_admin API/frontend.

    Hooks (override in your admin if you need them):
      - djnext_after_save(request, obj, change)  # after create or update
      - djnext_before_delete(request, obj)      # before delete
    """

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if hasattr(self, "djnext_after_save"):
            self.djnext_after_save(request, obj, change)

    def delete_model(self, request, obj):
        if hasattr(self, "djnext_before_delete"):
            self.djnext_before_delete(request, obj)
        super().delete_model(request, obj)


class DJNextModelAdmin(DJNextAdminMixin, admin.ModelAdmin):
    """
    Complete admin base: mixin + ModelAdmin. Subclass this for a single
    admin that works in both Django admin and djnext_admin with hooks.

    Optional attributes:

      - djnext_icon: Lucide icon name (e.g. 'Users', 'ShoppingCart') for
        dashboard/sidebar. If unset, frontend uses initials from verbose name.

      - djnext_search_fields: List of field names used for global search
        across tables. Id/pk are used only for navigation (links), not search.
        If unset, falls back to search_fields, then to char/text/email/url
        fields (excluding id/pk).

      - djnext_display: List of field names (or '__str__') used to build the
        display string for each record in global search results. If unset,
        uses the model's __str__.

      - djnext_media: Dict like Django's ModelAdmin.Media for custom CSS/JS
        on this model's pages: {'css': ['url1', 'url2'], 'js': ['url1']}.
        URLs are loaded when the user is on list/detail/create for this model.
    """
    pass

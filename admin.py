"""
Admin for DJNext – mixin + full ModelAdmin so one registration works for both
Django admin and djnext_admin (API + frontend).

Use the complete admin: class MyAdmin(DJNextModelAdmin): ...
Or mixin only: class MyAdmin(DJNextAdminMixin, admin.ModelAdmin): ...
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import AuditLog


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

      - djnext_object_tools: List of method names that appear as action buttons
        on the detail page. Each method receives (self, request, obj) and can
        return a dict or Response. Method attributes:
          - short_description: Button label
          - icon: Lucide icon name (e.g., 'ExternalLink', 'Copy')
          - variant: 'primary', 'secondary', 'danger', 'ghost'
          - confirm: Confirmation message before executing

        Example:
            djnext_object_tools = ['clone_object', 'send_notification']

            def clone_object(self, request, obj):
                new_obj = obj.clone()
                return {'message': f'Cloned as #{new_obj.pk}', 'success': True}
            clone_object.short_description = 'Clone'
            clone_object.icon = 'Copy'
            clone_object.confirm = 'Are you sure you want to clone this item?'

      - djnext_custom_views: List of method names that become custom API endpoints.
        Each method receives (self, request) for list-level views or
        (self, request, pk) for detail-level views. Set `.detail = True` on the
        method for detail-level. Returns dict or Response.

        Endpoints are accessible at:
          - List-level: /api/admin/{app}/{model}/views/{view_name}/
          - Detail-level: /api/admin/{app}/{model}/{pk}/views/{view_name}/

        Method attributes:
          - detail: True for detail-level (requires pk), False for list-level
          - methods: HTTP methods allowed, default ['GET']
          - short_description: Description for documentation

        Example:
            djnext_custom_views = ['export_csv', 'statistics', 'preview']

            def export_csv(self, request):
                # Generate CSV export
                qs = self.model.objects.all()
                return {'url': generate_csv_url(qs)}
            export_csv.methods = ['GET']
            export_csv.short_description = 'Export as CSV'

            def statistics(self, request):
                # Return aggregate statistics
                return {
                    'total': self.model.objects.count(),
                    'active': self.model.objects.filter(is_active=True).count(),
                }
            statistics.methods = ['GET']

            def preview(self, request, pk):
                # Preview a single object
                obj = self.model.objects.get(pk=pk)
                return {'preview_html': obj.render_preview()}
            preview.detail = True
            preview.methods = ['GET']
    """
    pass


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Audit log – records create/update/delete from DJNext Admin (and Django admin with DJNextModelAdmin)."""
    list_display = ['id', 'action_badge', 'app_label', 'model_name', 'object_id', 'object_repr_short', 'changes', 'user', 'created_at']
    list_filter = ['action', 'app_label', 'model_name', 'created_at']
    search_fields = ['app_label', 'model_name', 'object_id', 'object_repr', 'user__email', 'user__username']
    readonly_fields = ['user', 'action', 'app_label', 'model_name', 'table_name', 'object_id', 'object_repr', 'changes', 'changes_summary', 'created_at']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def action_badge(self, obj):
        colors = {'create': '#22c55e', 'update': '#3b82f6', 'delete': '#ef4444'}
        color = colors.get(obj.action, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color, obj.get_action_display()
        )
    action_badge.short_description = 'Action'

    def object_repr_short(self, obj):
        if not obj.object_repr:
            return '—'
        return obj.object_repr[:50] + ('…' if len(obj.object_repr) > 50 else '')
    object_repr_short.short_description = 'Object'

    def changes_summary(self, obj):
        """Human-readable summary of changes for list/detail (Django admin only)."""
        if not obj.changes or not isinstance(obj.changes, dict):
            return '—'
        parts = []
        for field, diff in obj.changes.items():
            if isinstance(diff, dict) and 'old' in diff and 'new' in diff:
                o, n = diff['old'], diff['new']
                o_str = str(o) if o is not None else 'null'
                n_str = str(n) if n is not None else 'null'
                if len(o_str) > 30:
                    o_str = o_str[:27] + '…'
                if len(n_str) > 30:
                    n_str = n_str[:27] + '…'
                parts.append(f'{field}: {o_str} → {n_str}')
            else:
                parts.append(field)
        return '; '.join(parts[:5]) + ('…' if len(parts) > 5 else '') if parts else '—'
    changes_summary.short_description = 'Changes'

"""
Audit logging – record create/update/delete for every model in DJNext Admin.

Call log_audit from viewset perform_create, perform_update, perform_destroy
so that AuditLog is written without touching host app models.
"""

from .models import AuditLog


def log_audit(action, request, instance=None, object_id=None, object_repr=None, changes=None):
    """
    Write an audit log entry. Safe to call even if AuditLog table does not exist yet.

    Args:
        action: 'create' | 'update' | 'delete'
        request: HttpRequest (for user)
        instance: model instance (optional; used to get app_label, model_name, object_id, object_repr)
        object_id: str (optional; required if instance not given)
        object_repr: str (optional)
        changes: dict for updates, e.g. {"field_name": {"old": x, "new": y}}
    """
    if action not in ('create', 'update', 'delete'):
        return
    try:
        user = getattr(request, 'user', None)
        if instance is not None:
            opts = instance._meta
            app_label = opts.app_label
            model_name = opts.model_name
            table_name = getattr(opts, 'db_table', '') or ''
            object_id = str(instance.pk) if object_id is None else str(object_id)
            object_repr = object_repr if object_repr is not None else str(instance)[:255]
        else:
            if object_id is None:
                return
            app_label = ''
            model_name = ''
            table_name = ''
            object_id = str(object_id)
            object_repr = object_repr or ''

        AuditLog.objects.create(
            user=user if (user and getattr(user, 'is_authenticated', True)) else None,
            action=action,
            app_label=app_label,
            model_name=model_name,
            table_name=table_name,
            object_id=object_id,
            object_repr=object_repr,
            changes=changes or {},
        )
    except Exception:
        pass  # do not break CRUD if logging fails (e.g. table not migrated yet)

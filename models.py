"""
Models for DJNext Admin – audit/history logging.

These live in djnext_admin so they auto-integrate in every project
that uses DJNext Admin. Register in admin so they appear in the
Django admin and in the DJNext frontend.
"""

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """
    Records every create, update, and delete performed via DJNext Admin (or Django admin
    when using DJNextModelAdmin). Use for history of every object and event logs.

    - model_name / app_label / table_name: which model was affected
    - object_id: primary key of the record (stored as string to support any PK type)
    - action: 'create' | 'update' | 'delete'
    - changes: for updates, a JSON map of field name -> {old, new} (optional)
    - user: who performed the action (null if user deleted)
    """

    class Action(models.TextChoices):
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DELETE = 'delete', 'Delete'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='djnext_audit_logs',
    )
    action = models.CharField(max_length=20, choices=Action.choices, db_index=True)
    app_label = models.CharField(max_length=100, db_index=True)
    model_name = models.CharField(max_length=100, db_index=True)
    table_name = models.CharField(max_length=255, blank=True)
    object_id = models.CharField(max_length=255, db_index=True)
    object_repr = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'djnext_admin_auditlog'
        ordering = ['-created_at']
        verbose_name = 'Audit log'
        verbose_name_plural = 'Audit logs'
        indexes = [
            models.Index(fields=['app_label', 'model_name']),
            models.Index(fields=['app_label', 'model_name', 'object_id']),
        ]

    def __str__(self):
        return f'{self.get_action_display()} {self.app_label}.{self.model_name} #{self.object_id}'

# Generated migration for DJNext Admin AuditLog

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('create', 'Create'), ('update', 'Update'), ('delete', 'Delete')], db_index=True, max_length=20)),
                ('app_label', models.CharField(db_index=True, max_length=100)),
                ('model_name', models.CharField(db_index=True, max_length=100)),
                ('table_name', models.CharField(blank=True, max_length=255)),
                ('object_id', models.CharField(db_index=True, max_length=255)),
                ('object_repr', models.CharField(blank=True, max_length=255)),
                ('changes', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='djnext_audit_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Audit log',
                'verbose_name_plural': 'Audit logs',
                'db_table': 'djnext_admin_auditlog',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['app_label', 'model_name'], name='djnext_adm_app_lab_6a0b0d_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['app_label', 'model_name', 'object_id'], name='djnext_adm_app_lab_3c8e9f_idx'),
        ),
    ]

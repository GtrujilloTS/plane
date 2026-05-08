# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0121_alter_estimate_type"),
    ]

    operations = [
        # --- IssueTypeCustomField ---
        migrations.CreateModel(
            name="IssueTypeCustomField",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Created At"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Last Modified At"),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="Deleted At"),
                ),
                (
                    "id",
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                (
                    "field_type",
                    models.CharField(
                        choices=[
                            ("text", "Text"),
                            ("number", "Number"),
                            ("dropdown", "Dropdown"),
                            ("date", "Date"),
                            ("boolean", "Boolean"),
                        ],
                        default="text",
                        max_length=50,
                    ),
                ),
                ("is_required", models.BooleanField(default=False)),
                ("options", models.JSONField(default=list)),
                ("default_value", models.JSONField(blank=True, null=True)),
                ("display_order", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name": "Issue Type Custom Field",
                "verbose_name_plural": "Issue Type Custom Fields",
                "db_table": "issue_type_custom_fields",
                "ordering": ("display_order", "created_at"),
            },
        ),
        migrations.AddField(
            model_name="issuetypecustomfield",
            name="created_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="%(class)s_created_by",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Created By",
            ),
        ),
        migrations.AddField(
            model_name="issuetypecustomfield",
            name="updated_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="%(class)s_updated_by",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Last Modified By",
            ),
        ),
        migrations.AddField(
            model_name="issuetypecustomfield",
            name="issue_type",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="custom_fields",
                to="db.issuetype",
            ),
        ),
        migrations.AddField(
            model_name="issuetypecustomfield",
            name="project",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="project_%(class)s",
                to="db.project",
            ),
        ),
        migrations.AddField(
            model_name="issuetypecustomfield",
            name="workspace",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="workspace_%(class)s",
                to="db.workspace",
            ),
        ),
        # --- IssueCustomFieldValue ---
        migrations.CreateModel(
            name="IssueCustomFieldValue",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Created At"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Last Modified At"),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="Deleted At"),
                ),
                (
                    "id",
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                ("value_text", models.TextField(blank=True, null=True)),
                (
                    "value_number",
                    models.DecimalField(
                        blank=True, decimal_places=5, max_digits=20, null=True
                    ),
                ),
                ("value_date", models.DateField(blank=True, null=True)),
                ("value_bool", models.BooleanField(blank=True, null=True)),
                ("value_option", models.CharField(blank=True, max_length=255, null=True)),
            ],
            options={
                "verbose_name": "Issue Custom Field Value",
                "verbose_name_plural": "Issue Custom Field Values",
                "db_table": "issue_custom_field_values",
            },
        ),
        migrations.AddField(
            model_name="issuecustomfieldvalue",
            name="created_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="%(class)s_created_by",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Created By",
            ),
        ),
        migrations.AddField(
            model_name="issuecustomfieldvalue",
            name="updated_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="%(class)s_updated_by",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Last Modified By",
            ),
        ),
        migrations.AddField(
            model_name="issuecustomfieldvalue",
            name="issue",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="custom_field_values",
                to="db.issue",
            ),
        ),
        migrations.AddField(
            model_name="issuecustomfieldvalue",
            name="custom_field",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="values",
                to="db.issuetypecustomfield",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="issuecustomfieldvalue",
            unique_together={("issue", "custom_field")},
        ),
        migrations.AddConstraint(
            model_name="issuecustomfieldvalue",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("issue", "custom_field"),
                name="issue_custom_field_value_unique_when_not_deleted",
            ),
        ),
    ]

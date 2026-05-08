# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db import models
from django.db.models import Q

# Module imports
from .project import ProjectBaseModel
from .base import BaseModel


FIELD_TYPE_CHOICES = [
    ("text", "Text"),
    ("number", "Number"),
    ("dropdown", "Dropdown"),
    ("date", "Date"),
    ("boolean", "Boolean"),
]


class IssueTypeCustomField(ProjectBaseModel):
    issue_type = models.ForeignKey(
        "db.IssueType",
        related_name="custom_fields",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=255)
    field_type = models.CharField(max_length=50, choices=FIELD_TYPE_CHOICES, default="text")
    is_required = models.BooleanField(default=False)
    options = models.JSONField(default=list)
    default_value = models.JSONField(null=True, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Issue Type Custom Field"
        verbose_name_plural = "Issue Type Custom Fields"
        db_table = "issue_type_custom_fields"
        ordering = ("display_order", "created_at")

    def __str__(self):
        return f"{self.issue_type.name} - {self.name}"


class IssueCustomFieldValue(BaseModel):
    issue = models.ForeignKey(
        "db.Issue",
        related_name="custom_field_values",
        on_delete=models.CASCADE,
    )
    custom_field = models.ForeignKey(
        "db.IssueTypeCustomField",
        related_name="values",
        on_delete=models.CASCADE,
    )
    value_text = models.TextField(null=True, blank=True)
    value_number = models.DecimalField(max_digits=20, decimal_places=5, null=True, blank=True)
    value_date = models.DateField(null=True, blank=True)
    value_bool = models.BooleanField(null=True, blank=True)
    value_option = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        verbose_name = "Issue Custom Field Value"
        verbose_name_plural = "Issue Custom Field Values"
        db_table = "issue_custom_field_values"
        unique_together = [("issue", "custom_field")]
        constraints = [
            models.UniqueConstraint(
                fields=["issue", "custom_field"],
                condition=Q(deleted_at__isnull=True),
                name="issue_custom_field_value_unique_when_not_deleted",
            )
        ]

    def __str__(self):
        return f"{self.issue_id} - {self.custom_field.name}"

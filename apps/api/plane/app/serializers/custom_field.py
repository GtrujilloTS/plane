# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import serializers

# Module imports
from .base import BaseSerializer
from plane.db.models import IssueTypeCustomField, IssueCustomFieldValue


class IssueTypeCustomFieldSerializer(BaseSerializer):
    class Meta:
        model = IssueTypeCustomField
        fields = [
            "id",
            "name",
            "field_type",
            "is_required",
            "options",
            "default_value",
            "display_order",
            "issue_type_id",
            "project_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "project_id"]

    def validate(self, attrs):
        field_type = attrs.get("field_type") or (
            self.instance.field_type if self.instance else None
        )
        options = attrs.get("options", [])
        if field_type == "dropdown" and not options:
            raise serializers.ValidationError(
                {"options": "Options are required for dropdown fields."}
            )
        return attrs


class IssueCustomFieldValueSerializer(BaseSerializer):
    value = serializers.SerializerMethodField()

    class Meta:
        model = IssueCustomFieldValue
        fields = [
            "id",
            "issue_id",
            "custom_field",
            "custom_field_id",
            "value_text",
            "value_number",
            "value_date",
            "value_bool",
            "value_option",
            "value",
        ]
        read_only_fields = ["id", "value"]

    def get_value(self, obj):
        field_type = obj.custom_field.field_type
        if field_type == "text":
            return obj.value_text
        if field_type == "number":
            return float(obj.value_number) if obj.value_number is not None else None
        if field_type == "date":
            return obj.value_date.isoformat() if obj.value_date else None
        if field_type == "boolean":
            return obj.value_bool
        if field_type == "dropdown":
            return obj.value_option
        return None

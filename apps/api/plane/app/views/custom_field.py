# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db import transaction

# Third party imports
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

# Module imports
from . import BaseViewSet, BaseAPIView
from plane.app.serializers import IssueTypeCustomFieldSerializer, IssueCustomFieldValueSerializer
from plane.app.permissions import ROLE, allow_permission
from plane.db.models import IssueTypeCustomField, IssueCustomFieldValue, IssueType


class IssueTypeCustomFieldViewSet(BaseViewSet):
    serializer_class = IssueTypeCustomFieldSerializer
    model = IssueTypeCustomField

    def get_queryset(self):
        return self.filter_queryset(
            super()
            .get_queryset()
            .filter(
                workspace__slug=self.kwargs.get("slug"),
                project_id=self.kwargs.get("project_id"),
                issue_type_id=self.kwargs.get("type_id"),
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
                project__archived_at__isnull=True,
            )
            .select_related("issue_type", "project", "workspace")
            .distinct()
        )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def list(self, request, slug, project_id, type_id):
        serializer = IssueTypeCustomFieldSerializer(self.get_queryset(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN])
    def create(self, request, slug, project_id, type_id):
        try:
            issue_type = IssueType.objects.get(pk=type_id, workspace__slug=slug)
        except IssueType.DoesNotExist:
            return Response({"error": "Work item type not found"}, status=status.HTTP_404_NOT_FOUND)

        # Auto-assign display_order = last + 1
        last_order = (
            IssueTypeCustomField.objects.filter(
                project_id=project_id, issue_type_id=type_id
            )
            .order_by("-display_order")
            .values_list("display_order", flat=True)
            .first()
        )
        next_order = (last_order or 0) + 1

        serializer = IssueTypeCustomFieldSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(
            project_id=project_id,
            issue_type=issue_type,
            display_order=next_order,
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def retrieve(self, request, slug, project_id, type_id, pk):
        field = self.get_queryset().filter(pk=pk).first()
        if not field:
            return Response({"error": "Custom field not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(IssueTypeCustomFieldSerializer(field).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN])
    def partial_update(self, request, slug, project_id, type_id, pk):
        field = self.get_queryset().filter(pk=pk).first()
        if not field:
            return Response({"error": "Custom field not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = IssueTypeCustomFieldSerializer(field, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission([ROLE.ADMIN])
    def destroy(self, request, slug, project_id, type_id, pk):
        field = self.get_queryset().filter(pk=pk).first()
        if not field:
            return Response({"error": "Custom field not found"}, status=status.HTTP_404_NOT_FOUND)
        field.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @allow_permission([ROLE.ADMIN])
    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request, slug, project_id, type_id):
        """
        Expects: {"ordered_ids": ["uuid1", "uuid2", ...]}
        Updates display_order of each field to its list index.
        """
        ordered_ids = request.data.get("ordered_ids", [])
        if not ordered_ids:
            return Response({"error": "ordered_ids required"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for index, field_id in enumerate(ordered_ids):
                IssueTypeCustomField.objects.filter(
                    pk=field_id,
                    project_id=project_id,
                    issue_type_id=type_id,
                ).update(display_order=index)

        return Response(status=status.HTTP_204_NO_CONTENT)


class IssueCustomFieldValueViewSet(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def get(self, request, slug, project_id, issue_id):
        values = (
            IssueCustomFieldValue.objects.filter(
                issue_id=issue_id,
                issue__project_id=project_id,
                issue__project__project_projectmember__member=request.user,
                issue__project__project_projectmember__is_active=True,
            )
            .select_related("custom_field")
            .distinct()
        )
        serializer = IssueCustomFieldValueSerializer(values, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def post(self, request, slug, project_id, issue_id):
        """
        Bulk upsert: accepts a list of {custom_field, value_text?, value_number?, ...}
        """
        values_data = request.data
        if not isinstance(values_data, list):
            return Response({"error": "Expected a list of values"}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        with transaction.atomic():
            for item in values_data:
                field_id = item.get("custom_field")
                if not field_id:
                    continue
                obj, _ = IssueCustomFieldValue.objects.update_or_create(
                    issue_id=issue_id,
                    custom_field_id=field_id,
                    defaults={
                        "value_text": item.get("value_text"),
                        "value_number": item.get("value_number"),
                        "value_date": item.get("value_date") or None,
                        "value_bool": item.get("value_bool"),
                        "value_option": item.get("value_option"),
                    },
                )
                results.append(obj)

        serializer = IssueCustomFieldValueSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

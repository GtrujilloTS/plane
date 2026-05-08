# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db import transaction

# Third party imports
from rest_framework.response import Response
from rest_framework import status

# Module imports
from . import BaseViewSet
from plane.app.serializers import WorkItemTypeSerializer
from plane.app.permissions import ROLE, allow_permission
from plane.db.models import IssueType, ProjectIssueType, Workspace


class WorkItemTypeViewSet(BaseViewSet):
    serializer_class = WorkItemTypeSerializer
    model = IssueType

    def get_queryset(self):
        return self.filter_queryset(
            super()
            .get_queryset()
            .filter(
                workspace__slug=self.kwargs.get("slug"),
                project_issue_types__project_id=self.kwargs.get("project_id"),
                project_issue_types__project__project_projectmember__member=self.request.user,
                project_issue_types__project__project_projectmember__is_active=True,
                project_issue_types__project__archived_at__isnull=True,
                project_issue_types__deleted_at__isnull=True,
            )
            .select_related("workspace")
            .distinct()
        )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def list(self, request, slug, project_id):
        serializer = WorkItemTypeSerializer(self.get_queryset(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN])
    def create(self, request, slug, project_id):
        try:
            workspace = Workspace.objects.get(slug=slug)
        except Workspace.DoesNotExist:
            return Response({"error": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            serializer = WorkItemTypeSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            issue_type = serializer.save(workspace=workspace)
            ProjectIssueType.objects.create(
                project_id=project_id,
                issue_type=issue_type,
                is_default=request.data.get("is_default", False),
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def retrieve(self, request, slug, project_id, pk):
        issue_type = self.get_queryset().filter(pk=pk).first()
        if not issue_type:
            return Response({"error": "Work item type not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = WorkItemTypeSerializer(issue_type)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN])
    def partial_update(self, request, slug, project_id, pk):
        issue_type = self.get_queryset().filter(pk=pk).first()
        if not issue_type:
            return Response({"error": "Work item type not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = WorkItemTypeSerializer(issue_type, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission([ROLE.ADMIN])
    def destroy(self, request, slug, project_id, pk):
        issue_type = self.get_queryset().filter(pk=pk).first()
        if not issue_type:
            return Response({"error": "Work item type not found"}, status=status.HTTP_404_NOT_FOUND)

        if issue_type.is_default:
            return Response(
                {"error": "Default work item type cannot be deleted"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ProjectIssueType.objects.filter(
            project_id=project_id,
            issue_type_id=pk,
        ).delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

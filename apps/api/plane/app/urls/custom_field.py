# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from plane.app.views import IssueTypeCustomFieldViewSet, IssueCustomFieldValueViewSet

urlpatterns = [
    # Custom field definitions per work item type
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/work-item-types/<uuid:type_id>/custom-fields/",
        IssueTypeCustomFieldViewSet.as_view({"get": "list", "post": "create"}),
        name="work-item-type-custom-fields",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/work-item-types/<uuid:type_id>/custom-fields/<uuid:pk>/",
        IssueTypeCustomFieldViewSet.as_view(
            {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
        ),
        name="work-item-type-custom-field",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/work-item-types/<uuid:type_id>/custom-fields/reorder/",
        IssueTypeCustomFieldViewSet.as_view({"post": "reorder"}),
        name="work-item-type-custom-fields-reorder",
    ),
    # Custom field values per issue
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/custom-field-values/",
        IssueCustomFieldValueViewSet.as_view(),
        name="issue-custom-field-values",
    ),
]

from django.urls import path

from .views import (
    IssueShareTokenListCreateView,
    IssueShareTokenDetailView,
    IssueShareTokenRevokeView,
    IssueShareTokenLogsView,
    PublicSharedIssueView,
    PublicSharedIssueCommentView,
    PublicSharedIssueApprovalView,
    PublicSharedIssueAssetView,
)

urlpatterns = [
    # -----------------------------------------------------------------------
    # Endpoints internos (requieren auth de Plane)
    # -----------------------------------------------------------------------
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/share-tokens/",
        IssueShareTokenListCreateView.as_view(),
        name="issue-share-tokens-list",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/share-tokens/<uuid:token_id>/",
        IssueShareTokenDetailView.as_view(),
        name="issue-share-token-detail",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/share-tokens/<uuid:token_id>/revoke/",
        IssueShareTokenRevokeView.as_view(),
        name="issue-share-token-revoke",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/share-tokens/<uuid:token_id>/logs/",
        IssueShareTokenLogsView.as_view(),
        name="issue-share-token-logs",
    ),

    # -----------------------------------------------------------------------
    # Endpoints públicos (validados por token, sin auth de Plane)
    # -----------------------------------------------------------------------
    path(
        "shared/issue/<uuid:token>/",
        PublicSharedIssueView.as_view(),
        name="public-shared-issue",
    ),
    path(
        "shared/issue/<uuid:token>/comments/",
        PublicSharedIssueCommentView.as_view(),
        name="public-shared-issue-comments",
    ),
    path(
        "shared/issue/<uuid:token>/approve/",
        PublicSharedIssueApprovalView.as_view(),
        name="public-shared-issue-approve",
    ),
    path(
        "shared/issue/<uuid:token>/assets/<uuid:asset_id>/",
        PublicSharedIssueAssetView.as_view(),
        name="public-shared-issue-asset",
    ),
]

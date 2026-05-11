from django.http import HttpResponseRedirect
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from plane.authentication.session import BaseSessionAuthentication
from plane.db.models import Issue, Workspace, IssueComment, FileAsset, User
from plane.app.permissions import ROLE, allow_permission
from plane.settings.storage import S3Storage

from .models import IssueShareToken, SharedIssueExternalComment, SharedIssueAccessLog
from .permissions import SharedTokenPermission
from .serializers import (
    IssueShareTokenSerializer,
    IssueShareTokenCreateSerializer,
    PublicIssueSerializer,
    ExternalCommentSerializer,
    AccessLogSerializer,
)


def _get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _log_access(share_token, request, action, metadata=None):
    SharedIssueAccessLog.objects.create(
        share_token=share_token,
        ip_address=_get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
        actor_name=(request.data or {}).get("actor_name", ""),
        actor_email=(request.data or {}).get("actor_email", ""),
        action=action,
        metadata=metadata or {},
    )


def _get_workspace_id(slug):
    try:
        return Workspace.objects.get(slug=slug).id
    except Workspace.DoesNotExist:
        return None


def _sync_to_issue_comment(share: "IssueShareToken", external_comment_id: str, comment_html: str):
    """Create a native Plane IssueComment so the team sees external activity in the issue timeline."""
    try:
        IssueComment.objects.create(
            issue_id=share.issue_id,
            project_id=share.project_id,
            comment_html=comment_html,
            access="EXTERNAL",
            external_source="shared_issue",
            external_id=external_comment_id,
            actor=None,
        )
    except Exception:
        pass  # Never block the external response if the mirror fails


# ---------------------------------------------------------------------------
# Vistas internas (requieren autenticación de usuario Plane)
# ---------------------------------------------------------------------------

class IssueShareTokenListCreateView(APIView):
    authentication_classes = [BaseSessionAuthentication]
    permission_classes = [IsAuthenticated]

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def get(self, request, slug, project_id, issue_id):
        workspace_id = _get_workspace_id(slug)
        if not workspace_id:
            return Response({"error": "Workspace no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        tokens = IssueShareToken.objects.filter(
            issue_id=issue_id,
            project_id=project_id,
            workspace_id=workspace_id,
        ).order_by("-created_at")

        serializer = IssueShareTokenSerializer(tokens, many=True, context={"request": request})
        return Response(serializer.data)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def post(self, request, slug, project_id, issue_id):
        workspace_id = _get_workspace_id(slug)
        if not workspace_id:
            return Response({"error": "Workspace no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        serializer = IssueShareTokenCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.save(
            issue_id=issue_id,
            project_id=project_id,
            workspace_id=workspace_id,
            created_by=request.user,
        )

        return Response(
            IssueShareTokenSerializer(token, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class IssueShareTokenDetailView(APIView):
    authentication_classes = [BaseSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_token(self, slug, project_id, issue_id, token_id):
        workspace_id = _get_workspace_id(slug)
        if not workspace_id:
            return None
        try:
            return IssueShareToken.objects.get(
                id=token_id,
                issue_id=issue_id,
                project_id=project_id,
                workspace_id=workspace_id,
            )
        except IssueShareToken.DoesNotExist:
            return None

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def get(self, request, slug, project_id, issue_id, token_id):
        token = self._get_token(slug, project_id, issue_id, token_id)
        if not token:
            return Response({"error": "Token no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(IssueShareTokenSerializer(token, context={"request": request}).data)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def patch(self, request, slug, project_id, issue_id, token_id):
        token = self._get_token(slug, project_id, issue_id, token_id)
        if not token:
            return Response({"error": "Token no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        serializer = IssueShareTokenCreateSerializer(token, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(IssueShareTokenSerializer(token, context={"request": request}).data)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def delete(self, request, slug, project_id, issue_id, token_id):
        token = self._get_token(slug, project_id, issue_id, token_id)
        if not token:
            return Response({"error": "Token no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IssueShareTokenRevokeView(APIView):
    authentication_classes = [BaseSessionAuthentication]
    permission_classes = [IsAuthenticated]

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def post(self, request, slug, project_id, issue_id, token_id):
        workspace_id = _get_workspace_id(slug)
        try:
            token = IssueShareToken.objects.get(
                id=token_id,
                issue_id=issue_id,
                project_id=project_id,
                workspace_id=workspace_id,
            )
        except IssueShareToken.DoesNotExist:
            return Response({"error": "Token no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        token.is_active = False
        token.save(update_fields=["is_active", "updated_at"])
        return Response({"message": "Token revocado correctamente."})


class IssueShareTokenLogsView(APIView):
    authentication_classes = [BaseSessionAuthentication]
    permission_classes = [IsAuthenticated]

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def get(self, request, slug, project_id, issue_id, token_id):
        workspace_id = _get_workspace_id(slug)
        try:
            token = IssueShareToken.objects.get(
                id=token_id,
                issue_id=issue_id,
                project_id=project_id,
                workspace_id=workspace_id,
            )
        except IssueShareToken.DoesNotExist:
            return Response({"error": "Token no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        logs = token.access_logs.all()[:100]
        return Response(AccessLogSerializer(logs, many=True).data)


# ---------------------------------------------------------------------------
# Vistas públicas (sin autenticación — validadas por SharedTokenPermission)
# ---------------------------------------------------------------------------

class PublicSharedIssueView(APIView):
    authentication_classes = []
    permission_classes = [SharedTokenPermission]

    def get(self, request, token):
        share: IssueShareToken = request.share_token

        try:
            issue = (
                Issue.objects.select_related("state", "project")
                .prefetch_related("assignees", "labels")
                .get(id=share.issue_id, project_id=share.project_id)
            )
        except Issue.DoesNotExist:
            return Response({"error": "Issue no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        _log_access(share, request, SharedIssueAccessLog.ACTION_VIEW)

        serializer = PublicIssueSerializer(issue, context={"share_token": share})
        return Response(serializer.data)


class PublicSharedIssueCommentView(APIView):
    authentication_classes = []
    permission_classes = [SharedTokenPermission]

    def get(self, request, token):
        share: IssueShareToken = request.share_token
        if not share.allow_comments:
            return Response({"error": "Comentarios no habilitados."}, status=status.HTTP_403_FORBIDDEN)

        external = list(
            share.external_comments
            .filter(is_approval_response=False)
            .values("id", "actor_name", "comment_html", "is_approval_response", "approval_status", "created_at")
        )
        for c in external:
            c["source"] = "external"
            c["id"] = str(c["id"])
            c["created_at"] = c["created_at"].isoformat()

        result = external

        if share.show_internal_comments:
            # Only EXTERNAL-access comments: those the team explicitly made public (globe icon).
            # INTERNAL-access = private (lock icon) — never shown to external users.
            # Also exclude our own mirrored comments (external_source="shared_issue").
            internal_qs = (
                IssueComment.objects
                .filter(issue_id=share.issue_id, access="EXTERNAL", external_source__isnull=True)
                .select_related("actor")
                .order_by("created_at")
            )
            internal = []
            for c in internal_qs:
                actor_name = "Equipo"
                if c.actor:
                    actor_name = c.actor.display_name or c.actor.email or "Equipo"
                internal.append({
                    "id": str(c.id),
                    "actor_name": actor_name,
                    "comment_html": c.comment_html,
                    "is_approval_response": False,
                    "approval_status": None,
                    "created_at": c.created_at.isoformat(),
                    "source": "internal",
                })
            result = sorted(external + internal, key=lambda x: x["created_at"])

        return Response(result)

    def post(self, request, token):
        share: IssueShareToken = request.share_token
        if not share.allow_comments:
            return Response({"error": "Comentarios no habilitados."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ExternalCommentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        comment = serializer.save(share_token=share)
        _log_access(share, request, SharedIssueAccessLog.ACTION_COMMENT, {"comment_id": str(comment.id)})

        # Mirror to native Plane IssueComment so team can see it in the issue timeline
        actor_label = comment.actor_name or "Externo"
        _sync_to_issue_comment(
            share=share,
            external_comment_id=str(comment.id),
            comment_html=(
                f"<p><strong>[Externo] {actor_label}:</strong></p>"
                f"{comment.comment_html}"
            ),
        )

        return Response(ExternalCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class PublicSharedIssueApprovalView(APIView):
    authentication_classes = []
    permission_classes = [SharedTokenPermission]

    def post(self, request, token):
        share: IssueShareToken = request.share_token
        if not share.allow_approval:
            return Response({"error": "Aprobaciones no habilitadas."}, status=status.HTTP_403_FORBIDDEN)

        approval_status = request.data.get("approval_status")
        if approval_status not in ("approved", "rejected"):
            return Response({"error": "approval_status debe ser 'approved' o 'rejected'."}, status=status.HTTP_400_BAD_REQUEST)

        actor_name = request.data.get("actor_name", "").strip()
        if not actor_name:
            return Response({"error": "Se requiere el nombre del actor."}, status=status.HTTP_400_BAD_REQUEST)

        comment = SharedIssueExternalComment.objects.create(
            share_token=share,
            actor_name=actor_name,
            actor_email=request.data.get("actor_email", ""),
            comment_html=request.data.get("comment_html", ""),
            is_approval_response=True,
            approval_status=approval_status,
        )

        action = SharedIssueAccessLog.ACTION_APPROVE if approval_status == "approved" else SharedIssueAccessLog.ACTION_REJECT
        _log_access(share, request, action, {"comment_id": str(comment.id)})

        # Mirror to native Plane IssueComment so team sees it in the issue timeline
        decision_emoji = "✅" if approval_status == "approved" else "❌"
        decision_label = "aprobó" if approval_status == "approved" else "rechazó"
        extra_html = f"<p>{comment.comment_html}</p>" if comment.comment_html else ""
        _sync_to_issue_comment(
            share=share,
            external_comment_id=str(comment.id),
            comment_html=(
                f"<p>{decision_emoji} <strong>{actor_name}</strong> {decision_label} este issue a través de un enlace compartido.</p>"
                f"{extra_html}"
            ),
        )

        return Response(ExternalCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class PublicSharedIssueAssetView(APIView):
    """Proxy public access to assets (images/attachments) that belong to a shared issue."""

    authentication_classes = []
    permission_classes = [SharedTokenPermission]

    def get(self, request, token, asset_id):
        share: IssueShareToken = request.share_token

        try:
            asset = FileAsset.objects.get(
                id=asset_id,
                project_id=share.project_id,
                is_uploaded=True,
                is_deleted=False,
            )
            # For attachments, enforce that they belong to this specific issue
            if (
                asset.entity_type == FileAsset.EntityTypeContext.ISSUE_ATTACHMENT
                and str(asset.issue_id) != str(share.issue_id)
            ):
                raise FileAsset.DoesNotExist
        except FileAsset.DoesNotExist:
            return Response({"error": "Asset no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        storage = S3Storage(request=request)
        signed_url = storage.generate_presigned_url(
            object_name=asset.asset.name,
            disposition="inline",
            filename=asset.attributes.get("name"),
        )
        return HttpResponseRedirect(signed_url)

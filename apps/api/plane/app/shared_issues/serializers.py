import re

from rest_framework import serializers

from plane.db.models import FileAsset

from .models import IssueShareToken, SharedIssueExternalComment, SharedIssueAccessLog


def _fix_description_html(html: str, token: str) -> str:
    """
    1. Convert Plane's custom <image-component> nodes to standard <img> tags.
    2. Rewrite internal Plane asset URLs to the public shared-issue proxy.
    """
    if not html:
        return html

    # Convert <image-component src="URL" ...></image-component> → <img>
    def _replace_image_component(m: re.Match) -> str:
        attrs = m.group(1)
        src_match = re.search(r'\bsrc=["\']([^"\']+)["\']', attrs)
        width_match = re.search(r'\bwidth=["\']([^"\']+)["\']', attrs)
        height_match = re.search(r'\bheight=["\']([^"\']+)["\']', attrs)
        if not src_match:
            return ""
        src = src_match.group(1)
        # Rewrite internal asset URLs to the public proxy
        src = re.sub(
            r"/api/assets/v2/workspaces/[^/]+/projects/[^/]+/([0-9a-f-]+)/",
            lambda mm: f"/api/shared/issue/{token}/assets/{mm.group(1)}/",
            src,
        )
        style_parts = ["max-width:100%", "height:auto"]
        if width_match:
            style_parts.append(f"width:{width_match.group(1)}")
        extra = f' style="{";".join(style_parts)}"'
        return f'<img src="{src}"{extra} />'

    html = re.sub(
        r"<image-component([^>]*)>.*?</image-component>",
        _replace_image_component,
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    # Self-closing form: <image-component ... />
    html = re.sub(
        r"<image-component([^>]*)/?>",
        _replace_image_component,
        html,
        flags=re.IGNORECASE,
    )

    # Rewrite any remaining internal asset URLs (e.g. in regular <img> tags)
    html = re.sub(
        r"/api/assets/v2/workspaces/[^/]+/projects/[^/]+/([0-9a-f-]+)/",
        lambda m: f"/api/shared/issue/{token}/assets/{m.group(1)}/",
        html,
    )
    return html


# ---------------------------------------------------------------------------
# Serializers para usuarios internos (gestión de tokens)
# ---------------------------------------------------------------------------

class IssueShareTokenSerializer(serializers.ModelSerializer):
    created_by_display = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = IssueShareToken
        fields = [
            "id", "token", "label",
            "expires_at", "is_active", "allowed_emails",
            "allow_comments", "allow_attachments", "allow_approval",
            "show_assignees", "show_internal_comments", "show_activity", "show_custom_fields",
            "custom_message",
            "created_at", "updated_at",
            "created_by_display", "is_expired", "share_url",
        ]
        read_only_fields = ["id", "token", "created_at", "updated_at", "created_by_display"]

    def get_created_by_display(self, obj):
        if obj.created_by:
            return obj.created_by.display_name or obj.created_by.email
        return None

    def get_is_expired(self, obj):
        from django.utils import timezone
        if obj.expires_at and obj.expires_at < timezone.now():
            return True
        return False

    def get_share_url(self, obj):
        request = self.context.get("request")
        if request:
            return f"{request.scheme}://{request.get_host()}/shared/issue/{obj.token}"
        return f"/shared/issue/{obj.token}"


class IssueShareTokenCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueShareToken
        fields = [
            "label", "expires_at", "allowed_emails",
            "allow_comments", "allow_attachments", "allow_approval",
            "show_assignees", "show_internal_comments", "show_activity", "show_custom_fields",
            "custom_message",
        ]


# ---------------------------------------------------------------------------
# Serializers para la vista pública (datos limitados)
# ---------------------------------------------------------------------------

class PublicIssueSerializer(serializers.Serializer):
    """
    Serializa solo los datos seguros para exponer externamente.
    Los campos visibles dependen de los permisos del share_token.
    """

    def to_representation(self, instance):
        token: IssueShareToken = self.context["share_token"]
        token_str = str(token.token)

        data = {
            "id": str(instance.id),
            "sequence_id": instance.sequence_id,
            "name": instance.name,
            "description_html": _fix_description_html(instance.description_html or "", token_str),
            "priority": instance.priority,
            "state": {
                "name": instance.state.name if instance.state else "",
                "color": instance.state.color if instance.state else "#cccccc",
                "group": instance.state.group if instance.state else "",
            },
            "created_at": instance.created_at.isoformat() if instance.created_at else None,
            "updated_at": instance.updated_at.isoformat() if instance.updated_at else None,
            "project": {
                "name": instance.project.name if instance.project else "",
                "identifier": instance.project.identifier if instance.project else "",
            },
            # Permisos que tiene el visitante externo
            "permissions": {
                "allow_comments": token.allow_comments,
                "allow_attachments": token.allow_attachments,
                "allow_approval": token.allow_approval,
                "show_internal_comments": token.show_internal_comments,
            },
            "custom_message": token.custom_message,
        }

        if token.show_assignees:
            data["assignees"] = [
                {"display_name": a.display_name}
                for a in instance.assignees.all()
            ]
        else:
            data["assignees"] = []

        if token.show_custom_fields:
            data["label_details"] = [
                {"name": lbl.name, "color": lbl.color}
                for lbl in instance.labels.all()
            ]

        if token.allow_attachments:
            attachments = FileAsset.objects.filter(
                issue_id=instance.id,
                entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
                is_uploaded=True,
                is_deleted=False,
            )
            data["attachments"] = [
                {
                    "id": str(a.id),
                    "name": a.attributes.get("name", ""),
                    "size": a.size,
                    "url": f"/api/shared/issue/{token_str}/assets/{a.id}/",
                }
                for a in attachments
            ]
        else:
            data["attachments"] = []

        return data


class ExternalCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedIssueExternalComment
        fields = [
            "id", "actor_name", "actor_email",
            "comment_html", "is_approval_response", "approval_status",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_comment_html(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El comentario no puede estar vacío.")
        return value


class AccessLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedIssueAccessLog
        fields = ["id", "actor_name", "actor_email", "action", "ip_address", "created_at"]
        read_only_fields = fields

import uuid

from django.conf import settings
from django.db import models


class IssueShareToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Token público — el único identificador que se expone externamente
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)

    # Referencias al issue (sin FK para desacoplarnos del modelo core de Plane)
    issue_id = models.UUIDField(db_index=True)
    project_id = models.UUIDField(db_index=True)
    workspace_id = models.UUIDField(db_index=True)

    # Quién generó el enlace
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_share_tokens",
    )

    # Etiqueta para identificar el enlace (ej: "Para cliente Acme")
    label = models.CharField(max_length=255, blank=True, default="")

    # Control de acceso
    expires_at = models.DateTimeField(null=True, blank=True)  # null = no expira
    is_active = models.BooleanField(default=True, db_index=True)

    # Restricción por email (lista vacía = cualquiera con el link)
    allowed_emails = models.JSONField(default=list, blank=True)

    # Permisos configurables
    allow_comments = models.BooleanField(default=False)
    allow_attachments = models.BooleanField(default=False)
    allow_approval = models.BooleanField(default=False)

    # Visibilidad de datos internos
    show_assignees = models.BooleanField(default=True)
    show_internal_comments = models.BooleanField(default=False)
    show_activity = models.BooleanField(default=False)
    show_custom_fields = models.BooleanField(default=True)

    # Mensaje personalizado para el receptor externo
    custom_message = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "shared_issue_tokens"
        indexes = [
            models.Index(fields=["token", "is_active"]),
            models.Index(fields=["issue_id", "is_active"]),
        ]

    def __str__(self):
        return f"ShareToken({self.token}) issue={self.issue_id}"


class SharedIssueExternalComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    share_token = models.ForeignKey(
        IssueShareToken,
        on_delete=models.CASCADE,
        related_name="external_comments",
    )

    actor_name = models.CharField(max_length=255)
    actor_email = models.EmailField(blank=True, default="")
    comment_html = models.TextField()

    # Flujo de aprobación (solo aplica cuando allow_approval=True)
    is_approval_response = models.BooleanField(default=False)
    approval_status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "shared_issue_external_comments"
        ordering = ["created_at"]


class SharedIssueAccessLog(models.Model):
    ACTION_VIEW = "view"
    ACTION_COMMENT = "comment"
    ACTION_UPLOAD = "upload"
    ACTION_APPROVE = "approve"
    ACTION_REJECT = "reject"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    share_token = models.ForeignKey(
        IssueShareToken,
        on_delete=models.CASCADE,
        related_name="access_logs",
    )

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    actor_name = models.CharField(max_length=255, blank=True, default="")
    actor_email = models.EmailField(blank=True, default="")
    action = models.CharField(max_length=50)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "shared_issue_access_logs"
        indexes = [models.Index(fields=["share_token", "created_at"])]
        ordering = ["-created_at"]

from django.utils import timezone
from rest_framework.permissions import BasePermission

from .models import IssueShareToken


class SharedTokenPermission(BasePermission):
    """
    Valida el token de compartir en cada request público.
    Adjunta el objeto share_token al request para uso en las vistas.
    """

    message = "Token inválido, expirado o revocado."

    def has_permission(self, request, view):
        token = view.kwargs.get("token")
        if not token:
            return False

        try:
            share = IssueShareToken.objects.get(token=token, is_active=True)
        except (IssueShareToken.DoesNotExist, Exception):
            return False

        # Verificar expiración
        if share.expires_at and share.expires_at < timezone.now():
            return False

        # Verificar restricción de email (solo para acciones POST)
        if share.allowed_emails and request.method in ("POST", "PATCH", "PUT"):
            email = (request.data or {}).get("actor_email", "")
            if email not in share.allowed_emails:
                return False

        # Disponible en la vista como request.share_token
        request.share_token = share
        return True

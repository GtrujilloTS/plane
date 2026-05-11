from django.apps import AppConfig


class SharedIssuesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "plane.app.shared_issues"
    label = "shared_issues"
    verbose_name = "Shared Issues"

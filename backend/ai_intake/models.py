from django.db import models
from django.contrib.auth.models import User


class AIIntakeLog(models.Model):
    """
    Audit log for every AI parsing call.
    Stores raw input, AI output, and links to the created blood request.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ai_intake_logs"
    )
    raw_input = models.TextField()
    ai_output = models.JSONField()
    confidence_score = models.FloatField(null=True, blank=True)
    blood_request = models.ForeignKey(
        "requests_app.BloodRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_logs"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_intake_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["confidence_score"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"AIIntakeLog #{self.id} — {self.created_at:%Y-%m-%d %H:%M}"

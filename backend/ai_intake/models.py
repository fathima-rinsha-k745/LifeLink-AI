from django.db import models
from django.contrib.auth.models import User


class AIIntakeLog(models.Model):
    """
    Stores AI input, AI output,
    confidence score, and audit logs.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ai_intake_logs"
    )
    raw_input = models.TextField()
    voice_transcription = models.TextField(blank=True, null=True)
    ai_output = models.JSONField()
    confidence_score = models.FloatField(null=True, blank=True)
    matched_donors = models.JSONField(default=list, blank=True)
    selected_donor = models.ForeignKey(
        'donors.Donor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_selected_logs"
    )
    function_called = models.CharField(max_length=255, blank=True, null=True)
    tool_used = models.CharField(max_length=255, blank=True, null=True)
    ai_response = models.TextField(blank=True, null=True)
    notification_history = models.JSONField(default=list, blank=True)
    accept_reject_result = models.CharField(max_length=50, blank=True, null=True)
    errors = models.TextField(blank=True, null=True)

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

# ai_intake/serializers.py

from rest_framework import serializers
from requests_app.models import BloodRequest

VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
VALID_URGENCY     = ["critical", "urgent", "moderate", "low"]


class AIIntakeSerializer(serializers.ModelSerializer):
    blood_group = serializers.ChoiceField(
        choices=VALID_BLOOD_GROUPS, allow_null=True
    )
    urgency = serializers.ChoiceField(choices=VALID_URGENCY)
    units_needed = serializers.IntegerField(min_value=1, max_value=20)
    confidence_score = serializers.FloatField(
        min_value=0.0, max_value=1.0, write_only=True
    )

    class Meta:
        model = BloodRequest
        fields = [
            "patient_name", "blood_group", "units_needed",
            "hospital", "city", "urgency",
            "time_window_hours", "contact_phone",
            "additional_notes", "confidence_score"
        ]
from rest_framework import serializers
from requests_app.models import BloodRequest

VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

class AIIntakeSerializer(serializers.ModelSerializer):
    """
    Validates and serializes AI-generated
    blood request data before saving.
    """

    class Meta:
        model = BloodRequest
        fields = [
            "patient_name",
            "blood_group",
            "hospital",
            "city",
            "urgency",
        ]
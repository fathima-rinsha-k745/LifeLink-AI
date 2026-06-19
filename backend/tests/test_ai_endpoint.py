from unittest.mock import patch
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

@pytest.mark.django_db
@patch("ai_intake.views.parse_emergency_text")
def test_ai_intake(mock_ai):

    mock_ai.return_value = {
    "patient_name": "Rajan",
    "blood_group": "O+",
    "hospital": "Medical College",
    "city": "Kozhikode",
    "urgency": "High",
    "confidence_score": 0.95
}

    user = User.objects.create_user(
        username="testuser",
        password="password123"
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/requests/ai-intake/",
        {
            "description": "Patient Rajan needs O+ blood urgently at Medical College Kozhikode"
        },
        format="json"
    )
    print(response.status_code)
    print(response.data)
    assert response.status_code in [200, 201]
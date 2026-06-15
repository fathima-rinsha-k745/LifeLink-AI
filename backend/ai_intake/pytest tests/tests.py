import json
import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth.models import User
from rest_framework.test import APIClient


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(db):
    user = User.objects.create_user(username="testuser", password="testpass123")
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


MOCK_AI_RESPONSE = {
    "patient_name": "Rajan",
    "blood_group": "O-",
    "units_needed": 2,
    "hospital": "Thrissur Medical College",
    "city": "Thrissur",
    "urgency": "critical",
    "time_window_hours": 3,
    "contact_phone": "9847123456",
    "additional_notes": "Surgery in 3 hours",
    "confidence_score": 0.97,
}


# ── Unit tests: parse_emergency_text ─────────────────────────────────────────

class TestParseEmergencyText:

    @patch("ai_intake.services.anthropic.Anthropic")
    def test_returns_parsed_dict_on_success(self, mock_anthropic):
        from ai_intake.services import parse_emergency_text

        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = [
            MagicMock(text=json.dumps(MOCK_AI_RESPONSE))
        ]

        result = parse_emergency_text("Patient needs O- blood urgently")

        assert result is not None
        assert result["blood_group"] == "O-"
        assert result["urgency"] == "critical"
        assert result["confidence_score"] == 0.97

    @patch("ai_intake.services.anthropic.Anthropic")
    def test_returns_none_on_invalid_json(self, mock_anthropic):
        from ai_intake.services import parse_emergency_text

        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = [
            MagicMock(text="this is not json at all")
        ]

        result = parse_emergency_text("some text")
        assert result is None

    @patch("ai_intake.services.anthropic.Anthropic")
    def test_strips_markdown_fences(self, mock_anthropic):
        from ai_intake.services import parse_emergency_text

        fenced = f"```json\n{json.dumps(MOCK_AI_RESPONSE)}\n```"
        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = [
            MagicMock(text=fenced)
        ]

        result = parse_emergency_text("some text")
        assert result is not None
        assert result["blood_group"] == "O-"

    @patch("ai_intake.services.anthropic.Anthropic")
    def test_returns_none_on_api_error(self, mock_anthropic):
        import anthropic as anthropic_lib
        from ai_intake.services import parse_emergency_text

        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.side_effect = anthropic_lib.APIError(
            message="API unavailable", request=MagicMock(), body=None
        )

        result = parse_emergency_text("some text")
        assert result is None


# ── Unit tests: find_matched_donors ──────────────────────────────────────────

class TestFindMatchedDonors:

    @pytest.mark.django_db
    def test_exact_blood_group_match_comes_first(self):
        from donors.models import Donor
        from requests_app.models import BloodRequest
        from ai_intake.services import find_matched_donors

        Donor.objects.create(name="A", blood_group="O-", city="Thrissur", phone="111", available=True)
        Donor.objects.create(name="B", blood_group="O+", city="Thrissur", phone="222", available=True)

        req = BloodRequest.objects.create(
            patient_name="Test",
            blood_group="O+",
            city="Thrissur",
            hospital="Test Hospital",
            urgency="urgent"
        )

        donors = find_matched_donors(req)
        assert donors[0]["blood_group"] == "O+"

    @pytest.mark.django_db
    def test_unavailable_donors_excluded(self):
        from donors.models import Donor
        from requests_app.models import BloodRequest
        from ai_intake.services import find_matched_donors

        Donor.objects.create(name="Unavailable", blood_group="O+", city="Thrissur", phone="333", available=False)

        req = BloodRequest.objects.create(
            patient_name="Test",
            blood_group="O+",
            city="Thrissur",
            hospital="Test Hospital",
            urgency="urgent"
        )

        donors = find_matched_donors(req)
        assert len(donors) == 0

    @pytest.mark.django_db
    def test_returns_empty_for_null_blood_group(self):
        from requests_app.models import BloodRequest
        from ai_intake.services import find_matched_donors

        req = BloodRequest.objects.create(
            patient_name="Unknown",
            blood_group=None,
            city="Thrissur",
            hospital="Test Hospital",
            urgency="urgent"
        )

        donors = find_matched_donors(req)
        assert donors == []


# ── Integration tests: API endpoint ──────────────────────────────────────────

class TestEmergencyAIIntakeEndpoint:

    @patch("ai_intake.views.parse_emergency_text")
    @patch("ai_intake.views.find_matched_donors")
    def test_successful_intake(self, mock_donors, mock_parse, auth_client, db):
        client, user = auth_client
        mock_parse.return_value = dict(MOCK_AI_RESPONSE)
        mock_donors.return_value = []

        response = client.post(
            "/api/requests/ai-intake/",
            {"description": "Patient Rajan needs O negative blood urgently at Thrissur Medical College. Surgery in 3 hours."},
            format="json"
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["blood_request"]["blood_group"] == "O-"
        assert data["ai_confidence"] == 0.97

    def test_requires_authentication(self, api_client):
        response = api_client.post(
            "/api/requests/ai-intake/",
            {"description": "Some emergency description here"},
            format="json"
        )
        assert response.status_code == 401

    def test_rejects_empty_description(self, auth_client, db):
        client, _ = auth_client
        response = client.post(
            "/api/requests/ai-intake/",
            {"description": ""},
            format="json"
        )
        assert response.status_code == 400

    def test_rejects_short_description(self, auth_client, db):
        client, _ = auth_client
        response = client.post(
            "/api/requests/ai-intake/",
            {"description": "too short"},
            format="json"
        )
        assert response.status_code == 400

    @patch("ai_intake.views.parse_emergency_text", return_value=None)
    def test_returns_503_when_ai_fails(self, mock_parse, auth_client, db):
        client, _ = auth_client
        response = client.post(
            "/api/requests/ai-intake/",
            {"description": "Patient needs blood urgently at the hospital right now."},
            format="json"
        )
        assert response.status_code == 503
        assert response.json()["fallback"] is True
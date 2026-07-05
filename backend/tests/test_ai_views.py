import json
import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from donors.models import Donor
from requests_app.models import BloodRequest, EmergencyNotification
from ai_intake.models import AIIntakeLog
from django.conf import settings

# ── Fixtures & Setup ──────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture(autouse=True)
def disable_ratelimit(settings):
    settings.RATELIMIT_ENABLE = False

@pytest.fixture
def auth_setup(db):
    coord_user = User.objects.create_user(username="coord", password="password123")
    donor_user = User.objects.create_user(username="donor", password="password123")
    donor_profile = Donor.objects.create(
        user=donor_user,
        name="Donor Thrissur",
        blood_group="O-",
        city="Thrissur",
        phone="9998887771",
        available=True,
        reliability_score=95.0
    )
    donor_kochi = Donor.objects.create(
        name="Donor Kochi",
        blood_group="O-",
        city="Kochi",
        phone="9998887772",
        available=True,
        reliability_score=90.0
    )
    return {
        "coord": coord_user,
        "donor": donor_user,
        "donor_profile": donor_profile,
        "donor_kochi": donor_kochi,
    }


# ── EmergencyAIIntakeView Tests ────────────────────────────────────────────────

@pytest.mark.django_db
class TestEmergencyAIIntakeView:

    def test_empty_description(self, api_client):
        response = api_client.post("/api/requests/ai-intake/", {"description": ""}, format="json")
        assert response.status_code == 400
        assert "description field is required" in response.json()["error"]

    def test_description_too_short(self, api_client):
        response = api_client.post("/api/requests/ai-intake/", {"description": "Short desc"}, format="json")
        assert response.status_code == 400
        assert "too short" in response.json()["error"].lower()

    def test_description_too_long(self, api_client):
        response = api_client.post("/api/requests/ai-intake/", {"description": "A" * 1001}, format="json")
        assert response.status_code == 400
        assert "too long" in response.json()["error"].lower()

    @patch("ai_intake.views.parse_emergency_text")
    def test_ai_parsing_failure(self, mock_parse, api_client):
        mock_parse.return_value = None
        response = api_client.post("/api/requests/ai-intake/", {"description": "Valid emergency description here..."}, format="json")
        assert response.status_code == 503
        assert response.json()["fallback"] is True

    @patch("ai_intake.views.parse_emergency_text")
    def test_ai_extracted_invalid_data(self, mock_parse, api_client):
        # Missing required fields like patient_name, hospital
        mock_parse.return_value = {
            "patient_name": "",
            "blood_group": "O-",
        }
        response = api_client.post("/api/requests/ai-intake/", {"description": "Valid emergency description here..."}, format="json")
        assert response.status_code == 422
        assert "invalid data" in response.json()["error"].lower()

    @patch("ai_intake.views.parse_emergency_text")
    @patch("requests_app.views.get_coordinates")
    @patch("requests_app.views.trigger_next_notification")
    def test_successful_intake_voice_flow(self, mock_trigger, mock_coords, mock_parse, api_client, auth_setup):
        mock_coords.return_value = (10.0, 76.0)
        mock_parse.return_value = {
            "patient_name": "Rajan",
            "blood_group": "o negative",
            "hospital": "Thrissur Medical",
            "city": "Thrissur",
            "urgency": "critical",
            "contact_phone": "12345",
            "confidence_score": 0.95
        }

        # Successful intake via voice transcription
        response = api_client.post(
            "/api/requests/ai-intake/",
            {"description": "Valid emergency description here...", "is_voice": True},
            format="json"
        )
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["blood_request"]["patient_name"] == "Rajan"
        assert data["blood_request"]["blood_group"] == "O-"
        assert data["blood_request"]["urgency"] == "Critical"
        
        # Verify voice clip timeline update
        timeline = data["blood_request"]["timeline"]
        assert any(t["status"] == "Voice Converted" for t in timeline)
        
        # Verify AI Intake Log creation
        log = AIIntakeLog.objects.first()
        assert log is not None
        assert log.raw_input == "Valid emergency description here..."
        assert log.ai_output["patient_name"] == "Rajan"

    @patch("ai_intake.views.parse_emergency_text")
    @patch("requests_app.views.get_coordinates")
    @patch("requests_app.views.trigger_next_notification")
    def test_intake_fallback_donor_cross_city(self, mock_trigger, mock_coords, mock_parse, api_client, auth_setup):
        mock_coords.return_value = (9.9, 76.3)
        mock_parse.return_value = {
            "patient_name": "Rajan",
            "blood_group": "O-",
            "hospital": "Aster Medcity",
            "city": "Kochi",
            "urgency": "high",
        }
        
        # O- request in Kochi
        # Kochi has no available O- donors in Thrissur, but Donor Kochi (Kochi) is available. Wait, Donor Kochi is Kochi O-
        # Let's set trigger_next_notification side effect to create a cross-city notification to Donor Thrissur (Thrissur O-)
        # to test cross-city fallback_used flag
        def side_effect(blood_request):
            # Create a cross-city pending notification for Donor Thrissur
            EmergencyNotification.objects.create(
                blood_request=blood_request,
                donor=auth_setup["donor_profile"], # Donor Thrissur
                status="pending"
            )
        mock_trigger.side_effect = side_effect

        response = api_client.post(
            "/api/requests/ai-intake/",
            {"description": "Valid emergency description here..."},
            format="json"
        )
        assert response.status_code == 201
        data = response.json()
        assert data["fallback_used"] is True  # Kochi request, Thrissur donor matched -> fallback_used is True

    @patch("ai_intake.views.parse_emergency_text")
    @patch("requests_app.views.get_coordinates")
    @patch("requests_app.views.trigger_next_notification")
    def test_intake_no_matching_donor(self, mock_trigger, mock_coords, mock_parse, api_client, auth_setup):
        mock_coords.return_value = (10.5, 76.2)
        mock_parse.return_value = {
            "patient_name": "Rajan",
            "blood_group": "O-",
            "hospital": "Hospital",
            "city": "Thrissur",
            "urgency": "unknown_urgency", # Default to Medium
        }
        
        # trigger_next_notification does not create any notification (depleted queue scenario)
        response = api_client.post(
            "/api/requests/ai-intake/",
            {"description": "Valid emergency description here..."},
            format="json"
        )
        assert response.status_code == 201
        data = response.json()
        assert data["matched_donors"] == []
        assert data["fallback_used"] is False


# ── AIIntakeLogListView Tests ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestAIIntakeLogListView:

    def test_log_list_anonymous_denied(self, api_client):
        response = api_client.get("/api/ai-logs/")
        assert response.status_code == 401

    def test_log_list_donor_denied(self, api_client, auth_setup):
        api_client.force_authenticate(user=auth_setup["donor"])
        response = api_client.get("/api/ai-logs/")
        assert response.status_code == 403

    def test_log_list_coordinator_success(self, api_client, auth_setup):
        api_client.force_authenticate(user=auth_setup["coord"])
        settings.COORDINATOR_USERNAME = "coord"
        
        # Create a sample log
        AIIntakeLog.objects.create(raw_input="Log 1", ai_output={}, confidence_score=0.9)

        response = api_client.get("/api/ai-logs/")
        assert response.status_code == 200
        assert len(response.json()["results"]) == 1


# ── AIChatView Tests ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAIChatView:

    def test_chat_empty_message(self, api_client):
        response = api_client.post("/api/ai-chat/", {"message": ""}, format="json")
        assert response.status_code == 400
        assert "message or query field is required" in response.json()["error"]

    @patch("ai_intake.services.run_ai_chat")
    def test_chat_general_question_success(self, mock_run_chat, api_client):
        mock_run_chat.return_value = ("General AI chat reply", False, "", None)

        response = api_client.post("/api/ai-chat/", {"message": "How to donate blood?"}, format="json")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["response"] == "General AI chat reply"
        assert data["tool_called"] is False

        # Verify log entry created with empty output
        log = AIIntakeLog.objects.first()
        assert log is not None
        assert log.raw_input == "How to donate blood?"
        assert log.ai_response == "General AI chat reply"
        assert log.user is None

    @patch("ai_intake.services.run_ai_chat")
    def test_chat_general_question_auth_user(self, mock_run_chat, api_client, auth_setup):
        mock_run_chat.return_value = ("Authenticated reply", False, "", None)
        api_client.force_authenticate(user=auth_setup["coord"])

        response = api_client.post("/api/ai-chat/", {"query": "How to donate blood?"}, format="json")
        assert response.status_code == 200
        
        # Verify user is logged in the AI Intake Log
        log = AIIntakeLog.objects.first()
        assert log is not None
        assert log.user == auth_setup["coord"]

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    @patch("ai_intake.views.EmergencyAIIntakeView.post")
    def test_requester_role_intent_blood_request(self, mock_intake_post, mock_gen_config, mock_model_class, api_client):
        # Requester role classifying message as BLOOD_REQUEST
        mock_model = MagicMock()
        mock_model.generate_content.return_value.text = "BLOOD_REQUEST"
        mock_model_class.return_value = mock_model

        # Mock the EmergencyAIIntakeView response to look like a successful intake response
        mock_intake_response = Response(
            {"success": True, "blood_request": {"id": 123}},
            status=status.HTTP_201_CREATED
        )
        mock_intake_post.return_value = mock_intake_response

        response = api_client.post(
            "/api/ai-chat/",
            {"message": "Need O+ blood urgently", "role": "requester"},
            format="json"
        )
        assert response.status_code == 201
        assert response.json()["is_blood_request"] is True

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    @patch("ai_intake.views.EmergencyAIIntakeView.post")
    def test_requester_role_intent_blood_request_other_status(self, mock_intake_post, mock_gen_config, mock_model_class, api_client):
        mock_model = MagicMock()
        mock_model.generate_content.return_value.text = "BLOOD_REQUEST"
        mock_model_class.return_value = mock_model

        # Intake view returns failure, e.g. 503
        mock_intake_response = Response(
            {"error": "AI failure"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
        mock_intake_post.return_value = mock_intake_response

        response = api_client.post(
            "/api/ai-chat/",
            {"message": "Need O+ blood", "role": "requester"},
            format="json"
        )
        assert response.status_code == 503

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    @patch("ai_intake.services.run_ai_chat")
    def test_requester_role_intent_blood_request_validation_fallback(self, mock_run_chat, mock_gen_config, mock_model_class, api_client):
        # Intent classified as BLOOD_REQUEST, but intake fails with 422 (lacked details)
        # Should fallback to general chat and call run_ai_chat returning 200 general reply
        mock_model = MagicMock()
        mock_model.generate_content.return_value.text = "BLOOD_REQUEST"
        mock_model_class.return_value = mock_model

        with patch("ai_intake.views.EmergencyAIIntakeView.post") as mock_intake_post:
            mock_intake_post.return_value = Response({"error": "validation"}, status=422)
            mock_run_chat.return_value = ("General fallback response", False, "", None)

            response = api_client.post(
                "/api/ai-chat/",
                {"message": "O+", "role": "requester"},
                format="json"
            )
            assert response.status_code == 200
            assert response.json()["response"] == "General fallback response"

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    @patch("time.sleep")
    def test_requester_role_rate_limit_retry(self, mock_sleep, mock_gen_config, mock_model_class, api_client):
        # Intent model throws 422/429 rate limit exceptions, then succeeds on 3rd attempt
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = [
            Exception("ResourceExhausted: 429 Rate limit exceeded"),
            Exception("ResourceExhausted: 429 Rate limit exceeded"),
            MagicMock(text="GENERAL_QUESTION")
        ]
        mock_model_class.return_value = mock_model

        with patch("ai_intake.services.run_ai_chat") as mock_run_chat:
            mock_run_chat.return_value = ("General answer", False, "", None)

            response = api_client.post(
                "/api/ai-chat/",
                {"message": "Blood query", "role": "requester"},
                format="json"
            )
            assert response.status_code == 200
            assert mock_model.generate_content.call_count == 3
            assert mock_sleep.call_count == 2

    @patch("ai_intake.services.run_ai_chat")
    def test_chat_tool_call_create_blood_request(self, mock_run_chat, api_client, auth_setup):
        # Gemini run calls tool 'create_blood_request_tool'
        req = BloodRequest.objects.create(
            patient_name="P1",
            blood_group="O-",
            hospital="Hospital",
            city="Kochi",
            urgency="High",
        )
        # Setup pending notification so match scoring returns a matched donor
        EmergencyNotification.objects.create(
            blood_request=req,
            donor=auth_setup["donor_profile"],
            status="pending"
        )

        mock_run_chat.return_value = (
            "Successfully created request.",
            True,
            "create_blood_request_tool",
            req.id
        )

        response = api_client.post("/api/ai-chat/", {"message": "Register a request for P1 O-"}, format="json")
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["is_blood_request"] is True
        assert data["blood_request"]["patient_name"] == "P1"
        assert len(data["matched_donors"]) == 1
        assert data["fallback_used"] is True

    @patch("ai_intake.services.run_ai_chat")
    def test_chat_tool_call_create_blood_request_exception_fallback(self, mock_run_chat, api_client):
        # Tool called but DB / retrieve raises Exception
        mock_run_chat.return_value = (
            "Successfully created request.",
            True,
            "create_blood_request_tool",
            99999  # Invalid request ID -> causes DoesNotExist exception
        )

        response = api_client.post("/api/ai-chat/", {"message": "Register request"}, format="json")
        # Should catch exception and gracefully return standard 200 response
        assert response.status_code == 200
        assert response.json()["response"] == "Successfully created request."

    @patch("ai_intake.services.run_ai_chat")
    def test_chat_general_exception_500(self, mock_run_chat, api_client):
        # run_ai_chat raises unexpected error
        mock_run_chat.side_effect = Exception("Internal AI Engine exploded")

        response = api_client.post("/api/ai-chat/", {"message": "Hello"}, format="json")
        assert response.status_code == 500
        assert "Internal AI Engine exploded" in response.json()["error"]

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    @patch("time.sleep")
    def test_requester_role_rate_limit_depleted_retry(self, mock_sleep, mock_gen_config, mock_model_class, api_client):
        # Intent model throws 429 rate limit exceptions on all 3 attempts
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("ResourceExhausted: 429 Rate limit exceeded")
        mock_model_class.return_value = mock_model

        response = api_client.post(
            "/api/ai-chat/",
            {"message": "Blood query", "role": "requester"},
            format="json"
        )
        assert response.status_code == 500
        assert "429 Rate limit exceeded" in response.json()["error"]

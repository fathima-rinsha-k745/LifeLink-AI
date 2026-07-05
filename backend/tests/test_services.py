import json
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from django.contrib.auth.models import User
from donors.models import Donor
from requests_app.models import BloodRequest, EmergencyNotification
from ai_intake.models import AIIntakeLog
from ai_intake.services import (
    parse_emergency_text,
    find_matched_donors,
    find_available_donors,
    run_ai_chat,
)
import anthropic as anthropic_lib


# ── Mocks Setup ───────────────────────────────────────────────────────────────

MOCK_AI_RESPONSE = {
    "patient_name": "Rajan",
    "blood_group": "O-",
    "hospital": "Thrissur Medical College",
    "city": "Thrissur",
    "urgency": "Critical",
}


# ── parse_emergency_text Tests ────────────────────────────────────────────────

class TestParseEmergencyText:

    @patch("ai_intake.services.anthropic.Anthropic")
    def test_parse_emergency_text_success(self, mock_anthropic):
        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = [
            MagicMock(text=json.dumps(MOCK_AI_RESPONSE))
        ]

        result = parse_emergency_text("Emergency patient needs O- blood")
        assert result == MOCK_AI_RESPONSE

    @patch("ai_intake.services.anthropic.Anthropic")
    def test_parse_emergency_text_json_decode_error(self, mock_anthropic):
        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = [
            MagicMock(text="Invalid JSON content")
        ]

        result = parse_emergency_text("Emergency patient needs blood")
        assert result is None

    @patch("ai_intake.services.anthropic.Anthropic")
    def test_parse_emergency_text_api_error(self, mock_anthropic):
        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.side_effect = anthropic_lib.APIError(
            message="Rate limit exceeded", request=MagicMock(), body=None
        )

        result = parse_emergency_text("Emergency patient needs blood")
        assert result is None

    @patch("ai_intake.services.anthropic.Anthropic")
    def test_parse_emergency_text_unexpected_exception(self, mock_anthropic):
        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.side_effect = Exception("Unexpected network drop")

        result = parse_emergency_text("Emergency patient needs blood")
        assert result is None

    @patch("ai_intake.services.anthropic.Anthropic")
    def test_parse_emergency_text_json_markdown_fences(self, mock_anthropic):
        fenced_json = f"```json\n{json.dumps(MOCK_AI_RESPONSE)}\n```"
        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = [
            MagicMock(text=fenced_json)
        ]

        result = parse_emergency_text("Emergency patient needs blood")
        assert result == MOCK_AI_RESPONSE


# ── find_matched_donors Tests ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestFindMatchedDonors:

    def test_find_matched_donors_success(self):
        Donor.objects.create(name="Donor O- Available", blood_group="O-", city="Thrissur", phone="12345", available=True)
        Donor.objects.create(name="Donor O+ Available", blood_group="O+", city="Thrissur", phone="67890", available=True)
        Donor.objects.create(name="Donor O- Unavailable", blood_group="O-", city="Thrissur", phone="11111", available=False)
        Donor.objects.create(name="Donor O- Different City", blood_group="O-", city="Kochi", phone="22222", available=True)

        req = BloodRequest.objects.create(
            patient_name="Patient O+",
            blood_group="O+",
            city="Thrissur",
            hospital="District Hospital",
            urgency="High",
        )

        matched = find_matched_donors(req)
        # O+ can receive from O- and O+
        # Should return both "Donor O+ Available" (exact match first) and "Donor O- Available"
        assert len(matched) == 2
        assert matched[0]["name"] == "Donor O+ Available"
        assert matched[1]["name"] == "Donor O- Available"

    def test_find_matched_donors_missing_blood_group(self):
        req = BloodRequest.objects.create(
            patient_name="Patient Unknown",
            blood_group=None,
            city="Thrissur",
            hospital="District Hospital",
            urgency="High",
        )
        assert find_matched_donors(req) == []

    def test_find_matched_donors_no_matches(self):
        req = BloodRequest.objects.create(
            patient_name="Patient O-",
            blood_group="O-",
            city="Thrissur",
            hospital="District Hospital",
            urgency="High",
        )
        # O- can only receive from O-
        # No O- donor in Thrissur is available yet
        assert find_matched_donors(req) == []


# ── find_available_donors Tests ───────────────────────────────────────────────

@pytest.mark.django_db
class TestFindAvailableDonors:

    def test_find_available_donors_filters(self):
        Donor.objects.create(name="D1", blood_group="A+", city="Thrissur", phone="1", available=True)
        Donor.objects.create(name="D2", blood_group="A-", city="Thrissur", phone="2", available=True)
        Donor.objects.create(name="D3", blood_group="A+", city="Kochi", phone="3", available=True)
        Donor.objects.create(name="D4", blood_group="A+", city="Thrissur", phone="4", available=False)

        # Filter by group and city
        res = json.loads(find_available_donors(blood_group="A+", city="Thrissur"))
        assert len(res) == 1
        assert res[0]["name"] == "D1"

        # Filter by group only
        res_group = json.loads(find_available_donors(blood_group="A+"))
        assert len(res_group) == 2
        assert {d["name"] for d in res_group} == {"D1", "D3"}

        # Filter by city only
        res_city = json.loads(find_available_donors(city="Thrissur"))
        assert len(res_city) == 2
        assert {d["name"] for d in res_city} == {"D1", "D2"}

        # No filters
        res_all = json.loads(find_available_donors())
        assert len(res_all) == 3


# ── run_ai_chat & Inner Tools Tests ───────────────────────────────────────────

@pytest.mark.django_db
class TestRunAIChat:

    def capture_tools(self, message: str, role: str = "coordinator", user = None, response_text = "Default Response"):
        captured = {}
        mock_model = MagicMock()
        mock_chat = MagicMock()
        mock_response = MagicMock()
        mock_response.text = response_text
        
        mock_chat.send_message.return_value = mock_response
        mock_model.start_chat.return_value = mock_chat
        
        def model_init(model_name, tools=None, system_instruction=None):
            if tools:
                for tool in tools:
                    captured[tool.__name__] = tool
            return mock_model

        with patch("google.generativeai.GenerativeModel", side_effect=model_init) as mock_gen, \
             patch("google.generativeai.configure") as mock_conf:
            resp, tool_called, tool_name, request_id = run_ai_chat(message, role, user)
            
        return resp, tool_called, tool_name, request_id, captured

    def run_with_tool_invocation(self, message: str, tool_to_call: str, tool_args: dict, role: str = "coordinator"):
        mock_model = MagicMock()
        mock_chat = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Tool completed."
        
        mock_model.start_chat.return_value = mock_chat
        
        captured_tools = []
        def model_init(model_name, tools=None, system_instruction=None):
            nonlocal captured_tools
            if tools:
                captured_tools = tools
            return mock_model

        def send_message_side_effect(*args, **kwargs):
            for t in captured_tools:
                if t.__name__ == tool_to_call:
                    t(**tool_args)
            return mock_response

        mock_chat.send_message.side_effect = send_message_side_effect

        with patch("google.generativeai.GenerativeModel", side_effect=model_init) as mock_gen, \
             patch("google.generativeai.configure") as mock_conf:
            resp, tool_called, tool_name, request_id = run_ai_chat(message, role)
            
        return resp, tool_called, tool_name, request_id

    # ── Role/System Instruction Customization ──

    def test_roles_and_system_instructions(self):
        # Requester role
        with patch("google.generativeai.GenerativeModel") as mock_gen, \
             patch("google.generativeai.configure") as mock_conf:
            run_ai_chat("Hello", role="requester")
            args, kwargs = mock_gen.call_args
            assert "LifeLink AI Requester Assistant" in kwargs["system_instruction"]

        # Coordinator role
        with patch("google.generativeai.GenerativeModel") as mock_gen, \
             patch("google.generativeai.configure") as mock_conf:
            run_ai_chat("Hello", role="coordinator")
            args, kwargs = mock_gen.call_args
            assert "LifeLink AI Coordinator Assistant" in kwargs["system_instruction"]

        # Donor role with profile
        user = MagicMock()
        dp = MagicMock()
        dp.name = "John"
        dp.blood_group = "O-"
        dp.city = "Thrissur"
        dp.phone = "999"
        dp.last_donation_date = "2025-01-01"
        dp.reliability_score = 95
        user.donor_profile = dp
        
        with patch("google.generativeai.GenerativeModel") as mock_gen, \
             patch("google.generativeai.configure") as mock_conf:
            run_ai_chat("Hello", role="donor", user=user)
            args, kwargs = mock_gen.call_args
            assert "LifeLink AI Donor Assistant" in kwargs["system_instruction"]
            assert "John" in kwargs["system_instruction"]
            assert "95%" in kwargs["system_instruction"]

        # Donor role without profile
        user_no_profile = MagicMock()
        del user_no_profile.donor_profile
        
        with patch("google.generativeai.GenerativeModel") as mock_gen, \
             patch("google.generativeai.configure") as mock_conf:
            run_ai_chat("Hello", role="donor", user=user_no_profile)
            args, kwargs = mock_gen.call_args
            assert "No profile loaded" in kwargs["system_instruction"]

        # Default/Fallback role
        with patch("google.generativeai.GenerativeModel") as mock_gen, \
             patch("google.generativeai.configure") as mock_conf:
            run_ai_chat("Hello", role="unknown_role")
            args, kwargs = mock_gen.call_args
            assert "LifeLink AI Assistant" in kwargs["system_instruction"]

    # ── Exception/Failure Modes ──

    def test_run_ai_chat_exception_fallback(self):
        with patch("google.generativeai.GenerativeModel") as mock_gen:
            mock_gen.side_effect = Exception("Gemini API connection failure")
            resp, tool_called, tool_name, request_id = run_ai_chat("Hello")
            
            assert "experiencing technical difficulties" in resp
            assert tool_called is False
            assert tool_name == ""
            assert request_id is None

    # ── Nonlocal Tool Invocation States ──

    def test_tool_call_state_updates(self):
        # Verify that calling tool updates nonlocal state variables
        resp, tool_called, tool_name, request_id = self.run_with_tool_invocation(
            "Find O+ donors", "find_donors_tool", {"blood_group": "O+"}
        )
        assert tool_called is True
        assert tool_name == "find_donors_tool"

    # ── Nested Tool Functionality: find_donors_tool ──

    def test_find_donors_tool(self):
        Donor.objects.create(name="Donor A", blood_group="O+", city="Thrissur", phone="123", available=True)
        Donor.objects.create(name="Donor B", blood_group="O-", city="Thrissur", phone="456", available=False)
        
        resp, tool_called, tool_name, request_id, tools = self.capture_tools("Hello")
        find_donors = tools["find_donors_tool"]

        # Test filter available=True
        res_available = json.loads(find_donors(available=True))
        assert len(res_available) == 1
        assert res_available[0]["name"] == "Donor A"

        # Test filter available=False
        res_unavailable = json.loads(find_donors(available=False))
        assert len(res_unavailable) == 1
        assert res_unavailable[0]["name"] == "Donor B"

        # Test blood group filter (normalizes casing & spaces)
        res_bg = json.loads(find_donors(blood_group=" o+ "))
        assert len(res_bg) == 1
        assert res_bg[0]["name"] == "Donor A"

        # Test city filter
        res_city = json.loads(find_donors(city=" thrissur "))
        assert len(res_city) == 2

    # ── Nested Tool Functionality: get_blood_requests_tool ──

    def test_get_blood_requests_tool(self):
        BloodRequest.objects.create(patient_name="P1", blood_group="O+", hospital="H1", city="C1", status="Waiting", urgency="High")
        BloodRequest.objects.create(patient_name="P2", blood_group="A+", hospital="H2", city="C2", status="Accepted", urgency="Medium")

        resp, tool_called, tool_name, request_id, tools = self.capture_tools("Hello")
        get_requests = tools["get_blood_requests_tool"]

        # No filter
        res_all = json.loads(get_requests())
        assert res_all["count"] == 2
        assert len(res_all["results"]) == 2

        # Filter by status
        res_status = json.loads(get_requests(status="waiting"))
        assert res_status["count"] == 1
        assert res_status["results"][0]["patient"] == "P1"

        # Filter by urgency
        res_urgency = json.loads(get_requests(urgency="medium"))
        assert res_urgency["count"] == 1
        assert res_urgency["results"][0]["patient"] == "P2"

    # ── Nested Tool Functionality: query_database_details_tool ──

    def test_query_database_details_tool_unsupported_model(self):
        resp, tool_called, tool_name, request_id, tools = self.capture_tools("Hello")
        query_db = tools["query_database_details_tool"]

        res = json.loads(query_db(model_name="InvalidModel"))
        assert "error" in res
        assert "not queryable" in res["error"]

    def test_query_database_details_tool_supported_models(self):
        # Setup DB entries
        user = User.objects.create_user(username="test_coord", password="safe_password_123", email="coord@lifelink.org")
        donor = Donor.objects.create(name="Donor A", blood_group="O+", city="Thrissur", phone="123", available=True)
        req = BloodRequest.objects.create(patient_name="P1", blood_group="O+", hospital="H1", city="C1", status="Waiting", urgency="High")
        notification = EmergencyNotification.objects.create(blood_request=req, donor=donor, status="Sent")
        ai_log = AIIntakeLog.objects.create(raw_input="Log raw description", ai_output={"patient_name": "P1"}, confidence_score=0.95, blood_request=req)

        resp, tool_called, tool_name, request_id, tools = self.capture_tools("Hello")
        query_db = tools["query_database_details_tool"]

        # 1. Query User model (checks password exclusion)
        res_user = json.loads(query_db(model_name="User"))
        assert len(res_user) >= 1
        assert any(u["username"] == "test_coord" for u in res_user)
        assert "password" not in res_user[0]

        # 2. Query Donor model with field filter
        res_donor = json.loads(query_db(model_name="Donor", filters={"blood_group": "O+"}))
        assert len(res_donor) == 1
        assert res_donor[0]["name"] == "Donor A"

        # 3. Query BloodRequest with search query (case-insensitive substring search)
        res_req = json.loads(query_db(model_name="BloodRequest", search_query="h1"))
        assert len(res_req) == 1
        assert res_req[0]["patient_name"] == "P1"

        # 4. Query EmergencyNotification (tests relationships parsing)
        res_notif = json.loads(query_db(model_name="EmergencyNotification"))
        assert len(res_notif) == 1
        assert res_notif[0]["status"] == "Sent"
        assert "blood_request" in res_notif[0]
        assert "donor" in res_notif[0]

        # 5. Query AIIntakeLog
        res_log = json.loads(query_db(model_name="AIIntakeLog"))
        assert len(res_log) == 1
        assert res_log[0]["raw_input"] == "Log raw description"

    def test_query_database_details_tool_exception(self):
        resp, tool_called, tool_name, request_id, tools = self.capture_tools("Hello")
        query_db = tools["query_database_details_tool"]

        # Triggering an exception by using non-JSON serializable filters
        res = json.loads(query_db(model_name="User", filters={"username__invalidlookup": "value"}))
        assert "error" in res

    # ── Nested Tool Functionality: create_blood_request_tool ──

    @patch("requests_app.views.get_coordinates")
    @patch("requests_app.views.trigger_next_notification")
    def test_create_blood_request_tool_success(self, mock_trigger, mock_coords):
        mock_coords.return_value = (10.1234, 76.5678)
        
        resp, tool_called, tool_name, request_id, tools = self.capture_tools("Hello")
        create_request = tools["create_blood_request_tool"]

        res_str = create_request(
            patient_name="Arun Kumar",
            blood_group="o negative",
            hospital="Aster Medcity",
            city="Kochi",
            urgency="critical"
        )
        res = json.loads(res_str)
        
        assert res["success"] is True
        assert res["patient_name"] == "Arun Kumar"
        assert res["blood_group"] == "O-"
        assert res["urgency"] == "Critical"
        assert res["city"] == "Kochi"

        # Verify created model in DB
        db_req = BloodRequest.objects.get(id=res["request_id"])
        assert db_req.latitude == 10.1234
        assert db_req.longitude == 76.5678
        assert len(db_req.timeline) == 2
        assert db_req.timeline[0]["status"] == "Request Received"

        # Verify side effects
        mock_trigger.assert_called_once_with(db_req)

    @patch("requests_app.views.get_coordinates")
    def test_create_blood_request_tool_exception(self, mock_coords):
        mock_coords.side_effect = Exception("Geocoding failed")
        
        resp, tool_called, tool_name, request_id, tools = self.capture_tools("Hello")
        create_request = tools["create_blood_request_tool"]

        # Should catch exception and return success=False with error message
        res_str = create_request(
            patient_name="Sita",
            blood_group="A+",
            hospital="City Hospital",
            city="Kochi",
            urgency="medium"
        )
        res = json.loads(res_str)
        assert res["success"] is False
        assert "error" in res
        assert "Geocoding failed" in res["error"]

    @patch("django.contrib.auth.models.User.objects.all")
    def test_query_database_details_tool_field_retrieve_exception(self, mock_all):
        mock_user = MagicMock()
        mock_user._meta.get_fields.return_value = [
            MagicMock(is_relation=False, name="username")
        ]
        # Make accessing mock_user.username raise an exception
        type(mock_user).username = PropertyMock(side_effect=Exception("Database row read error"))
        
        mock_all.return_value = [mock_user]
        
        resp, tool_called, tool_name, request_id, tools = self.capture_tools("Hello")
        query_db = tools["query_database_details_tool"]
        
        res = json.loads(query_db(model_name="User"))
        assert len(res) == 1
        assert "username" not in res[0]


def test_anthropic_import_error_fallback():
    import sys
    import importlib
    import ai_intake.services

    try:
        with patch.dict(sys.modules, {"anthropic": None}):
            importlib.reload(ai_intake.services)
            assert hasattr(ai_intake.services, "DummyAnthropic")
            
            # Verify DummyAnthropic behavior
            client = ai_intake.services.anthropic.Anthropic()
            assert client is not None
            
            result = ai_intake.services.parse_emergency_text("text")
            assert result is None
    finally:
        importlib.reload(ai_intake.services)


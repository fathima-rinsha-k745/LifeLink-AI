import json
import pytest
from unittest.mock import patch
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from donors.models import Donor
from ai_intake.services import find_available_donors

@pytest.fixture
def auth_client(db):
    user = User.objects.create_user(username="testuser", password="testpass123")
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user

@pytest.mark.django_db
class TestFindAvailableDonors:

    def test_finds_available_donors_filtered(self):
        # Create test donors
        Donor.objects.create(name="Donor A", blood_group="O+", city="Kozhikode", phone="12345", available=True)
        Donor.objects.create(name="Donor B", blood_group="O-", city="Kozhikode", phone="67890", available=True)
        Donor.objects.create(name="Donor C", blood_group="O+", city="Kozhikode", phone="11111", available=False)
        Donor.objects.create(name="Donor D", blood_group="O+", city="Thrissur", phone="22222", available=True)

        # Query by O+ and Kozhikode
        res_str = find_available_donors(blood_group="O+", city="Kozhikode")
        results = json.loads(res_str)

        # Should only find Donor A
        assert len(results) == 1
        assert results[0]["name"] == "Donor A"
        assert results[0]["phone"] == "12345"

        # Query by Kozhikode only
        res_str_city = find_available_donors(city="Kozhikode")
        results_city = json.loads(res_str_city)
        assert len(results_city) == 2
        names = {d["name"] for d in results_city}
        assert names == {"Donor A", "Donor B"}


@pytest.mark.django_db
class TestAIChatEndpoint:

    @patch("ai_intake.services.run_ai_chat")
    def test_permits_unauthenticated(self, mock_run, db):
        mock_run.return_value = ("Hello, I am the AI.", False, "", None)
        client = APIClient()
        response = client.post("/api/ai-chat/", {"message": "Hello"}, format="json")
        assert response.status_code == 200
        assert response.json()["response"] == "Hello, I am the AI."

    def test_rejects_empty_message(self, auth_client):
        client, _ = auth_client
        response = client.post("/api/ai-chat/", {"message": ""}, format="json")
        assert response.status_code == 400

        response = client.post("/api/ai-chat/", {}, format="json")
        assert response.status_code == 400

    @patch("ai_intake.services.run_ai_chat")
    def test_chat_success_tool_called(self, mock_run, auth_client):
        client, _ = auth_client
        mock_run.return_value = ("Here is the list of O+ donors in Kozhikode...", True, "find_donors_tool", None)

        response = client.post("/api/ai-chat/", {"message": "Find O+ donors in Kozhikode"}, format="json")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["response"] == "Here is the list of O+ donors in Kozhikode..."
        assert data["tool_called"] is True

    @patch("ai_intake.services.run_ai_chat")
    def test_chat_success_no_tool(self, mock_run, auth_client):
        client, _ = auth_client
        mock_run.return_value = ("Paris is the capital of France.", False, "", None)

        response = client.post("/api/ai-chat/", {"query": "What is the capital of France?"}, format="json")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["response"] == "Paris is the capital of France."
        assert data["tool_called"] is False

import json
import datetime
import urllib.request
import urllib.error
from unittest.mock import patch, MagicMock
import pytest
from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from donors.models import Donor
from requests_app.models import BloodRequest, EmergencyNotification
from requests_app.views import (
    geocode_city,
    get_coordinates,
    haversine_distance,
    calculate_match_score,
    trigger_next_notification,
)

# ── Fixtures & Setup ──────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def users_setup(db):
    # Coordinator User
    coord_user = User.objects.create_user(username="coord", password="password123")
    
    # Donor User 1
    donor_user1 = User.objects.create_user(username="donor1", password="password123")
    donor_profile1 = Donor.objects.create(
        user=donor_user1,
        name="Donor One",
        blood_group="O+",
        city="Kochi",
        phone="9998887771",
        available=True,
        reliability_score=100.0,
    )
    
    # Donor User 2
    donor_user2 = User.objects.create_user(username="donor2", password="password123")
    donor_profile2 = Donor.objects.create(
        user=donor_user2,
        name="Donor Two",
        blood_group="O-",
        city="Thrissur",
        phone="9998887772",
        available=True,
        reliability_score=85.0,
    )

    # Donor User 3
    donor_user3 = User.objects.create_user(username="donor3", password="password123")
    donor_profile3 = Donor.objects.create(
        user=donor_user3,
        name="Donor Three",
        blood_group="O+",
        city="Thrissur",
        phone="9998887773",
        available=True,
        reliability_score=90.0,
    )
    
    return {
        "coord": coord_user,
        "donor1": donor_user1,
        "donor1_profile": donor_profile1,
        "donor2": donor_user2,
        "donor2_profile": donor_profile2,
        "donor3": donor_user3,
        "donor3_profile": donor_profile3,
    }


# ── geocode_city & Coordinate calculations Tests ───────────────────────────────

class TestGeocodingAndProximity:

    def test_geocode_city_preset(self):
        # trivandrum is pre-defined
        coords = geocode_city("trivandrum")
        assert coords == (8.5241, 76.9366)
        
        # casing and spacing stripping
        coords_stripped = geocode_city("  KOCHI   ")
        assert coords_stripped == (9.9312, 76.2673)

    @patch("urllib.request.urlopen")
    def test_geocode_city_nominatim_success(self, mock_urlopen):
        # Mocking Nominatim API response
        mock_response = MagicMock()
        mock_response.read.return_value = b'[{"lat": "10.1234", "lon": "76.5678"}]'
        mock_urlopen.return_value.__enter__.return_value = mock_response

        # Test geocoding custom city
        coords = geocode_city("Aluva")
        assert coords == (10.1234, 76.5678)
        
        # Test cache hits for next call
        coords_cached = geocode_city("Aluva")
        assert coords_cached == (10.1234, 76.5678)
        assert mock_urlopen.call_count == 1  # Called only once due to cache

    @patch("urllib.request.urlopen")
    def test_geocode_city_nominatim_failure_fallback(self, mock_urlopen):
        # OpenURL throws URLError
        mock_urlopen.side_effect = urllib.error.URLError("Server down")
        
        coords = geocode_city("CustomCityXYZ")
        # Should fallback to Trivandrum coordinates
        assert coords == (8.5241, 76.9366)

    def test_get_coordinates(self):
        lat, lon = get_coordinates("trivandrum", instance_id=123)
        assert abs(lat - 8.5241) <= 0.08
        assert abs(lon - 76.9366) <= 0.08

    def test_haversine_distance_fallback(self):
        # If any lat/lon is 0.0
        dist1 = haversine_distance(0.0, 76.2673, 9.9312, 76.2673)
        dist2 = haversine_distance(9.9312, 76.2673, 9.9312, 0.0)
        assert dist1 == 2.5
        assert dist2 == 2.5

    def test_haversine_distance_calculation(self):
        # Trivandrum to Kozhikode distance calculation
        # TVM: (8.5241, 76.9366), Calicut: (11.2588, 75.7804)
        dist = haversine_distance(8.5241, 76.9366, 11.2588, 75.7804)
        assert 300.0 < dist < 350.0


# ── calculate_match_score & notifications queue Tests ─────────────────────────

@pytest.mark.django_db
class TestDonorMatchingAndQueue:

    def test_calculate_match_score(self):
        # Compatibility matrices and distance scorings
        donor = Donor(blood_group="O+", available=True, city="Thrissur", reliability_score=90.0)
        req = BloodRequest(blood_group="AB+", city="Thrissur")
        
        # Incompatible blood groups
        donor_incomp = Donor(blood_group="AB+", available=True, city="Thrissur", reliability_score=90.0)
        req_incomp = BloodRequest(blood_group="O-", city="Thrissur")
        
        score_incomp, reasons, dist = calculate_match_score(donor_incomp, req_incomp)
        assert score_incomp == 0
        assert dist == 0.0

        # Compatible compatible match, exact vs compatible
        score1, reasons1, dist1 = calculate_match_score(donor, req)
        assert score1 > 0
        assert "✓ Compatible blood group" in reasons1

        # Same blood group match
        donor_exact = Donor(blood_group="O+", available=True, city="Thrissur", reliability_score=90.0)
        req_exact = BloodRequest(blood_group="O+", city="Thrissur")
        score_exact, reasons_exact, _ = calculate_match_score(donor_exact, req_exact)
        assert "✓ Perfect blood group match" in reasons_exact

    def test_calculate_match_score_same_city_large_distance(self):
        # same city but distance >= 10.0
        donor = Donor(blood_group="O+", available=True, city="Thrissur", reliability_score=90.0, latitude=10.0, longitude=76.0)
        req = BloodRequest(blood_group="O+", city="Thrissur", latitude=10.5, longitude=76.5)
        score, reasons, dist = calculate_match_score(donor, req)
        assert any("In the same city" in r for r in reasons)
        assert dist >= 10.0

    def test_trigger_next_notification_depleted_queue(self):
        # Empty database or no compatible donors
        req = BloodRequest.objects.create(
            patient_name="EmptyQueue",
            blood_group="O-",
            city="Kochi",
            hospital="Aster",
            urgency="High"
        )
        # Verify no available O- donors
        trigger_next_notification(req)
        
        req.refresh_from_db()
        assert req.status == "Rejected"
        assert any("depleted" in log["message"] for log in req.timeline)

    def test_trigger_next_notification_fallback_to_other_cities(self, users_setup):
        # Create request for O- blood in Kochi
        # Our only O- donor is Donor Two (Thrissur)
        req = BloodRequest.objects.create(
            patient_name="Patient CrossCity",
            blood_group="O-",
            city="Kochi",
            hospital="Hospital Kochi",
            urgency="High"
        )
        
        trigger_next_notification(req)
        req.refresh_from_db()
        
        assert req.status == "Waiting"
        # Verify notification was sent to Donor Two (O- from Thrissur)
        notif = EmergencyNotification.objects.get(blood_request=req)
        assert notif.donor == users_setup["donor2_profile"]
        assert notif.status == "pending"


# ── API ViewSet & Custom Views Permissions Tests ──────────────────────────────

@pytest.mark.django_db
class TestRequestsAPI:

    # ── Permission Tests on BloodRequestViewSet ──

    def test_blood_request_viewset_permissions(self, api_client, users_setup):
        # Anonymous User
        response_list = api_client.get("/api/requests/")
        assert response_list.status_code == 401
        
        response_create = api_client.post("/api/requests/", {"patient_name": "Test"})
        assert response_create.status_code == 401

        # Donor User (Authenticated but not Coordinator)
        api_client.force_authenticate(user=users_setup["donor1"])
        
        response_list_donor = api_client.get("/api/requests/")
        assert response_list_donor.status_code == 200
        
        response_create_donor = api_client.post("/api/requests/", {"patient_name": "Test"})
        assert response_create_donor.status_code == 403
        
        # Coordinator User
        api_client.force_authenticate(user=users_setup["coord"])
        settings.COORDINATOR_USERNAME = "coord"
        
        # Create BloodRequest (201 Created)
        post_data = {
            "patient_name": "Sajeev",
            "blood_group": "O+",
            "hospital": "Medical College",
            "city": "Thrissur",
            "urgency": "High",
            "contact_phone": "9998887779"
        }
        response_create_coord = api_client.post("/api/requests/", post_data, format="json")
        assert response_create_coord.status_code == 201
        req_id = response_create_coord.json()["id"]

        # List BloodRequests
        response_list_coord = api_client.get("/api/requests/")
        assert response_list_coord.status_code == 200
        assert len(response_list_coord.json()["results"]) == 1

        # Update Request (200 OK)
        response_update = api_client.patch(f"/api/requests/{req_id}/", {"urgency": "Critical"}, format="json")
        assert response_update.status_code == 200
        assert response_update.json()["urgency"] == "Critical"

        # Delete Request (204 No Content)
        response_delete = api_client.delete(f"/api/requests/{req_id}/")
        assert response_delete.status_code == 204

    def test_blood_request_create_validation_error(self, api_client, users_setup):
        api_client.force_authenticate(user=users_setup["coord"])
        settings.COORDINATOR_USERNAME = "coord"

        # Missing patient name
        post_data = {
            "blood_group": "O+",
            "hospital": "Medical College",
            "city": "Thrissur",
            "urgency": "High"
        }
        response = api_client.post("/api/requests/", post_data, format="json")
        assert response.status_code == 400

    # ── Match Donors View ──

    def test_match_donors_view_invalid_id(self, api_client):
        response = api_client.get("/api/match-donors/9999/")
        assert response.status_code == 404

    def test_match_donors_view_escalates_on_timeout(self, api_client, users_setup):
        # Create request and a timed-out notification
        req = BloodRequest.objects.create(
            patient_name="P1",
            blood_group="O+",
            city="Thrissur",
            hospital="Hospital",
            urgency="High",
        )
        
        # Pending notification sent 2 hours ago (timed out since High urgency timeout is 60s)
        past_time = timezone.now() - datetime.timedelta(hours=2)
        notif = EmergencyNotification.objects.create(
            blood_request=req,
            donor=users_setup["donor3_profile"],
            status="pending"
        )
        # Update sent_at field specifically (auto_now_add override)
        EmergencyNotification.objects.filter(id=notif.id).update(sent_at=past_time)

        # Trigger match_donors endpoint
        response = api_client.get(f"/api/match-donors/{req.id}/")
        assert response.status_code == 200
        
        # Check escalation: notif status updated to rejected, next compatible donor notified
        notif.refresh_from_db()
        assert notif.status == "rejected"
        
        req.refresh_from_db()
        assert req.status == "Waiting"
        # Since Donor 3 timed out, it should trigger the next ranked donor (Donor 2, Thrissur O-)
        new_notif = EmergencyNotification.objects.filter(blood_request=req, status="pending").first()
        assert new_notif is not None
        assert new_notif.donor == users_setup["donor2_profile"]

    # ── Pending Notification View ──

    def test_pending_notification_view(self, api_client, users_setup):
        # Anonymous User
        assert api_client.get("/api/notifications/pending/").status_code == 401
        
        # Non-donor User
        api_client.force_authenticate(user=users_setup["coord"])
        res_coord = api_client.get("/api/notifications/pending/")
        assert res_coord.status_code == 200
        assert res_coord.json()["notification"] is None

        # Donor User with no pending notification
        api_client.force_authenticate(user=users_setup["donor1"])
        res_no_notif = api_client.get("/api/notifications/pending/")
        assert res_no_notif.status_code == 200
        assert res_no_notif.json()["notification"] is None

        # Donor User with active pending notification
        req = BloodRequest.objects.create(
            patient_name="P1",
            blood_group="O+",
            city="Thrissur",
            hospital="Hospital",
            urgency="High",
        )
        notif = EmergencyNotification.objects.create(
            blood_request=req,
            donor=users_setup["donor1_profile"],
            status="pending"
        )

        res_notif = api_client.get("/api/notifications/pending/")
        assert res_notif.status_code == 200
        assert res_notif.json()["notification"]["id"] == notif.id
        assert res_notif.json()["notification"]["patient_name"] == "P1"

    # ── Notification History View ──

    def test_notification_history_view(self, api_client, users_setup):
        # Anonymous User
        assert api_client.get("/api/notifications/history/").status_code == 401

        # Non-donor user
        api_client.force_authenticate(user=users_setup["coord"])
        res_coord = api_client.get("/api/notifications/history/")
        assert res_coord.status_code == 200
        assert res_coord.json() == []

        # Donor User
        api_client.force_authenticate(user=users_setup["donor1"])
        
        req1 = BloodRequest.objects.create(patient_name="P1", blood_group="O+", city="Thrissur", hospital="Hospital", urgency="High")
        req2 = BloodRequest.objects.create(patient_name="P2", blood_group="O+", city="Kochi", hospital="Aster", urgency="Low")
        
        EmergencyNotification.objects.create(blood_request=req1, donor=users_setup["donor1_profile"], status="accepted")
        EmergencyNotification.objects.create(blood_request=req2, donor=users_setup["donor1_profile"], status="rejected")

        res_history = api_client.get("/api/notifications/history/")
        assert res_history.status_code == 200
        history_data = res_history.json()
        assert len(history_data) == 2
        assert {h["status"] for h in history_data} == {"accepted", "rejected"}

    # ── Respond to Notification View ──

    def test_respond_to_notification_anonymous_user(self, api_client):
        assert api_client.post("/api/notifications/1/respond/", {}).status_code == 401

    def test_respond_to_notification_invalid_status(self, api_client, users_setup):
        api_client.force_authenticate(user=users_setup["donor1"])
        # Invalid status parameter
        res = api_client.post("/api/notifications/1/respond/", {"status": "maybe"})
        assert res.status_code == 400
        assert "Invalid response status" in res.json()["error"]

    def test_respond_to_notification_missing_notification(self, api_client, users_setup):
        api_client.force_authenticate(user=users_setup["donor1"])
        res = api_client.post("/api/notifications/9999/respond/", {"status": "accepted"})
        assert res.status_code == 404

    def test_respond_to_notification_non_donor_user(self, api_client, users_setup):
        api_client.force_authenticate(user=users_setup["coord"])
        
        req = BloodRequest.objects.create(patient_name="P1", blood_group="O+", city="Thrissur", hospital="Hospital", urgency="High")
        notif = EmergencyNotification.objects.create(blood_request=req, donor=users_setup["donor1_profile"], status="pending")

        res = api_client.post(f"/api/notifications/{notif.id}/respond/", {"status": "accepted"})
        assert res.status_code == 403
        assert "no donor profile" in res.json()["error"]

    def test_respond_to_notification_wrong_donor_user(self, api_client, users_setup):
        # Logged-in as donor2, but notification belongs to donor1
        api_client.force_authenticate(user=users_setup["donor2"])

        req = BloodRequest.objects.create(patient_name="P1", blood_group="O+", city="Thrissur", hospital="Hospital", urgency="High")
        notif = EmergencyNotification.objects.create(blood_request=req, donor=users_setup["donor1_profile"], status="pending")

        res = api_client.post(f"/api/notifications/{notif.id}/respond/", {"status": "accepted"})
        assert res.status_code == 403
        assert "Unauthorized response" in res.json()["error"]

    def test_respond_to_notification_accept_flow(self, api_client, users_setup):
        api_client.force_authenticate(user=users_setup["donor1"])

        req = BloodRequest.objects.create(patient_name="P1", blood_group="O+", city="Thrissur", hospital="Hospital", urgency="High", contact_phone="111222")
        notif = EmergencyNotification.objects.create(blood_request=req, donor=users_setup["donor1_profile"], status="pending")

        res = api_client.post(f"/api/notifications/{notif.id}/respond/", {"status": "accepted"})
        assert res.status_code == 200
        
        # Verify stats and status updates
        notif.refresh_from_db()
        assert notif.status == "accepted"
        assert notif.responded_at is not None
        
        donor = users_setup["donor1_profile"]
        donor.refresh_from_db()
        assert donor.accepted_count == 1
        assert donor.reliability_score == 100.0
        
        req.refresh_from_db()
        assert req.status == "Accepted"
        assert any(log["status"] == "Completed" for log in req.timeline)

    def test_respond_to_notification_reject_flow(self, api_client, users_setup):
        api_client.force_authenticate(user=users_setup["donor1"])

        req = BloodRequest.objects.create(patient_name="P1", blood_group="O+", city="Thrissur", hospital="Hospital", urgency="High")
        notif = EmergencyNotification.objects.create(blood_request=req, donor=users_setup["donor1_profile"], status="pending")

        res = api_client.post(f"/api/notifications/{notif.id}/respond/", {"status": "rejected"})
        assert res.status_code == 200
        
        # Verify status updates and stats
        notif.refresh_from_db()
        assert notif.status == "rejected"
        
        donor = users_setup["donor1_profile"]
        donor.refresh_from_db()
        assert donor.rejected_count == 1
        assert donor.reliability_score == 0.0  # 0 accepted out of 1 response
        
        # Since donor1 rejected, queue should escalate to the next candidate (Donor 3, Thrissur O+)
        req.refresh_from_db()
        assert req.status == "Waiting"
        new_notif = EmergencyNotification.objects.filter(blood_request=req, status="pending").first()
        assert new_notif is not None
        assert new_notif.donor == users_setup["donor3_profile"]

    def test_match_donors_view_fallback_used(self, api_client, users_setup):
        # Create request for O- blood in Kochi
        # Our only O- donor is Donor Two in Thrissur (different city)
        req = BloodRequest.objects.create(
            patient_name="P_CrossCity",
            blood_group="O-",
            city="Kochi",
            hospital="Hospital Kochi",
            urgency="High"
        )
        
        # Trigger notification queue
        trigger_next_notification(req)
        
        # Match donors
        response = api_client.get(f"/api/match-donors/{req.id}/")
        assert response.status_code == 200
        data = response.json()
        assert data["fallback_used"] is True

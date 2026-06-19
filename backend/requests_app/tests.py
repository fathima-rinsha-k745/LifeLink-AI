import pytest
from requests_app.models import BloodRequest


@pytest.mark.django_db
def test_create_blood_request():

    request = BloodRequest.objects.create(
        patient_name="Rajan",
        blood_group="O+",
        hospital="MIMS Hospital",
        city="Kozhikode",
        urgency="High"
    )

    assert request.patient_name == "Rajan"
    assert request.blood_group == "O+"
    assert request.hospital == "MIMS Hospital"
    assert request.city == "Kozhikode"
    assert request.urgency == "High"


@pytest.mark.django_db
def test_blood_request_str():

    request = BloodRequest.objects.create(
        patient_name="Rajan",
        blood_group="A+",
        hospital="Medical College",
        city="Thrissur",
        urgency="Critical"
    )

    assert str(request) == "Rajan"
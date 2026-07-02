import pytest
from users.serializers import RegisterSerializer

@pytest.mark.django_db
def test_register_serializer_valid():
    data = {
        "username": "testuser",
        "password": "testpass123",
        "phone": "9876543210",
        "blood_group": "O+",
        "city": "Kozhikode"
    }

    serializer = RegisterSerializer(data=data)

    assert serializer.is_valid()
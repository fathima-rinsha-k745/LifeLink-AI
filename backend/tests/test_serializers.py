import pytest
from users.serializers import RegisterSerializer

@pytest.mark.django_db
def test_register_serializer_valid():
    data = {
        "username": "testuser",
        "password": "testpass123"
    }

    serializer = RegisterSerializer(data=data)

    assert serializer.is_valid()
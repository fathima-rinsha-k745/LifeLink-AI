from django.contrib.auth.models import User
from rest_framework.test import APIClient
import pytest

@pytest.mark.django_db
def test_login_success():
    User.objects.create_user(
        username="testuser",
        password="password123"
    )

    client = APIClient()

    response = client.post(
        "/api/token/",
        {
            "username": "testuser",
            "password": "password123"
        },
        format="json"
    )

    assert response.status_code == 200
import os
import pytest
from django.urls import reverse
from django.test import Client

@pytest.mark.django_db
def test_home_view_status_code():
    client = Client()
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response['Content-Type']

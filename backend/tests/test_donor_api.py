import pytest
from rest_framework.test import APIClient
def test_donor_list():
    client = APIClient()

    response = client.get("/api/donors/")

    assert response.status_code in [200, 401]
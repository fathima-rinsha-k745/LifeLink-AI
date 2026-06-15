# ai_intake/services.py

import json
try:
    import anthropic
except ImportError:
    class DummyAnthropic:
        class APIError(Exception):
            pass

        class Anthropic:
            pass

    anthropic = DummyAnthropic()
from django.conf import settings


def parse_emergency_text(raw_text: str) -> dict | None:
    """
    Mock AI parser until Anthropic API is configured.
    """

    if anthropic is None:
        return {
            "patient_name": "Test Patient",
            "blood_group": "O-",
            "units_needed": 1,
            "hospital": "Test Hospital",
            "city": "Thrissur",
            "urgency": "urgent",
            "time_window_hours": 2,
            "contact_phone": None,
            "additional_notes": raw_text[:100],
            "confidence_score": 0.95,
        }

    try:
        client = anthropic.Anthropic(
            api_key=getattr(settings, "ANTHROPIC_API_KEY", "")
        )

        # Actual API call will be added later
        return {
            "patient_name": "Test Patient",
            "blood_group": "O-",
            "units_needed": 1,
            "hospital": "Test Hospital",
            "city": "Thrissur",
            "urgency": "urgent",
            "time_window_hours": 2,
            "contact_phone": None,
            "additional_notes": raw_text[:100],
            "confidence_score": 0.95,
        }

    except Exception as e:
        print(f"AI error: {e}")
        return None
    

def find_matched_donors(blood_request) -> list:
    """
    Blood compatibility matrix + availability filter.
    Returns top 10 donors ranked by compatibility.
    """
    COMPATIBILITY = {
        "O-":  ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
        "O+":  ["O+", "A+", "B+", "AB+"],
        "A-":  ["A-", "A+", "AB-", "AB+"],
        "A+":  ["A+", "AB+"],
        "B-":  ["B-", "B+", "AB-", "AB+"],
        "B+":  ["B+", "AB+"],
        "AB-": ["AB-", "AB+"],
        "AB+": ["AB+"],
    }

    if not blood_request.blood_group:
        return []

    compatible_groups = COMPATIBILITY.get(blood_request.blood_group, [])

    from donors.models import Donor
    donors = Donor.objects.filter(
        blood_group__in=compatible_groups,
        available=True,
        city__iexact=blood_request.city
    ).values(
        "id", "name", "blood_group", "city", "phone"
    )[:10]

    return list(donors)
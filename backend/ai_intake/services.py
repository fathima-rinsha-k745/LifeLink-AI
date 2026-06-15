# ai_intake/services.py

import json
from django.conf import settings

try:
    import anthropic
except ImportError:
    class DummyAnthropic:
        class APIError(Exception):
            pass

        class Anthropic:
            def __init__(self, *args, **kwargs):
                pass

    anthropic = DummyAnthropic()


def parse_emergency_text(raw_text: str) -> dict | None:
    """
    Sends raw emergency description to Claude API.
    Returns structured dict or None if parsing fails.
    """

    try:
        client = anthropic.Anthropic(
            api_key=getattr(settings, "ANTHROPIC_API_KEY", "")
        )

        message = client.messages.create(
            model="claude-sonnet-4",
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": raw_text
                }
            ]
        )

        raw_output = message.content[0].text.strip()

        # Remove markdown fences
        if raw_output.startswith("```"):
            raw_output = raw_output.replace("```json", "")
            raw_output = raw_output.replace("```", "")
            raw_output = raw_output.strip()

        return json.loads(raw_output)

    except json.JSONDecodeError:
        return None

    except anthropic.APIError:
        return None

    except Exception:
        return None


def find_matched_donors(blood_request) -> list:
    """
    Blood compatibility matrix + availability filter.
    Returns top matching donors.
    """

    if not getattr(blood_request, "blood_group", None):
        return []

    COMPATIBILITY = {
        "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
        "O+": ["O+", "A+", "B+", "AB+"],
        "A-": ["A-", "A+", "AB-", "AB+"],
        "A+": ["A+", "AB+"],
        "B-": ["B-", "B+", "AB-", "AB+"],
        "B+": ["B+", "AB+"],
        "AB-": ["AB-", "AB+"],
        "AB+": ["AB+"],
    }

    compatible_groups = COMPATIBILITY.get(
        blood_request.blood_group,
        []
    )

    from donors.models import Donor

    donors = list(
        Donor.objects.filter(
            blood_group__in=compatible_groups,
            available=True,
            city__iexact=blood_request.city,
        ).values(
            "id",
            "name",
            "blood_group",
            "city",
            "phone",
        )
    )

    # Exact blood group first
    donors.sort(
        key=lambda d: (
            d["blood_group"] != blood_request.blood_group,
            d["name"]
        )
    )

    return donors[:10]
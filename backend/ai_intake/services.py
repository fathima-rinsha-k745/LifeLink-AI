# ai_intake/services.py

import json
import anthropic
from django.conf import settings


def parse_emergency_text(raw_text: str) -> dict | None:
    """
    Sends raw emergency description to Claude API.
    Returns structured dict or None if parsing fails.
    """
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": raw_text}
            ]
        )

        raw_output = message.content[0].text.strip()

        # Strip any accidental markdown fences
        if raw_output.startswith("```"):
            raw_output = raw_output.split("```")[1]
            if raw_output.startswith("json"):
                raw_output = raw_output[4:]

        parsed = json.loads(raw_output)
        return parsed

    except json.JSONDecodeError:
        # AI returned non-JSON — log and fail gracefully
        return None
    except anthropic.APIError as e:
        # API down or key invalid — fail gracefully
        print(f"Anthropic API error: {e}")
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
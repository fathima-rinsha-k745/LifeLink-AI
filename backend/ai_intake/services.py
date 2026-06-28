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
        "O-": ["O-"],
        "O+": ["O-", "O+"],
        "A-": ["O-", "A-"],
        "A+": ["O-", "O+", "A-", "A+"],
        "B-": ["O-", "B-"],
        "B+": ["O-", "O+", "B-", "B+"],
        "AB-": ["O-", "A-", "B-", "AB-"],
        "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
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


def find_available_donors(blood_group: str = None, city: str = None) -> str:
    """
    Find available blood donors in the database.

    Args:
        blood_group: The blood group to filter by (e.g., 'A+', 'O-', 'B+'). Optional.
        city: The city to filter by. Optional.
    """
    from donors.models import Donor
    queryset = Donor.objects.filter(available=True)
    if blood_group:
        queryset = queryset.filter(blood_group__iexact=blood_group.strip())
    if city:
        queryset = queryset.filter(city__iexact=city.strip())

    results = []
    for d in queryset[:10]:
        results.append({
            "id": d.id,
            "name": d.name,
            "blood_group": d.blood_group,
            "city": d.city,
            "phone": d.phone,
        })
    return json.dumps(results)


def run_ai_chat(message: str) -> tuple[str, bool]:
    """
    Runs Gemini Chat with automatic function calling enabled,
    and returns (response_text, tool_called).
    """
    tool_called = False

    def find_available_donors_tool(blood_group: str = None, city: str = None) -> str:
        """
        Find available blood donors in the database.

        Args:
            blood_group: The blood group to filter by (e.g., 'A+', 'O-', 'B+'). Optional.
            city: The city to filter by. Optional.
        """
        nonlocal tool_called
        tool_called = True
        return find_available_donors(blood_group, city)

    find_available_donors_tool.__name__ = "find_available_donors"

    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)

    model = genai.GenerativeModel(
        "gemini-3-flash-preview",
        tools=[find_available_donors_tool]
    )
    chat = model.start_chat(enable_automatic_function_calling=True)
    response = chat.send_message(message)

    return response.text, tool_called
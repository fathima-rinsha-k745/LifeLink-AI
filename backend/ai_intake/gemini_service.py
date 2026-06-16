import json
import google.generativeai as genai
from django.conf import settings

genai.configure(api_key=settings.GEMINI_API_KEY)


SYSTEM_PROMPT = """
You are LifeLink AI.

Extract emergency blood request information.

Return ONLY valid JSON.

Schema:

{
  "patient_name": null,
  "blood_group": null,
  "units_needed": 1,
  "hospital": null,
  "city": null,
  "urgency": null,
  "time_window_hours": null,
  "contact_phone": null,
  "additional_notes": null,
  "confidence_score": 0.0
}
"""


def parse_emergency_text_gemini(raw_text):
    try:
        model = genai.GenerativeModel("gemini-3-flash-preview")

        response = model.generate_content(
            f"{SYSTEM_PROMPT}\n\nInput:\n{raw_text}"
        )

        result = response.text.strip()

        if result.startswith("```"):
            result = result.replace("```json", "")
            result = result.replace("```", "")
            result = result.strip()

        return json.loads(result)

    except json.JSONDecodeError:
        print("Invalid JSON returned by Gemini")
        return None

    except Exception as e:
        error_msg = str(e)

        # Rate limiting
        if "429" in error_msg:
            print("Rate limit exceeded")
            return None

        # Token/context limit
        if "token" in error_msg.lower():
            print("Token limit exceeded")
            return None

        print("Gemini Error:", error_msg)
        return None
import json
import google.generativeai as genai
from django.conf import settings

genai.configure(api_key=settings.GEMINI_API_KEY)


SYSTEM_PROMPT = """
You are LifeLink AI.

Extract emergency blood request information from the user's input, which may be in English, Malayalam, Manglish (Malayalam written in Latin script), or a combination of them in any format.

Normalize the extracted values into English. For example, translate Malayalam/Manglish names, hospitals, or cities to standard English representation (e.g., 'Kozhikode' instead of 'Calicut' or 'കോഴിക്കോട്').

Return ONLY valid JSON.

Schema:
{
  "patient_name": "extracted patient name (string, or null if not found)",
  "blood_group": "extracted blood group like O+, O-, A+, A-, B+, B-, AB+, AB- (string, or null if not found)",
  "units_needed": 1,
  "hospital": "extracted hospital name (string, or null if not found)",
  "city": "extracted city name (string, or null if not found)",
  "urgency": "extracted urgency: Low, Medium, High, or Critical (string, or null if not found)",
  "time_window_hours": null,
  "contact_phone": "extracted contact phone number (string, or null)",
  "additional_notes": "any other details (string, or null)",
  "confidence_score": 0.0
}
"""


def parse_emergency_text_gemini(raw_text):
    try:
        target_model = "gemini-2.5-flash-lite"
        model = genai.GenerativeModel(target_model)

        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = model.generate_content(
                    f"{SYSTEM_PROMPT}\n\nInput:\n{raw_text}"
                )
                break
            except Exception as e:
                if "429" in str(e) and attempt < max_retries - 1:
                    print(f"Rate limit exceeded, retrying in {2 ** attempt}s...")
                    time.sleep(2 ** attempt)
                else:
                    raise e

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
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


def run_ai_chat(message: str, role: str = "coordinator", user = None) -> tuple[str, bool, str, int | None]:
    """
    Runs Gemini Chat with automatic function calling enabled,
    and returns (response_text, tool_called, tool_name, created_request_id).
    """
    tool_called = False
    tool_name = ""
    created_request_id = None

    def find_donors_tool(blood_group: str = None, city: str = None, available: bool = None) -> str:
        """
        Find blood donors in the database.
        Args:
            blood_group: The blood group to filter by (e.g., 'A+', 'O-', 'B+'). Optional.
            city: The city to filter by. Optional.
            available: Filter by availability status. Optional.
        """
        nonlocal tool_called, tool_name
        tool_called = True
        tool_name = "find_donors_tool"
        from donors.models import Donor
        queryset = Donor.objects.all()
        if available is not None:
            queryset = queryset.filter(available=available)
        if blood_group:
            queryset = queryset.filter(blood_group__iexact=blood_group.strip())
        if city:
            queryset = queryset.filter(city__iexact=city.strip())

        results = []
        for d in queryset[:10]:
            results.append({
                "name": d.name,
                "blood_group": d.blood_group,
                "city": d.city,
                "available": d.available,
                "phone": d.phone,
            })
        return json.dumps(results)

    def get_blood_requests_tool(status: str = None, urgency: str = None) -> str:
        """
        Get blood requests from the database.
        Args:
            status: Filter by status (Waiting, Notification Sent, Accepted, Rejected, Completed). Optional.
            urgency: Filter by urgency (Low, Medium, High, Critical). Optional.
        """
        nonlocal tool_called, tool_name
        tool_called = True
        tool_name = "get_blood_requests_tool"
        from requests_app.models import BloodRequest
        queryset = BloodRequest.objects.all()
        if status:
            queryset = queryset.filter(status__iexact=status)
        if urgency:
            queryset = queryset.filter(urgency__iexact=urgency)
        
        results = []
        for r in queryset[:10]:
            results.append({
                "patient": r.patient_name,
                "blood_group": r.blood_group,
                "city": r.city,
                "urgency": r.urgency,
                "status": r.status,
            })
        return json.dumps({"count": queryset.count(), "results": results})

    def query_database_details_tool(model_name: str, filters: dict = None, search_query: str = None) -> str:
        """
        Retrieve details from the Django database for models like User, Donor, BloodRequest, EmergencyNotification, or AIIntakeLog.
        Excludes sensitive information like passwords.
        Args:
            model_name: The Django model name to query ('User', 'Donor', 'BloodRequest', 'EmergencyNotification', or 'AIIntakeLog').
            filters: Key-value filters to apply to the query (e.g., {"status": "Waiting"}). Optional.
            search_query: Text to search in character/text fields. Optional.
        """
        nonlocal tool_called, tool_name
        tool_called = True
        tool_name = "query_database_details_tool"
        
        from django.contrib.auth.models import User
        from donors.models import Donor
        from requests_app.models import BloodRequest, EmergencyNotification
        from ai_intake.models import AIIntakeLog
        from django.db.models import Q
        from django.db import models

        model_map = {
            "user": User,
            "donor": Donor,
            "bloodrequest": BloodRequest,
            "emergencynotification": EmergencyNotification,
            "aiintakelog": AIIntakeLog,
        }
        
        name_lower = model_name.lower().replace("_", "").replace(" ", "")
        model_class = model_map.get(name_lower)
        if not model_class:
            return json.dumps({"error": f"Model '{model_name}' is not queryable. Supported models: User, Donor, BloodRequest, EmergencyNotification, AIIntakeLog."})
            
        try:
            queryset = model_class.objects.all()
            if filters:
                valid_fields = [f.name for f in model_class._meta.get_fields()]
                valid_filters = {}
                for k, v in filters.items():
                    base_field = k.split("__")[0]
                    if base_field in valid_fields:
                        valid_filters[k] = v
                if valid_filters:
                    queryset = queryset.filter(**valid_filters)
                    
            if search_query:
                search_query = search_query.strip()
                q_objects = Q()
                for field in model_class._meta.get_fields():
                    if isinstance(field, (models.CharField, models.TextField)):
                        q_objects |= Q(**{f"{field.name}__icontains": search_query})
                if q_objects:
                    queryset = queryset.filter(q_objects)
                    
            results = []
            for obj in queryset[:20]:
                data = {}
                for field in obj._meta.get_fields():
                    if field.is_relation:
                        if field.many_to_one or field.one_to_one:
                            try:
                                val = getattr(obj, field.name)
                                data[field.name] = str(val) if val else None
                            except Exception:
                                data[field.name] = getattr(obj, f"{field.name}_id", None)
                        continue
                        
                    # Skip password and secret fields
                    name_lower = field.name.lower()
                    if any(secret in name_lower for secret in ["password", "secret", "key", "token", "hash"]):
                        continue
                        
                    try:
                        val = getattr(obj, field.name)
                        if hasattr(val, 'isoformat'):
                            data[field.name] = val.isoformat()
                        else:
                            data[field.name] = val
                    except Exception:
                        pass
                results.append(data)
                
            return json.dumps(results)
        except Exception as e:
            return json.dumps({"error": str(e)})

    def create_blood_request_tool(patient_name: str, blood_group: str, hospital: str, city: str, urgency: str = "Medium") -> str:
        """
        Create and log a new emergency blood request in the database.
        Args:
            patient_name: The name of the patient.
            blood_group: The blood group needed (e.g., 'A+', 'O-', 'B+').
            hospital: The hospital name where patient is admitted.
            city: The city where the hospital is located.
            urgency: The urgency level ('Low', 'Medium', 'High', 'Critical').
        """
        nonlocal tool_called, tool_name, created_request_id
        tool_called = True
        tool_name = "create_blood_request_tool"
        
        from requests_app.models import BloodRequest
        from requests_app.views import get_coordinates, trigger_next_notification
        from django.utils import timezone
        
        # Normalize blood group
        blood_map = {
            "o negative": "O-", "o positive": "O+", "a negative": "A-", "a positive": "A+",
            "b negative": "B-", "b positive": "B+", "ab negative": "AB-", "ab positive": "AB+",
            "o-": "O-", "o+": "O+", "a-": "A-", "a+": "A+", "b-": "B-", "b+": "B+", "ab-": "AB-", "ab+": "AB+"
        }
        bg_norm = blood_map.get(blood_group.lower().strip(), blood_group.strip().upper())
        
        # Normalize urgency
        urgency_map = {
            "critical": "Critical", "urgent": "High", "high": "High",
            "moderate": "Medium", "medium": "Medium", "low": "Low"
        }
        urg_norm = urgency_map.get(urgency.lower().strip(), "Medium")
        
        try:
            blood_request = BloodRequest.objects.create(
                patient_name=patient_name.strip(),
                blood_group=bg_norm,
                hospital=hospital.strip(),
                city=city.strip(),
                urgency=urg_norm,
                status="Waiting"
            )
            
            created_request_id = blood_request.id
            
            # Set coordinates and timeline
            lat, lon = get_coordinates(blood_request.city, blood_request.id)
            blood_request.latitude = lat
            blood_request.longitude = lon
            
            timestamp = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
            blood_request.timeline = [
                {
                    "status": "Request Received",
                    "timestamp": timestamp,
                    "message": "Emergency blood request logged via AI chat."
                },
                {
                    "status": "Gemini Parsed",
                    "timestamp": timestamp,
                    "message": f"Gemini parsed: Patient ({blood_request.patient_name}), Group ({blood_request.blood_group}) at {blood_request.hospital}."
                }
            ]
            blood_request.save()
            
            # Start notifications
            trigger_next_notification(blood_request)
            
            return json.dumps({
                "success": True,
                "message": f"Successfully created emergency blood request ID {blood_request.id} for {blood_request.patient_name}.",
                "request_id": blood_request.id,
                "patient_name": blood_request.patient_name,
                "blood_group": blood_request.blood_group,
                "hospital": blood_request.hospital,
                "city": blood_request.city,
                "urgency": blood_request.urgency
            })
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    # Define system instructions based on roles
    system_instruction = (
        "You are the LifeLink AI Assistant. Provide helpful, accurate advice regarding blood donation."
    )

    if role == "requester":
        system_instruction = (
            "You are the LifeLink AI Requester Assistant. Your goal is to help patients and families in emergency situations:\n"
            "- Help them write clear emergency blood requests (including name, hospital, group, city, phone).\n"
            "- You can automatically create/log a blood request if they describe an emergency or ask to register one, or guide them on how to submit one.\n"
            "- Translate and normalize Malayalam/Manglish queries to standard format.\n"
            "- Explain blood compatibility basics (e.g., O- is the universal donor).\n"
            "- Provide immediate emergency instructions and hospital guidance.\n"
            "Be compassionate, brief, and reassuring."
        )
    elif role == "donor":
        profile_context = "No profile loaded."
        if user and hasattr(user, 'donor_profile'):
            dp = user.donor_profile
            profile_context = (
                f"Name: {dp.name}, Blood Group: {dp.blood_group}, City: {dp.city}, "
                f"Phone: {dp.phone}, Last Donation Date: {dp.last_donation_date}, "
                f"Reliability Score: {dp.reliability_score}%"
            )

        system_instruction = (
            "You are the LifeLink AI Donor Assistant. Your goal is to support voluntary blood donors:\n"
            "- Advise on donor eligibility, donation intervals (minimum 90 days between donations), and recovery.\n"
            "- Use the logged-in donor's profile details to answer eligibility queries dynamically.\n"
            f"Logged-in Donor Context: {profile_context}\n"
            "- You can query database details if the donor asks about stats, requests, or general records (excluding credentials).\n"
            "- Explain why a donor might have been matched or selected for a notification.\n"
            "- Give preparation tips (hydration, sleep) and post-donation recovery advice.\n"
            "- You can answer general health questions and platform questions.\n"
            "Be encouraging, supportive, and informative."
        )
    elif role == "coordinator":
        system_instruction = (
            "You are the LifeLink AI Coordinator Assistant. Your goal is to assist emergency response coordinators:\n"
            "- Use your tools to query the database when asked about donor availability, blood requests, notifications, users, stats, or logs.\n"
            "- Summarize donor listings, blood requests status, and audit logs.\n"
            "- You can log/create blood requests if a coordinator describes an emergency or asks you to log one.\n"
            "- Answer general health, database, and platform questions.\n"
            "Be highly analytical, professional, and focus on details."
        )

    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)

    try:
        target_model = "gemini-2.5-flash-lite"

        model = genai.GenerativeModel(
            target_model,
            tools=[find_donors_tool, get_blood_requests_tool, query_database_details_tool, create_blood_request_tool],
            system_instruction=system_instruction
        )
        chat = model.start_chat(enable_automatic_function_calling=True)
        response = chat.send_message(message)

        return response.text, tool_called, tool_name, created_request_id
    except Exception as e:
        return "Sorry, the AI Assistant is currently experiencing technical difficulties. Please try again later.", False, "", None
# ai_intake/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from users.permissions import IsCoordinator

from .serializers import AIIntakeSerializer, AIIntakeLogSerializer
from .gemini_service import parse_emergency_text_gemini as parse_emergency_text
from .services import find_matched_donors
from .models import AIIntakeLog
from drf_spectacular.utils import extend_schema
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
import traceback


class EmergencyAIIntakeView(APIView):
    """
    Accepts emergency request text,
    processes it using Gemini AI,
    validates extracted data,
    stores the request,
    and returns matching donors.
    """
    permission_classes = [AllowAny]

    @method_decorator(
        ratelimit(key='ip', rate='10/m', method='POST')
    )

    @extend_schema(
    description="AI-powered emergency blood request intake endpoint",
    request={
        "application/json": {
            "example": {
                "description":
                "Patient Rajan needs 2 units of O negative blood urgently."
            }
        }
    }
)

    def post(self, request):
        raw_text = request.data.get("description", "").strip()
        is_voice = request.data.get("is_voice", False)

        # Empty description
        if not raw_text:
            return Response(
                {"error": "description field is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Too short
        if len(raw_text) < 15: # slightly lower threshold to support short voice clips
            return Response(
                {"error": "Description too short"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Too long
        if len(raw_text) > 1000:
            return Response(
                {"error": "Description too long. Max 1000 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse with Gemini
        ai_result = parse_emergency_text(raw_text)

        if ai_result is None:
            return Response(
                {
                    "error": "AI parsing failed. Please fill the form manually.",
                    "fallback": True
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Normalize blood group
        blood_map = {
            "o negative": "O-", "o positive": "O+", "a negative": "A-", "a positive": "A+",
            "b negative": "B-", "b positive": "B+", "ab negative": "AB-", "ab positive": "AB+",
            "o-": "O-", "o+": "O+", "a-": "A-", "a+": "A+", "b-": "B-", "b+": "B+", "ab-": "AB-", "ab+": "AB+"
        }

        if ai_result.get("blood_group"):
            bg_input = str(ai_result["blood_group"]).lower().strip()
            ai_result["blood_group"] = blood_map.get(bg_input, ai_result["blood_group"].strip().upper())

        # Normalize urgency
        urgency_map = {
            "critical": "Critical",
            "urgent": "High",
            "high": "High",
            "moderate": "Medium",
            "medium": "Medium",
            "low": "Low",
        }

        raw_urgency = ai_result.get("urgency")
        if raw_urgency:
            ai_result["urgency"] = urgency_map.get(
                str(raw_urgency).lower(),
                "Medium"
            )
        else:
            ai_result["urgency"] = "Medium"

        # Keep only fields that exist in BloodRequest
        request_data = {
            "patient_name": ai_result.get("patient_name"),
            "blood_group": ai_result.get("blood_group"),
            "hospital": ai_result.get("hospital"),
            "city": ai_result.get("city"),
            "urgency": ai_result.get("urgency"),
            "contact_phone": ai_result.get("contact_phone"),
        }

        serializer = AIIntakeSerializer(data=request_data)

        if not serializer.is_valid():
            return Response(
                {
                    "error": "AI extracted invalid data",
                    "ai_output": ai_result,
                    "validation_errors": serializer.errors,
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # Save BloodRequest
        blood_request = serializer.save()

        # Set mock coordinates & initial timeline
        from requests_app.views import get_coordinates, trigger_next_notification
        from django.utils import timezone
        
        lat, lon = get_coordinates(blood_request.city, blood_request.id)
        blood_request.latitude = lat
        blood_request.longitude = lon
        
        timestamp = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
        timeline_events = [
            {
                "status": "Request Received",
                "timestamp": timestamp,
                "message": "Emergency blood request received."
            }
        ]
        if is_voice:
            timeline_events.append({
                "status": "Voice Converted",
                "timestamp": timestamp,
                "message": "Voice audio converted to text description successfully."
            })
        timeline_events.append({
            "status": "Gemini Parsed",
            "timestamp": timestamp,
            "message": f"Gemini parsed: Patient ({blood_request.patient_name}), Group ({blood_request.blood_group}) at {blood_request.hospital}."
        })
        
        blood_request.timeline = timeline_events
        blood_request.save()

        # Log AI interaction
        log_user = request.user if request.user.is_authenticated else None
        AIIntakeLog.objects.create(
            user=log_user,
            raw_input=raw_text,
            ai_output=ai_result,
            confidence_score=ai_result.get("confidence_score", 0),
            blood_request=blood_request
        )

        # Start ranking & notify highest-ranked compatible donor
        trigger_next_notification(blood_request)

        # Re-fetch matching details to return
        from requests_app.views import calculate_match_score
        COMPATIBILITY = {
            "O-": ["O-"], "O+": ["O-", "O+"], "A-": ["O-", "A-"], "A+": ["O-", "O+", "A-", "A+"],
            "B-": ["O-", "B-"], "B+": ["O-", "O+", "B-", "B+"], "AB-": ["O-", "A-", "B-", "AB-"],
            "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
        }
        compatible_groups = COMPATIBILITY.get(blood_request.blood_group, [])
        from donors.models import Donor
        from requests_app.models import EmergencyNotification
        notif = EmergencyNotification.objects.filter(blood_request=blood_request, status__in=['pending', 'accepted']).first()
        
        matched_donors = []
        fallback_used = False
        
        if notif:
            d = notif.donor
            score, reasons, dist = calculate_match_score(d, blood_request)
            if d.city.lower() != blood_request.city.lower():
                fallback_used = True
                
            matched_donors.append({
                "id": d.id,
                "name": d.name,
                "blood_group": d.blood_group,
                "city": d.city,
                "phone": d.phone if notif.status == 'accepted' else None,
                "available": d.available,
                "distance": f"{dist:.1f} km",
                "compatibility_score": score,
                "why_donor": reasons,
                "reliability": f"{d.reliability_score}%",
                "is_notified": notif.status == 'pending',
                "status": notif.status
            })

        return Response(
            {
                "success": True,
                "message": "Emergency intake processed successfully",
                "blood_request": {
                    "id": blood_request.id,
                    **serializer.data,
                    "timeline": blood_request.timeline,
                    "status": blood_request.status
                },
                "matched_donors": matched_donors[:10],
                "donors_found": len(matched_donors),
                "fallback_used": fallback_used,
                "ai_confidence": ai_result.get("confidence_score", 0),
            },
            status=status.HTTP_201_CREATED,
        )


class AIIntakeLogListView(generics.ListAPIView):
    """
    Lists historical AI intake logs.
    """
    queryset = AIIntakeLog.objects.all().order_by("-created_at")
    serializer_class = AIIntakeLogSerializer
    permission_classes = [IsCoordinator]


class AIChatView(APIView):
    """
    Accepts user message, processes it using Gemini AI,
    deciding dynamically to search for available donors if required.
    """
    permission_classes = [AllowAny]

    @method_decorator(
        ratelimit(key='ip', rate='10/m', method='POST')
    )
    def post(self, request):
        message = request.data.get("message", request.data.get("query", "")).strip()
        role = request.data.get("role", "coordinator")

        if not message:
            return Response(
                {"error": "message or query field is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from .services import run_ai_chat
            chat_user = request.user if request.user.is_authenticated else None
            
            if role == "requester":
                import google.generativeai as genai
                from django.conf import settings
                genai.configure(api_key=settings.GEMINI_API_KEY)
                intent_model = genai.GenerativeModel("gemini-2.5-flash-lite")
                intent_prompt = (
                    "You are an expert intent classifier. "
                    "Classify if the following user message describes a real/emergency request to log or register a blood request "
                    "(it should mention details like a patient/recipient name, blood group, or hospital where blood is needed), "
                    "or if it is just a general question/query (like asking about donors, compatibility, general info, stats, or chatting).\n"
                    "Respond with exactly 'BLOOD_REQUEST' if they are seeking to create/register/log a new blood request, "
                    "or 'GENERAL_QUESTION' if they are asking a question or querying info.\n\n"
                    f"Text: {message}"
                )
                
                import time
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        intent_response = intent_model.generate_content(intent_prompt).text.strip()
                        break
                    except Exception as e:
                        if "429" in str(e) and attempt < max_retries - 1:
                            print(f"Intent rate limit exceeded, retrying in {2 ** attempt}s...")
                            time.sleep(2 ** attempt)
                        else:
                            raise e
                
                if "BLOOD_REQUEST" in intent_response.upper():
                    mutable_data = request.data.copy()
                    mutable_data['description'] = message
                    request._full_data = mutable_data
                    intake_view = EmergencyAIIntakeView()
                    intake_view.request = request
                    intake_view.format_kwarg = None
                    response = intake_view.post(request)
                    if response.status_code == 201:
                        response.data['is_blood_request'] = True
                        return response
                    elif response.status_code == 422:
                        # It thought it was a blood request but lacked details. 
                        # Fallback to general chat which can ask for more details or use tools.
                        pass
                    else:
                        return response
 
            response_text, tool_called, tool_name, created_request_id = run_ai_chat(message, role=role, user=chat_user)
            
            # Log AI interaction
            from .models import AIIntakeLog
            AIIntakeLog.objects.create(
                user=chat_user,
                raw_input=message,
                ai_output={},
                function_called=tool_name if tool_called else None,
                tool_used=tool_name if tool_called else None,
                ai_response=response_text
            )

            if tool_called and tool_name == "create_blood_request_tool" and created_request_id:
                from requests_app.models import BloodRequest
                from requests_app.views import calculate_match_score
                try:
                    blood_request = BloodRequest.objects.get(id=created_request_id)
                    from .serializers import AIIntakeSerializer
                    serializer = AIIntakeSerializer(blood_request)
                    
                    COMPATIBILITY = {
                        "O-": ["O-"], "O+": ["O-", "O+"], "A-": ["O-", "A-"], "A+": ["O-", "O+", "A-", "A+"],
                        "B-": ["O-", "B-"], "B+": ["O-", "O+", "B-", "B+"], "AB-": ["O-", "A-", "B-", "AB-"],
                        "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
                    }
                    compatible_groups = COMPATIBILITY.get(blood_request.blood_group, [])
                    from donors.models import Donor
                    from requests_app.models import EmergencyNotification
                    notif = EmergencyNotification.objects.filter(blood_request=blood_request, status__in=['pending', 'accepted']).first()
                    
                    matched_donors = []
                    fallback_used = False
                    
                    if notif:
                        d = notif.donor
                        score, reasons, dist = calculate_match_score(d, blood_request)
                        if d.city.lower() != blood_request.city.lower():
                            fallback_used = True
                            
                        matched_donors.append({
                            "id": d.id,
                            "name": d.name,
                            "blood_group": d.blood_group,
                            "city": d.city,
                            "phone": d.phone if notif.status == 'accepted' else None,
                            "available": d.available,
                            "distance": f"{dist:.1f} km",
                            "compatibility_score": score,
                            "why_donor": reasons,
                            "reliability": f"{d.reliability_score}%",
                            "is_notified": notif.status == 'pending',
                            "status": notif.status
                        })
                    
                    return Response(
                        {
                            "success": True,
                            "message": "Emergency intake processed successfully via tool call",
                            "response": response_text,
                            "tool_called": True,
                            "is_blood_request": True,
                            "blood_request": {
                                "id": blood_request.id,
                                **serializer.data,
                                "timeline": blood_request.timeline,
                                "status": blood_request.status
                            },
                            "matched_donors": matched_donors[:10],
                            "donors_found": len(matched_donors),
                            "fallback_used": fallback_used
                        },
                        status=status.HTTP_201_CREATED
                    )
                except Exception:
                    pass
 
            return Response(
                {
                    "success": True,
                    "response": response_text,
                    "tool_called": tool_called,
                    "is_blood_request": False
                },
                status=status.HTTP_200_OK
            )

        

        except Exception as e:
         traceback.print_exc()
        print("ERROR:", repr(e))

        return Response(
        {
            "error": str(e),
            "type": type(e).__name__
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )

# ai_intake/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .serializers import AIIntakeSerializer
from .gemini_service import parse_emergency_text_gemini as parse_emergency_text
from .services import find_matched_donors
from .models import AIIntakeLog


class EmergencyAIIntakeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw_text = request.data.get("description", "").strip()

        # Empty description
        if not raw_text:
            return Response(
                {"error": "description field is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Too short
        if len(raw_text) < 20:
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
            "O negative": "O-",
            "O positive": "O+",
            "A negative": "A-",
            "A positive": "A+",
            "B negative": "B-",
            "B positive": "B+",
            "AB negative": "AB-",
            "AB positive": "AB+",
        }

        if ai_result.get("blood_group"):
            ai_result["blood_group"] = blood_map.get(
                ai_result["blood_group"],
                ai_result["blood_group"]
            )

        # Normalize urgency
        urgency_map = {
            "critical": "Critical",
            "urgent": "High",
            "high": "High",
            "moderate": "Medium",
            "medium": "Medium",
            "low": "Low",
        }

        if ai_result.get("urgency"):
            ai_result["urgency"] = urgency_map.get(
                ai_result["urgency"].lower(),
                "Medium"
            )

        # Keep only fields that exist in BloodRequest
        request_data = {
            "patient_name": ai_result.get("patient_name"),
            "blood_group": ai_result.get("blood_group"),
            "hospital": ai_result.get("hospital"),
            "city": ai_result.get("city"),
            "urgency": ai_result.get("urgency"),
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

        # Log AI interaction
        AIIntakeLog.objects.create(
            user=request.user,
            raw_input=raw_text,
            ai_output=ai_result,
            confidence_score=ai_result.get("confidence_score", 0),
            blood_request=blood_request
        )

        # Find matching donors
        matched_donors = find_matched_donors(blood_request)

        return Response(
            {
                "success": True,
                "message": "Emergency intake processed successfully",
                "blood_request": serializer.data,
                "matched_donors": matched_donors,
                "donors_found": len(matched_donors),
                "ai_confidence": ai_result.get("confidence_score", 0),
            },
            status=status.HTTP_201_CREATED,
        )
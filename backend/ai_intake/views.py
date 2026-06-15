# ai_intake/views.py

import json

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .serializers import AIIntakeSerializer
from .services import parse_emergency_text, find_matched_donors
from .models import AIIntakeLog


SYSTEM_PROMPT = """
You are a medical emergency intake parser for LifeLink AI...
[paste your full system prompt here]
"""


class EmergencyAIIntakeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw_text = request.data.get("description", "").strip()

        if not raw_text:
            return Response(
                {"error": "description field is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(raw_text) < 20:
         return Response(
        {"error": "Description too short"},
        status=status.HTTP_400_BAD_REQUEST
    )

        if len(raw_text) > 1000:
            return Response(
                {"error": "Description too long. Max 1000 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Step 1: Call AI service
        ai_result = parse_emergency_text(raw_text)
        if ai_result is None:
         return Response(
        {
            "error": "AI parsing failed. Please fill the form manually.",
            "fallback": True
        },
        status=status.HTTP_503_SERVICE_UNAVAILABLE
    )

        # Step 2: Validate extracted data
        serializer = AIIntakeSerializer(data=ai_result)
        if not serializer.is_valid():
            return Response(
                {
                    "error": "AI extracted invalid data",
                    "ai_output": ai_result,
                    "validation_errors": serializer.errors
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        # Step 3: Save to Supabase (via Django ORM → PostgreSQL)
        blood_request = serializer.save(
            created_by=request.user,
            source="ai_intake",
            raw_input=raw_text
        )

        # Step 4: Log the AI call for audit
        AIIntakeLog.objects.create(
            user=request.user,
            raw_input=raw_text,
            ai_output=ai_result,
            confidence_score=ai_result.get("confidence_score", 0),
            blood_request=blood_request
        )

        # Step 5: Find matched donors immediately
        matched_donors = find_matched_donors(blood_request)

        return Response(
            {
                "success": True,
                "message": "Emergency intake processed successfully",
                "blood_request": serializer.data,
                "matched_donors": matched_donors,
                "ai_confidence": ai_result.get("confidence_score"),
                "donors_found": len(matched_donors)
            },
            status=status.HTTP_201_CREATED
        )
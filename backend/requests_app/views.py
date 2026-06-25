from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import BloodRequest
from .serializers import BloodRequestSerializer
from django_filters.rest_framework import DjangoFilterBackend

class BloodRequestViewSet(viewsets.ModelViewSet):
    """
    Provides CRUD operations
    for blood requests.
    """
    queryset = BloodRequest.objects.all()
    serializer_class = BloodRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['blood_group', 'city']
from rest_framework.decorators import api_view
from rest_framework.response import Response
from donors.models import Donor
from .models import BloodRequest


@api_view(['GET'])
def match_donors(request, request_id):
    try:
        blood_request = BloodRequest.objects.get(id=request_id)
    except BloodRequest.DoesNotExist:
        return Response({"error": "Blood request not found"}, status=404)

    from ai_intake.services import find_matched_donors
    matches = find_matched_donors(blood_request)

    return Response({
        "request_id": blood_request.id,
        "patient_name": blood_request.patient_name,
        "matches": matches
    })

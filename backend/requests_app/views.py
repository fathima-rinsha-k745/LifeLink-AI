from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import BloodRequest
from .serializers import BloodRequestSerializer
from django_filters.rest_framework import DjangoFilterBackend

class BloodRequestViewSet(viewsets.ModelViewSet):
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
    blood_request = BloodRequest.objects.get(id=request_id)

    donors = Donor.objects.filter(
        blood_group=blood_request.blood_group,
        city=blood_request.city,
        available=True
    )

    matches = []

    for donor in donors:
        matches.append({
            "id": donor.id,
            "name": donor.name,
            "blood_group": donor.blood_group,
            "city": donor.city,
            "phone": donor.phone
        })

    return Response({
        "request_id": blood_request.id,
        "patient_name": blood_request.patient_name,
        "matches": matches
    })

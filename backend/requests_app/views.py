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
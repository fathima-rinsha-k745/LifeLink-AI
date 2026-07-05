from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny, SAFE_METHODS

from .models import Donor
from .serializers import DonorSerializer
from django_filters.rest_framework import DjangoFilterBackend

class DonorViewSet(viewsets.ModelViewSet):
    """
    Provides CRUD operations
    for donor records.
    """
    def paginate_queryset(self, queryset):
        if self.request.query_params.get('nopage') == 'true':
            return None
        return super().paginate_queryset(queryset)

    queryset = Donor.objects.none()
    serializer_class = DonorSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['blood_group', 'city', 'available']

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        from django.conf import settings
        coord_username = getattr(settings, 'COORDINATOR_USERNAME', None)
        
        # Coordinators can view/modify all donors
        if coord_username and user.username == coord_username:
            return Donor.objects.all()
            
        # Donors can only view/modify their own profile
        if hasattr(user, 'donor_profile'):
            return Donor.objects.filter(id=user.donor_profile.id)
            
        # Unauthenticated users (Requester) can see all donors so search table matches Coordinator
        if not user.is_authenticated:
            return Donor.objects.all()

        return Donor.objects.none()
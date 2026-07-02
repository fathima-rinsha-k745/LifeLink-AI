from rest_framework.permissions import BasePermission
from django.conf import settings

class IsCoordinator(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        coord_username = getattr(settings, 'COORDINATOR_USERNAME', None)
        return bool(coord_username and request.user.username == coord_username)

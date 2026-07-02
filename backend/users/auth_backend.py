from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from django.conf import settings

class CoordinatorAuthBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        coord_username = getattr(settings, 'COORDINATOR_USERNAME', None)
        coord_password = getattr(settings, 'COORDINATOR_PASSWORD', None)

        if not coord_username or not coord_password:
            return None

        if username == coord_username and password == coord_password:
            try:
                user = User.objects.get(username=coord_username)
            except User.DoesNotExist:
                user = User(username=coord_username)
                
            user.set_password(coord_password)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            return user
            
        return None

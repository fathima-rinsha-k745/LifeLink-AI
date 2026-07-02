from django.contrib.auth.models import User
from rest_framework import serializers

class RegisterSerializer(serializers.ModelSerializer):
    """
    Handles user registration
    and account creation.
    """
    phone = serializers.CharField(max_length=15, required=True)
    blood_group = serializers.CharField(max_length=3, required=True)
    city = serializers.CharField(max_length=100, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone', 'blood_group', 'city']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    
    def validate_username(self, value):
        from django.conf import settings
        coord_username = getattr(settings, 'COORDINATOR_USERNAME', None)
        if coord_username and value.lower() == coord_username.lower():
            raise serializers.ValidationError(
                "This username is reserved for system administrators."
            )
        if len(value) < 3:
            raise serializers.ValidationError(
                "Username must be at least 3 characters."
            )
        return value
    def validate_email(self, value):
        if "@" not in value:
            raise serializers.ValidationError(
                "Enter a valid email address."
            )
        return value
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError(
                "Password must be at least 8 characters."
            )
        return value
        
    def create(self, validated_data):
        phone = validated_data.pop('phone')
        blood_group = validated_data.pop('blood_group')
        city = validated_data.pop('city')
        
        user = User.objects.create_user(**validated_data)
        
        from donors.models import Donor
        Donor.objects.create(
            user=user,
            name=user.username,
            phone=phone,
            email=user.email,
            blood_group=blood_group,
            city=city,
            available=True
        )
        return user

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        from django.conf import settings
        from django.contrib.auth.models import User
        
        coord_username = getattr(settings, 'COORDINATOR_USERNAME', None)
        coord_password = getattr(settings, 'COORDINATOR_PASSWORD', None)
        
        username = attrs.get('username')
        password = attrs.get('password')
        
        # Check Coordinator credentials from .env
        if coord_username and coord_password and username == coord_username and password == coord_password:
            user, created = User.objects.get_or_create(username=coord_username, defaults={'email': 'admin@lifelink.ai'})
            if created or not user.check_password(coord_password):
                user.set_password(coord_password)
                user.is_superuser = True
                user.is_staff = True
                user.save()
                
            self.user = user
            data = {}
            refresh = self.get_token(self.user)
            data["refresh"] = str(refresh)
            data["access"] = str(refresh.access_token)
            data['username'] = self.user.username
            data['email'] = self.user.email
            data['role'] = 'coordinator'
            return data
            
        data = super().validate(attrs)
        
        # Add extra user info to JSON response
        data['username'] = self.user.username
        data['email'] = self.user.email
        
        # Verify coordinator role checks
        if coord_username and self.user.username == coord_username:
            data['role'] = 'coordinator'
        elif hasattr(self.user, 'donor_profile'):
            data['role'] = 'donor'
            data['donor_id'] = self.user.donor_profile.id
        else:
            data['role'] = 'donor'
            
        return data
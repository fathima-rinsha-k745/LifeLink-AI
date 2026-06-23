from django.contrib.auth.models import User
from rest_framework import serializers

class RegisterSerializer(serializers.ModelSerializer):
    """
    Handles user registration
    and account creation.
    """
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    
    def validate_username(self, value):
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
        return User.objects.create_user(**validated_data)
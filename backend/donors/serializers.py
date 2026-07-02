from rest_framework import serializers
from .models import Donor


class DonorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donor
        fields = '__all__'

    def validate_phone(self, value):
        if not value.isdigit():
            raise serializers.ValidationError(
                "Phone number must contain only digits."
            )

        if len(value) != 10:
            raise serializers.ValidationError(
                "Phone number must be exactly 10 digits."
            )

        return value

    def update(self, instance, validated_data):
        email = validated_data.get('email', instance.email)
        # Update Donor instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update associated User instance if it exists
        if instance.user:
            # We don't update username because it might break login, but we can update email
            if email and instance.user.email != email:
                instance.user.email = email
                instance.user.save()

        return instance
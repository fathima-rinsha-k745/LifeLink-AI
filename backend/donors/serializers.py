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
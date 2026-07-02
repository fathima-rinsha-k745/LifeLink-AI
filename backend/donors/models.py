from django.db import models
from django.contrib.auth.models import User

class Donor(models.Model):
    """
    Stores blood donor information including
    blood group, city, contact details,
    and availability status.
    """
    BLOOD_GROUPS = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]

    name = models.CharField(max_length=100)
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUPS)
    city = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    available = models.BooleanField(default=True)
    
    # Extended Donor Profile Fields
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='donor_profile')
    email = models.EmailField(blank=True, null=True)
    last_donation_date = models.DateField(blank=True, null=True)
    accepted_count = models.IntegerField(default=0)
    rejected_count = models.IntegerField(default=0)
    reliability_score = models.FloatField(default=100.0)
    average_response_time = models.IntegerField(default=0) # in minutes
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-id']

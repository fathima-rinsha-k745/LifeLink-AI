from django.db import models

# Create your models here.

class BloodRequest(models.Model):
    patient_name = models.CharField(max_length=100)
    blood_group = models.CharField(max_length=3, null=True, blank=True)
    hospital = models.CharField(max_length=150)
    city = models.CharField(max_length=100)
    urgency = models.CharField(max_length=20)

    # AI fields
    units_needed = models.IntegerField(default=1)
    time_window_hours = models.IntegerField(null=True, blank=True)
    contact_phone = models.CharField(max_length=15, null=True, blank=True)
    additional_notes = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.patient_name
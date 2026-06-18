from django.db import models

# Create your models here.

class BloodRequest(models.Model):
    """
    Stores emergency blood request information
    submitted by hospitals or recipients.
    """
    URGENCY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]

    patient_name = models.CharField(max_length=100)
    blood_group = models.CharField(
    max_length=3,
    null=True,
    blank=True
)
    hospital = models.CharField(max_length=150)
    city = models.CharField(max_length=100)
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.patient_name
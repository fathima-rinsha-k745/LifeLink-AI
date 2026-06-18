from django.db import models

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

    def __str__(self):
        return self.name

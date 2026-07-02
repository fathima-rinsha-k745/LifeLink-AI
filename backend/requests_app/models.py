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
    
    # Extended Fields for AI Routing & Proximity
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)
    STATUS_CHOICES = [
        ('Waiting', 'Waiting'),
        ('Notification Sent', 'Notification Sent'),
        ('Accepted', 'Accepted'),
        ('Rejected', 'Rejected'),
        ('Completed', 'Completed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Waiting')
    timeline = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.patient_name

    class Meta:
        ordering = ['-id']

class EmergencyNotification(models.Model):
    """
    Stores individual notifications sent to compatible donors,
    tracking whether they accept or reject.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    blood_request = models.ForeignKey(BloodRequest, on_delete=models.CASCADE, related_name='notifications')
    donor = models.ForeignKey('donors.Donor', on_delete=models.CASCADE, related_name='notifications')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Notification #{self.id} for {self.donor.name} ({self.status})"

    class Meta:
        ordering = ['-id']
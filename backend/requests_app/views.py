import math
import random
import datetime
from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsCoordinator

from donors.models import Donor
from .models import BloodRequest, EmergencyNotification
from .serializers import BloodRequestSerializer
import urllib.request
import urllib.parse
import json

class BloodRequestViewSet(viewsets.ModelViewSet):
    """
    Provides CRUD operations for blood requests.
    """
    queryset = BloodRequest.objects.all().order_by('-created_at')
    serializer_class = BloodRequestSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['blood_group', 'city']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsCoordinator()]

# Proximity Mapping Coordinates for major cities in Kerala
CITY_COORDINATES = {
    "trivandrum": (8.5241, 76.9366),
    "thiruvananthapuram": (8.5241, 76.9366),
    "kozhikode": (11.2588, 75.7804),
    "kochi": (9.9312, 76.2673),
    "thrissur": (10.5276, 76.2144),
    "ernakulam": (9.9816, 76.2999),
    "kottakkal": (10.9996, 75.9995),
    "malappuram": (11.0733, 76.0740),
    "kannur": (11.8745, 75.3704),
    "kollam": (8.8932, 76.6141),
    "palakkad": (10.7867, 76.6548),
    "kottayam": (9.5916, 76.5222),
    "alappuzha": (9.4981, 76.3388),
}

DYNAMIC_COORD_CACHE = {}

def geocode_city(city_name):
    city_key = str(city_name).lower().strip()
    
    if city_key in CITY_COORDINATES:
        return CITY_COORDINATES[city_key]
        
    if city_key in DYNAMIC_COORD_CACHE:
        return DYNAMIC_COORD_CACHE[city_key]
        
    try:
        query = urllib.parse.quote(f"{city_name}, India")
        url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1"
        req = urllib.request.Request(url, headers={'User-Agent': 'LifeLink-AI/1.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode())
            if data:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                DYNAMIC_COORD_CACHE[city_key] = (lat, lon)
                return (lat, lon)
    except Exception as e:
        print(f"Geocoding failed for {city_name}: {e}")
        
    return (8.5241, 76.9366)

def get_coordinates(city_name, instance_id=0):
    """
    Resolves city names to coordinates with a stable random offset.
    """
    base_coords = geocode_city(city_name)
    
    # Stable random offset based on instance_id
    random.seed(instance_id)
    lat_offset = (random.random() - 0.5) * 0.08
    lon_offset = (random.random() - 0.5) * 0.08
    return base_coords[0] + lat_offset, base_coords[1] + lon_offset

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculates distance between two points in km.
    """
    if lat1 == 0.0 or lon1 == 0.0 or lat2 == 0.0 or lon2 == 0.0:
        return 2.5 # default mock distance
        
    R = 6371.0 # Radius of Earth in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def calculate_match_score(donor, request):
    """
    Ranks compatible donors based on:
    - Compatibility (40%)
    - Availability (10%)
    - Proximity (30%)
    - Reliability / History (20%)
    """
    COMPATIBILITY = {
        "O-": ["O-"],
        "O+": ["O-", "O+"],
        "A-": ["O-", "A-"],
        "A+": ["O-", "O+", "A-", "A+"],
        "B-": ["O-", "B-"],
        "B+": ["O-", "O+", "B-", "B+"],
        "AB-": ["O-", "A-", "B-", "AB-"],
        "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    }
    
    is_exact = donor.blood_group == request.blood_group
    is_compatible = donor.blood_group in COMPATIBILITY.get(request.blood_group, [])
    
    if not is_compatible:
        return 0, [], 0.0
        
    comp_points = 40 if is_exact else 30
    reasons = ["✓ Compatible blood group"]
    if is_exact:
        reasons.append("✓ Perfect blood group match")
        
    # Availability
    avail_points = 10 if donor.available else 0
    if donor.available:
        reasons.append("✓ Available now")
        
    # Proximity Distance Calculation
    lat1, lon1 = (donor.latitude, donor.longitude) if donor.latitude != 0.0 else get_coordinates(donor.city, donor.id)
    lat2, lon2 = (request.latitude, request.longitude) if request.latitude != 0.0 else get_coordinates(request.city, request.id)
    
    dist = haversine_distance(lat1, lon1, lat2, lon2)
    
    dist_points = 0
    if dist < 3.0:
        dist_points = 30
        reasons.append(f"✓ Near requester ({dist:.1f} km away)")
    elif dist < 10.0:
        dist_points = 20
        reasons.append(f"✓ Moderately close ({dist:.1f} km away)")
    elif donor.city.lower() == request.city.lower():
        dist_points = 10
        reasons.append(f"✓ In the same city ({dist:.1f} km away)")
    else:
        dist_points = 0
        reasons.append(f"✓ Different city ({dist:.1f} km away)")
        
    # Reliability History score
    rel_points = int(donor.reliability_score * 0.20)
    if donor.reliability_score >= 80.0:
        reasons.append("✓ High historical reliability score")
        
    overall_score = comp_points + avail_points + dist_points + rel_points
    return min(overall_score, 100), reasons, dist

def send_alert_notification(recipient_type, contact, message):
    """
    Simulated Notification Service. Can integrate Twilio, Firebase, etc.
    """
    import logging
    logger = logging.getLogger(__name__)
    log_msg = f"[NOTIFICATION ABSTRACTION] To {recipient_type} ({contact}): {message}"
    logger.info(log_msg)
    print(log_msg)

def trigger_next_notification(blood_request):
    """
    Notifies the highest-ranked compatible donor who has not been notified yet.
    """
    notified_donor_ids = EmergencyNotification.objects.filter(
        blood_request=blood_request
    ).values_list('donor_id', flat=True)
    
    COMPATIBILITY = {
        "O-": ["O-"],
        "O+": ["O-", "O+"],
        "A-": ["O-", "A-"],
        "A+": ["O-", "O+", "A-", "A+"],
        "B-": ["O-", "B-"],
        "B+": ["O-", "O+", "B-", "B+"],
        "AB-": ["O-", "A-", "B-", "AB-"],
        "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    }
    
    compatible_groups = COMPATIBILITY.get(blood_request.blood_group, [])
    available_donors = Donor.objects.filter(
        blood_group__in=compatible_groups,
        available=True,
        city__iexact=blood_request.city
    ).exclude(id__in=notified_donor_ids)
    
    if not available_donors.exists():
        available_donors = Donor.objects.filter(
            blood_group__in=compatible_groups,
            available=True
        ).exclude(city__iexact=blood_request.city).exclude(id__in=notified_donor_ids)
    
    timestamp = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if not available_donors.exists():
        blood_request.timeline.append({
            "status": "Completed",
            "timestamp": timestamp,
            "message": "Notification queue depleted. No more compatible donors available anywhere."
        })
        blood_request.status = 'Rejected'
        blood_request.save()
        return
        
    # Rank donors
    ranked = []
    for donor in available_donors:
        score, reasons, dist = calculate_match_score(donor, blood_request)
        ranked.append((score, donor, reasons, dist))
        
    # Sort descending
    ranked.sort(key=lambda x: x[0], reverse=True)
    best_score, best_donor, _, _ = ranked[0]
    
    # Create pending notification
    notification = EmergencyNotification.objects.create(
        blood_request=blood_request,
        donor=best_donor,
        status='pending'
    )
    
    blood_request.timeline.append({
        "status": "Notification Sent",
        "timestamp": timestamp,
        "message": f"Notification Sent to {best_donor.name} (Ranked #1, Match: {best_score}%)."
    })
    blood_request.timeline.append({
        "status": "Waiting",
        "timestamp": timestamp,
        "message": "Waiting for Response..."
    })
    blood_request.status = 'Waiting'
    blood_request.save()
    
    send_alert_notification(
        recipient_type="donor",
        contact=best_donor.phone,
        message=f"Emergency blood request for patient {blood_request.patient_name} at {blood_request.hospital}. Match: {best_score}%."
    )

@api_view(['GET'])
def match_donors(request, request_id):
    """
    Ranks compatible donors with distance calculation and reasoning metrics.
    """
    try:
        blood_request = BloodRequest.objects.get(id=request_id)
    except BloodRequest.DoesNotExist:
        return Response({"error": "Blood request not found"}, status=404)
        
    urgency_timeout_map = {
        'Critical': 30,
        'High': 60,
        'Medium': 120,
        'Low': 300,
    }
    timeout_seconds = urgency_timeout_map.get(blood_request.urgency, 120)
    
    pending_notifications = EmergencyNotification.objects.filter(
        blood_request=blood_request, status='pending'
    )
    for notif in pending_notifications:
        if (timezone.now() - notif.sent_at).total_seconds() > timeout_seconds:
            notif.status = 'rejected'
            notif.save()
            blood_request.timeline.append({
                "status": "Timeout",
                "timestamp": timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"No response from {notif.donor.name} within {timeout_seconds}s. Escalating to next donor."
            })
            blood_request.save()
            trigger_next_notification(blood_request)
            
    blood_request.refresh_from_db()
        
    COMPATIBILITY = {
        "O-": ["O-"],
        "O+": ["O-", "O+"],
        "A-": ["O-", "A-"],
        "A+": ["O-", "O+", "A-", "A+"],
        "B-": ["O-", "B-"],
        "B+": ["O-", "O+", "B-", "B+"],
        "AB-": ["O-", "A-", "B-", "AB-"],
        "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    }
    
    active_notif = EmergencyNotification.objects.filter(
        blood_request=blood_request, status__in=['pending', 'accepted']
    ).first()
    
    matches_list = []
    fallback_used = False
    
    if active_notif:
        d = active_notif.donor
        score, reasons, dist = calculate_match_score(d, blood_request)
        if d.city.lower() != blood_request.city.lower():
            fallback_used = True
            
        matches_list.append({
            "id": d.id,
            "name": d.name,
            "blood_group": d.blood_group,
            "city": d.city,
            "phone": d.phone if active_notif.status == 'accepted' else None,
            "available": d.available,
            "distance": f"{dist:.1f} km",
            "compatibility_score": score,
            "why_donor": reasons,
            "reliability": f"{d.reliability_score}%",
            "is_notified": active_notif.status == 'pending',
            "status": active_notif.status
        })
    
    return Response({
        "request_id": blood_request.id,
        "patient_name": blood_request.patient_name,
        "status": blood_request.status,
        "timeline": blood_request.timeline,
        "matches": matches_list,
        "fallback_used": fallback_used
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_notification(request):
    """
    Finds active pending emergency notification for the logged-in donor user.
    """
    try:
        donor = request.user.donor_profile
    except AttributeError:
        return Response({"notification": None})
        
    notification = EmergencyNotification.objects.filter(donor=donor, status__in=['pending', 'accepted']).first()
    if not notification:
        return Response({"notification": None})
        
    req = notification.blood_request
    
    # Calculate mock coordinates and distance
    lat1, lon1 = get_coordinates(donor.city, donor.id)
    lat2, lon2 = get_coordinates(req.city, req.id)
    dist = haversine_distance(lat1, lon1, lat2, lon2)
    
    return Response({
        "notification": {
            "id": notification.id,
            "patient_name": req.patient_name,
            "blood_group": req.blood_group,
            "hospital": req.hospital,
            "city": req.city,
            "urgency": req.urgency,
            "distance": f"{dist:.1f} km",
            "contact_phone": req.contact_phone if notification.status == 'accepted' else None,
            "status": notification.status
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_history(request):
    """
    Retrieves notification history for the logged-in donor user.
    """
    try:
        donor = request.user.donor_profile
    except AttributeError:
        return Response([])
        
    notifications = EmergencyNotification.objects.filter(donor=donor).order_by('-sent_at')
    
    data = []
    for n in notifications:
        req = n.blood_request
        
        # Calculate distance
        lat1, lon1 = get_coordinates(donor.city, donor.id)
        lat2, lon2 = get_coordinates(req.city, req.id)
        dist = haversine_distance(lat1, lon1, lat2, lon2)
        
        data.append({
            "id": n.id,
            "patient_name": req.patient_name,
            "blood_group": req.blood_group,
            "hospital": req.hospital,
            "city": req.city,
            "urgency": req.urgency,
            "contact_phone": req.contact_phone if n.status == 'accepted' else None,
            "distance": f"{dist:.1f} km",
            "status": n.status,
            "sent_at": n.sent_at.strftime("%Y-%m-%d %H:%M:%S") if n.sent_at else None,
            "responded_at": n.responded_at.strftime("%Y-%m-%d %H:%M:%S") if n.responded_at else None,
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_notification(request, notification_id):
    """
    Handles donor response to pending notification (Accept or Reject).
    """
    status_response = request.data.get("status") # 'accepted' or 'rejected'
    if status_response not in ['accepted', 'rejected']:
        return Response({"error": "Invalid response status"}, status=400)
        
    try:
        notification = EmergencyNotification.objects.get(id=notification_id)
    except EmergencyNotification.DoesNotExist:
        return Response({"error": "Notification not found"}, status=404)
        
    try:
        donor_profile = request.user.donor_profile
    except AttributeError:
        return Response({"error": "User has no donor profile"}, status=403)
        
    if notification.donor != donor_profile:
        return Response({"error": "Unauthorized response to this notification"}, status=403)
        
    donor = notification.donor
    req = notification.blood_request
    
    notification.status = status_response
    notification.responded_at = timezone.now()
    notification.save()
    
    # Update Stats
    if status_response == 'accepted':
        donor.accepted_count += 1
    else:
        donor.rejected_count += 1
        
    total = donor.accepted_count + donor.rejected_count
    if total > 0:
        donor.reliability_score = round((donor.accepted_count / total) * 100, 1)
    donor.save()
    
    timestamp = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if status_response == 'accepted':
        req.status = 'Accepted'
        req.timeline.append({
            "status": "Accepted",
            "timestamp": timestamp,
            "message": f"Response received from {donor.name}: ACCEPTED."
        })
        req.timeline.append({
            "status": "Hospital Updated",
            "timestamp": timestamp,
            "message": f"Hospital {req.hospital} has been notified."
        })
        req.timeline.append({
            "status": "Completed",
            "timestamp": timestamp,
            "message": "Emergency successfully completed."
        })
        req.save()
        
        send_alert_notification(
            recipient_type="hospital",
            contact=req.hospital,
            message=f"Blood donor {donor.name} ({donor.blood_group}) accepted request for {req.patient_name}."
        )
    else:
        req.timeline.append({
            "status": "Rejected",
            "timestamp": timestamp,
            "message": f"Response received from {donor.name}: REJECTED."
        })
        req.save()
        
        # Trigger next ranked compatible donor
        trigger_next_notification(req)
        
    return Response({"success": True})


from django.db.models import F, Avg
from ai_intake.models import AIIntakeLog

@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    """
    Returns aggregated stats for the Coordinator Dashboard.
    """
    total_donors = Donor.objects.count()
    available_donors = Donor.objects.filter(available=True).count()
    
    total_requests = BloodRequest.objects.count()
    today_requests = BloodRequest.objects.filter(created_at__date=timezone.now().date()).count()
    successful_matches = BloodRequest.objects.filter(status__in=['Completed', 'Accepted']).count()
    
    notifications_sent = EmergencyNotification.objects.count()
    accepted_donors = EmergencyNotification.objects.filter(status='accepted').count()
    rejected_donors = EmergencyNotification.objects.filter(status='rejected').count()
    
    match_ratio = f"{int((successful_matches / total_requests) * 100)}%" if total_requests > 0 else "0%"
    lives_assisted = successful_matches * 3

    # Average Response Time
    avg_timedelta = EmergencyNotification.objects.filter(responded_at__isnull=False).aggregate(avg_diff=Avg(F('responded_at') - F('sent_at')))['avg_diff']
    if avg_timedelta:
        minutes = avg_timedelta.total_seconds() / 60
        avg_response_time = f"{round(minutes, 1)} min"
    else:
        avg_response_time = "-"

    # AI Confidence
    avg_conf = AIIntakeLog.objects.filter(confidence_score__isnull=False).aggregate(avg_conf=Avg('confidence_score'))['avg_conf']
    if avg_conf is not None:
        ai_confidence = f"{round(avg_conf * 100, 1)}%"
    else:
        ai_confidence = "-"

    return Response({
        "totalDonors": total_donors,
        "availableDonors": available_donors,
        "totalRequests": total_requests,
        "matchRatio": match_ratio,
        "todayRequests": today_requests,
        "notificationsSent": notifications_sent,
        "acceptedDonors": accepted_donors,
        "rejectedDonors": rejected_donors,
        "successfulMatches": successful_matches,
        "livesAssisted": lives_assisted,
        "avgResponseTime": avg_response_time,
        "aiConfidence": ai_confidence
    })

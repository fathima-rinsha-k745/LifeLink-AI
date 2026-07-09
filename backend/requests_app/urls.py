from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import BloodRequestViewSet, match_donors, pending_notification, respond_to_notification, notification_history, dashboard_stats

router = DefaultRouter()
router.register(r'requests', BloodRequestViewSet)

urlpatterns = router.urls + [
    path('match-donors/<int:request_id>/', match_donors),
    path('notifications/pending/', pending_notification),
    path('notifications/history/', notification_history),
    path('notifications/<int:notification_id>/respond/', respond_to_notification),
    path('dashboard/stats/', dashboard_stats),
]
from rest_framework.routers import DefaultRouter
from .views import BloodRequestViewSet
from django.urls import path
from .views import match_donors

router = DefaultRouter()
router.register(r'requests', BloodRequestViewSet)

urlpatterns = router.urls + [
    path('match-donors/<int:request_id>/', match_donors),
]
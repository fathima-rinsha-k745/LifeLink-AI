from django.urls import path
from .views import EmergencyAIIntakeView

urlpatterns = [
    path(
        "requests/ai-intake/",
        EmergencyAIIntakeView.as_view(),
        name="ai-intake"
    ),
]

from django.urls import path
from .views import EmergencyAIIntakeView, AIIntakeLogListView

urlpatterns = [
    path(
        "requests/ai-intake/",
        EmergencyAIIntakeView.as_view(),
        name="ai-intake"
    ),
    path(
        "ai-logs/",
        AIIntakeLogListView.as_view(),
        name="ai-logs"
    ),
]

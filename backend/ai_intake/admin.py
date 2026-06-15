from django.contrib import admin
from .models import AIIntakeLog


@admin.register(AIIntakeLog)
class AIIntakeLogAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "confidence_score", "blood_request", "created_at"]
    list_filter  = ["created_at"]
    search_fields = ["raw_input", "user__username"]
    readonly_fields = ["raw_input", "ai_output", "confidence_score", "created_at"]
    ordering = ["-created_at"]
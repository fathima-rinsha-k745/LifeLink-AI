import os
from django.conf import settings
from django.http import HttpResponse, Http404

def home(request):
    template_path = os.path.join(settings.BASE_DIR, 'templates', 'home.html')
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return HttpResponse(content, content_type='text/html')
    except FileNotFoundError:
        raise Http404("home.html not found. Please build the frontend first.")
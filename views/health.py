"""
Health / liveness endpoint for monitoring.

Poll every 1 minute (or as needed) to check that the DJNext Admin API is up.
No authentication required so load balancers and k8s can hit it.
"""

from django.http import JsonResponse
from django.utils import timezone
from django.views import View


class HealthView(View):
    """
    GET <mount>/api/health/ (e.g. /admin/api/health/)

    Returns:
        {"status": "ok", "timestamp": "2025-02-07T12:00:00Z"}
    """

    def get(self, request):
        return JsonResponse({
            'status': 'ok',
            'timestamp': timezone.now().isoformat(),
        })

"""
Webhook API views.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from volta.db.models import Webhook
from volta.api.serializers.webhook import (
    WebhookSerializer,
    WebhookCreateSerializer,
    WebhookListSerializer
)


class WebhookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Webhook CRUD operations.

    Supports:
    - List webhooks with filtering
    - Create new webhook (returns secret_key only on creation)
    - Retrieve webhook details (secret_key hidden)
    - Update webhook
    - Delete webhook
    """
    queryset = Webhook.objects.all()
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['active']
    ordering_fields = ['created_at', 'updated_at', 'last_triggered_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return WebhookListSerializer
        elif self.action == 'create':
            return WebhookCreateSerializer
        return WebhookSerializer

    def list(self, request, *args, **kwargs):
        """List webhooks with filtering."""
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single webhook."""
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Create a new webhook."""
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Update a webhook."""
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Partially update a webhook."""
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete a webhook."""
        return super().destroy(request, *args, **kwargs)


@api_view(['POST'])
def test_webhook(request, pk):
    """
    Test a webhook by sending a sample payload synchronously.

    Triggers the webhook with a test event to verify configuration
    and returns response details immediately.
    """
    import requests
    import time
    from django.utils import timezone

    try:
        webhook = Webhook.objects.get(pk=pk)
    except Webhook.DoesNotExist:
        return Response(
            {'error': 'Webhook not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Sample test payload
    test_payload = {
        'event': 'webhook.test',
        'timestamp': timezone.now().isoformat(),
        'data': {
            'message': 'This is a test webhook delivery',
            'webhook_id': webhook.id,
            'url': webhook.url
        }
    }

    # Prepare headers
    headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': 'webhook.test',
        'User-Agent': 'Volta-Webhook/1.0'
    }

    # Send test request synchronously and measure response time
    start_time = time.time()
    response_data = {
        'webhook_url': webhook.url,
        'status': 'failed',
        'status_code': None,
        'response_time_ms': None,
        'error': None
    }

    try:
        response = requests.post(
            webhook.url,
            json=test_payload,
            headers=headers,
            timeout=10
        )

        end_time = time.time()
        response_time_ms = int((end_time - start_time) * 1000)

        response_data['status_code'] = response.status_code
        response_data['response_time_ms'] = response_time_ms

        if response.status_code in [200, 201, 202, 204]:
            response_data['status'] = 'success'
            response_data['message'] = 'Webhook test successful'
        else:
            response_data['status'] = 'error'
            response_data['message'] = f'Webhook returned status {response.status_code}'

    except requests.exceptions.Timeout:
        end_time = time.time()
        response_data['response_time_ms'] = int((end_time - start_time) * 1000)
        response_data['status'] = 'error'
        response_data['error'] = 'Request timeout (>10s)'
        response_data['message'] = 'Webhook request timed out'

    except requests.exceptions.ConnectionError:
        end_time = time.time()
        response_data['response_time_ms'] = int((end_time - start_time) * 1000)
        response_data['status'] = 'error'
        response_data['error'] = 'Connection failed'
        response_data['message'] = 'Could not connect to webhook URL'

    except Exception as e:
        end_time = time.time()
        response_data['response_time_ms'] = int((end_time - start_time) * 1000)
        response_data['status'] = 'error'
        response_data['error'] = str(e)
        response_data['message'] = 'Webhook test failed'

    return Response(response_data, status=status.HTTP_200_OK)

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
from volta.bg_tasks.webhook_tasks import send_webhook_task


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


@api_view(['POST'])
def test_webhook(request, pk):
    """
    Test a webhook by sending a sample payload.

    Triggers the webhook with a test event to verify configuration.
    """
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
        'data': {
            'message': 'This is a test webhook delivery',
            'webhook_id': webhook.id,
            'url': webhook.url
        }
    }

    # Send webhook asynchronously
    task = send_webhook_task.delay(
        webhook_id=webhook.id,
        event='webhook.test',
        payload=test_payload
    )

    return Response({
        'message': 'Test webhook triggered successfully.',
        'task_id': str(task.id),
        'webhook_url': webhook.url
    }, status=status.HTTP_200_OK)

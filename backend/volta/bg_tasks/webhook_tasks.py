"""
Celery tasks for webhook delivery.
"""

import requests
import hmac
import hashlib
import json
from celery import shared_task
from django.utils import timezone

from volta.db.models import Webhook


@shared_task(bind=True, max_retries=3)
def send_webhook_task(self, webhook_id, event, payload):
    """
    Send webhook notification asynchronously.

    Args:
        webhook_id: ID of specific webhook (None to send to all matching webhooks)
        event: Event type (e.g., 'product.created', 'upload.completed')
        payload: Data to send in webhook
    """
    # Get webhooks to trigger
    if webhook_id:
        webhooks = Webhook.objects.filter(id=webhook_id, active=True)
    else:
        webhooks = Webhook.objects.filter(active=True, events__contains=[event])

    for webhook in webhooks:
        try:
            # Prepare payload
            webhook_payload = {
                'event': event,
                'timestamp': timezone.now().isoformat(),
                'data': payload
            }

            # Generate HMAC signature
            signature = _generate_signature(webhook.secret_key, webhook_payload)

            # Send POST request
            headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Event': event,
                'X-Webhook-Signature': signature,
                'User-Agent': 'Volta-Webhook/1.0'
            }

            response = requests.post(
                webhook.url,
                json=webhook_payload,
                headers=headers,
                timeout=10
            )

            # Update webhook status
            webhook.last_triggered_at = timezone.now()
            webhook.last_status_code = response.status_code

            if response.status_code in [200, 201, 202, 204]:
                # Success - reset failure count
                webhook.reset_failure_count()
            else:
                # HTTP error - increment failure
                webhook.increment_failure()

            webhook.save()

        except requests.exceptions.RequestException as e:
            # Network error - increment failure and retry
            webhook.increment_failure()

            # Retry with exponential backoff
            retry_delay = 2 ** self.request.retries  # 2, 4, 8 seconds
            raise self.retry(exc=e, countdown=retry_delay)

        except Exception as e:
            # Other errors - increment failure
            webhook.increment_failure()
            continue


def _generate_signature(secret_key, payload):
    """
    Generate HMAC SHA256 signature for webhook payload.

    Args:
        secret_key: Webhook secret key
        payload: Dictionary payload

    Returns:
        Hex digest of HMAC signature
    """
    payload_json = json.dumps(payload, sort_keys=True)
    signature = hmac.new(
        secret_key.encode('utf-8'),
        payload_json.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return signature

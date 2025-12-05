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

    if not webhooks.exists():
        return {
            'event': event,
            'webhooks_found': 0,
            'webhooks_sent': 0,
            'webhooks_failed': 0
        }

    results = {
        'event': event,
        'webhooks_found': webhooks.count(),
        'webhooks_sent': 0,
        'webhooks_failed': 0
    }

    for webhook in webhooks:
        try:
            # Prepare payload
            webhook_payload = {
                'event': event,
                'timestamp': timezone.now().isoformat(),
                'data': payload
            }

            # Generate HMAC signature (only if secret key is provided)
            signature = None
            if webhook.secret_key:
                signature = _generate_signature(webhook.secret_key, webhook_payload)

            # Send POST request
            headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Event': event,
                'User-Agent': 'Volta-Webhook/1.0'
            }

            if signature:
                headers['X-Webhook-Signature'] = signature

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
                results['webhooks_sent'] += 1
            else:
                # HTTP error - increment failure
                webhook.increment_failure()
                results['webhooks_failed'] += 1

            webhook.save()

        except requests.exceptions.RequestException:
            # Network error - increment failure
            webhook.increment_failure()
            webhook.save()
            results['webhooks_failed'] += 1
            # Continue with other webhooks instead of retrying the entire task
            continue

        except Exception:
            # Other errors - increment failure
            webhook.increment_failure()
            webhook.save()
            results['webhooks_failed'] += 1
            continue

    return results


def _generate_signature(secret_key, payload):
    """
    Generate HMAC SHA256 signature for webhook payload.

    Args:
        secret_key: Webhook secret key (must not be empty)
        payload: Dictionary payload

    Returns:
        Hex digest of HMAC signature
    """
    if not secret_key:
        raise ValueError("Secret key cannot be empty for signature generation")

    payload_json = json.dumps(payload, sort_keys=True)
    signature = hmac.new(
        secret_key.encode('utf-8'),
        payload_json.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return signature

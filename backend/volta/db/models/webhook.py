"""
Webhook model for webhook configuration and management.
"""

from django.db import models
import secrets


class Webhook(models.Model):
    """
    Webhook configuration for sending product events to external URLs.
    """
    EVENT_CHOICES = [
        ('product.created', 'Product Created'),
        ('product.updated', 'Product Updated'),
        ('product.deleted', 'Product Deleted'),
        ('upload.completed', 'Upload Completed'),
        ('upload.failed', 'Upload Failed'),
    ]

    url = models.URLField(max_length=500, help_text="Webhook endpoint URL")
    events = models.JSONField(
        default=list,
        help_text="List of events to trigger this webhook (e.g., ['product.created', 'upload.completed'])"
    )
    active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this webhook is active"
    )
    secret_key = models.CharField(
        max_length=64,
        blank=True,
        help_text="Secret key for HMAC signature verification"
    )
    retry_count = models.IntegerField(
        default=3,
        help_text="Number of retry attempts for failed deliveries"
    )
    failure_count = models.IntegerField(
        default=0,
        help_text="Consecutive failure count (auto-disables after threshold)"
    )
    last_triggered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this webhook was triggered"
    )
    last_status_code = models.IntegerField(
        null=True,
        blank=True,
        help_text="HTTP status code from last delivery attempt"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'webhooks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['active', '-created_at'], name='webhook_active_idx'),
        ]

    def __str__(self):
        return f"{self.url} - {', '.join(self.events)}"

    def save(self, *args, **kwargs):
        # Generate secret key if not provided
        is_new = self.pk is None
        key_generated = False
        
        if not self.secret_key:
            self.secret_key = secrets.token_urlsafe(32)
            key_generated = True
        
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)

    def should_auto_disable(self):
        """Check if webhook should be auto-disabled due to failures."""
        return self.failure_count >= 5

    def increment_failure(self):
        """Increment failure count and auto-disable if threshold reached."""
        old_failure_count = self.failure_count
        self.failure_count += 1
        
        if self.should_auto_disable():
            self.active = False
        
        self.save(update_fields=['failure_count', 'active'])

    def reset_failure_count(self):
        """Reset failure count after successful delivery."""
        self.failure_count = 0
        self.save(update_fields=['failure_count'])

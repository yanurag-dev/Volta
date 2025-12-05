"""
Webhook serializers for API.
"""

from rest_framework import serializers
from volta.db.models import Webhook


class WebhookSerializer(serializers.ModelSerializer):
    """Serializer for Webhook model (excludes secret_key for security)."""

    class Meta:
        model = Webhook
        fields = [
            'id',
            'url',
            'events',
            'active',
            'retry_count',
            'failure_count',
            'last_triggered_at',
            'last_status_code',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'failure_count',
            'last_triggered_at',
            'last_status_code',
            'created_at',
            'updated_at'
        ]

    def validate_events(self, value):
        """Validate that events list contains valid event names."""
        valid_events = [choice[0] for choice in Webhook.EVENT_CHOICES]

        if not value:
            raise serializers.ValidationError("At least one event must be specified.")

        invalid_events = [event for event in value if event not in valid_events]
        if invalid_events:
            raise serializers.ValidationError(
                f"Invalid events: {', '.join(invalid_events)}. "
                f"Valid events are: {', '.join(valid_events)}"
            )

        return value

    def validate_retry_count(self, value):
        """Validate retry count is within reasonable limits."""
        if value < 0:
            raise serializers.ValidationError("Retry count must be non-negative.")
        if value > 10:
            raise serializers.ValidationError("Retry count cannot exceed 10.")
        return value


class WebhookCreateSerializer(serializers.ModelSerializer):
    """Serializer for webhook creation (includes secret_key in response)."""

    class Meta:
        model = Webhook
        fields = [
            'id',
            'url',
            'events',
            'active',
            'secret_key',
            'retry_count',
            'created_at'
        ]
        read_only_fields = ['id', 'secret_key', 'created_at']

    def validate_events(self, value):
        """Validate that events list contains valid event names."""
        valid_events = [choice[0] for choice in Webhook.EVENT_CHOICES]

        if not value:
            raise serializers.ValidationError("At least one event must be specified.")

        invalid_events = [event for event in value if event not in valid_events]
        if invalid_events:
            raise serializers.ValidationError(
                f"Invalid events: {', '.join(invalid_events)}. "
                f"Valid events are: {', '.join(valid_events)}"
            )

        return value

    def validate_retry_count(self, value):
        """Validate retry count is within reasonable limits."""
        if value < 0:
            raise serializers.ValidationError("Retry count must be non-negative.")
        if value > 10:
            raise serializers.ValidationError("Retry count cannot exceed 10.")
        return value


class WebhookListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for webhook lists."""

    events_display = serializers.SerializerMethodField()

    class Meta:
        model = Webhook
        fields = [
            'id',
            'url',
            'events_display',
            'active',
            'failure_count',
            'last_triggered_at',
            'created_at'
        ]
        read_only_fields = fields

    def get_events_display(self, obj):
        """Return comma-separated list of events."""
        return ', '.join(obj.events) if obj.events else 'None'

"""
UploadTask serializers for API.
"""

from rest_framework import serializers
from volta.db.models import UploadTask


class UploadTaskSerializer(serializers.ModelSerializer):
    """Serializer for UploadTask model."""

    progress_percentage = serializers.ReadOnlyField()

    class Meta:
        model = UploadTask
        fields = [
            'id',
            'task_id',
            'filename',
            'total_rows',
            'processed_rows',
            'successful_rows',
            'failed_rows',
            'status',
            'progress_percentage',
            'error_message',
            'started_at',
            'completed_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'task_id',
            'total_rows',
            'processed_rows',
            'successful_rows',
            'failed_rows',
            'status',
            'error_message',
            'started_at',
            'completed_at',
            'created_at',
            'updated_at'
        ]


class UploadTaskListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for upload task lists."""

    progress_percentage = serializers.ReadOnlyField()

    class Meta:
        model = UploadTask
        fields = [
            'id',
            'task_id',
            'filename',
            'status',
            'progress_percentage',
            'created_at'
        ]
        read_only_fields = fields

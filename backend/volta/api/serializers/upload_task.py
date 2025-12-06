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
            'unique_products',
            'duplicate_rows',
            'processed_rows',
            'successful_rows',
            'failed_rows',
            'created_count',
            'updated_count',
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
            'filename',
            'total_rows',
            'unique_products',
            'duplicate_rows',
            'processed_rows',
            'successful_rows',
            'failed_rows',
            'created_count',
            'updated_count',
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
            'total_rows',
            'unique_products',
            'duplicate_rows',
            'processed_rows',
            'successful_rows',
            'failed_rows',
            'created_count',
            'updated_count',
            'status',
            'progress_percentage',
            'error_message',
            'created_at'
        ]
        read_only_fields = fields

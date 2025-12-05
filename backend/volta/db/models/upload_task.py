"""
UploadTask model for tracking CSV upload progress.
"""

from django.db import models
import uuid


class UploadTask(models.Model):
    """
    Tracks CSV upload tasks and their progress.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    task_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True,
        editable=False,
        help_text="Celery task ID"
    )
    filename = models.CharField(max_length=255)
    total_rows = models.IntegerField(default=0)
    processed_rows = models.IntegerField(default=0)
    successful_rows = models.IntegerField(default=0)
    failed_rows = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    error_message = models.TextField(blank=True, default='')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'upload_tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at'], name='status_created_idx'),
        ]

    def __str__(self):
        return f"{self.filename} - {self.status}"

    @property
    def progress_percentage(self):
        """Calculate upload progress percentage."""
        if self.total_rows == 0:
            return 0
        return round((self.processed_rows / self.total_rows) * 100, 2)

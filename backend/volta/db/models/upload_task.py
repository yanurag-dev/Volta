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
    
    # Row counts
    total_rows = models.IntegerField(default=0, help_text="Total rows in CSV file")
    unique_products = models.IntegerField(default=0, help_text="Unique products after deduplication")
    duplicate_rows = models.IntegerField(default=0, help_text="Duplicate rows removed")
    
    # Processing counts
    processed_rows = models.IntegerField(default=0, help_text="Products processed so far")
    successful_rows = models.IntegerField(default=0, help_text="Products successfully saved")
    failed_rows = models.IntegerField(default=0, help_text="Products that failed")
    
    # Create/Update breakdown
    created_count = models.IntegerField(default=0, help_text="New products created")
    updated_count = models.IntegerField(default=0, help_text="Existing products updated")
    
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
        """Calculate upload progress percentage based on unique products."""
        # Use unique_products if available, otherwise fall back to total_rows
        total = self.unique_products if self.unique_products > 0 else self.total_rows
        if total == 0:
            return 0
        return round((self.processed_rows / total) * 100, 2)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)

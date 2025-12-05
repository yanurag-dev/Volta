"""
Django admin configuration for Volta models.
"""

from django.contrib import admin
from .models import Product, UploadTask, Webhook


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin interface for Product model."""

    list_display = ['sku', 'name', 'active', 'created_at', 'updated_at']
    list_filter = ['active', 'created_at']
    search_fields = ['sku', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 100

    fieldsets = (
        ('Product Information', {
            'fields': ('sku', 'name', 'description')
        }),
        ('Status', {
            'fields': ('active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        """Save product in admin."""
        super().save_model(request, obj, form, change)

    def delete_model(self, request, obj):
        """Delete product in admin."""
        super().delete_model(request, obj)


@admin.register(UploadTask)
class UploadTaskAdmin(admin.ModelAdmin):
    """Admin interface for UploadTask model."""

    list_display = [
        'task_id',
        'filename',
        'status',
        'progress_display',
        'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['task_id', 'filename']
    readonly_fields = [
        'task_id',
        'total_rows',
        'processed_rows',
        'successful_rows',
        'failed_rows',
        'progress_display',
        'created_at',
        'updated_at',
        'started_at',
        'completed_at'
    ]

    fieldsets = (
        ('Task Information', {
            'fields': ('task_id', 'filename', 'status')
        }),
        ('Progress', {
            'fields': (
                'total_rows',
                'processed_rows',
                'successful_rows',
                'failed_rows',
                'progress_display'
            )
        }),
        ('Error Information', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'started_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )

    def progress_display(self, obj):
        """Display progress as percentage."""
        return f"{obj.progress_percentage}%"
    progress_display.short_description = 'Progress'

    def save_model(self, request, obj, form, change):
        """Save upload task in admin."""
        super().save_model(request, obj, form, change)

    def delete_model(self, request, obj):
        """Delete upload task in admin."""
        super().delete_model(request, obj)


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    """Admin interface for Webhook model."""

    list_display = [
        'url',
        'events_display',
        'active',
        'failure_count',
        'last_triggered_at'
    ]
    list_filter = ['active', 'created_at']
    search_fields = ['url']
    readonly_fields = [
        'secret_key',
        'failure_count',
        'last_triggered_at',
        'last_status_code',
        'created_at',
        'updated_at'
    ]

    fieldsets = (
        ('Webhook Configuration', {
            'fields': ('url', 'events', 'active')
        }),
        ('Security', {
            'fields': ('secret_key', 'retry_count')
        }),
        ('Status', {
            'fields': (
                'failure_count',
                'last_triggered_at',
                'last_status_code'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def events_display(self, obj):
        """Display events as comma-separated string."""
        return ', '.join(obj.events) if obj.events else 'None'
    events_display.short_description = 'Events'

    def save_model(self, request, obj, form, change):
        """Save webhook in admin."""
        super().save_model(request, obj, form, change)

    def delete_model(self, request, obj):
        """Delete webhook in admin."""
        super().delete_model(request, obj)

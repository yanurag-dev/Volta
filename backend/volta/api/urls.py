"""
API URL configuration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import products, uploads, webhooks

# Create router for ViewSets
router = DefaultRouter()
router.register(r'products', products.ProductViewSet, basename='product')
router.register(r'webhooks', webhooks.WebhookViewSet, basename='webhook')

urlpatterns = [
    # Router URLs (products and webhooks CRUD)
    path('', include(router.urls)),

    # Upload endpoints
    path('upload/', uploads.upload_csv, name='upload-csv'),
    path('upload/<uuid:task_id>/', uploads.upload_status, name='upload-status'),
    path('upload/<uuid:task_id>/stream/', uploads.upload_progress_stream, name='upload-progress-stream'),
    path('upload/history/', uploads.upload_history, name='upload-history'),

    # Bulk operations
    path('products/bulk-delete/', products.bulk_delete_products, name='bulk-delete-products'),

    # Webhook test endpoint
    path('webhooks/<int:pk>/test/', webhooks.test_webhook, name='test-webhook'),
]

"""
Tests for API endpoints.
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from volta.db.models import Product, Webhook, UploadTask
import uuid


class ProductAPITest(TestCase):
    """Test Product API endpoints."""

    def setUp(self):
        """Set up test client and data."""
        self.client = APIClient()
        self.product_data = {
            'sku': 'TEST-001',
            'name': 'Test Product',
            'description': 'Test description',
            'active': True
        }

    def test_create_product(self):
        """Test creating a product via API."""
        url = reverse('product-list')
        response = self.client.post(url, self.product_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 1)
        self.assertEqual(Product.objects.get().sku, 'TEST-001')

    def test_list_products(self):
        """Test listing products."""
        Product.objects.create(**self.product_data)
        Product.objects.create(sku='TEST-002', name='Product 2')

        url = reverse('product-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_retrieve_product(self):
        """Test retrieving a single product."""
        product = Product.objects.create(**self.product_data)
        url = reverse('product-detail', args=[product.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['sku'], 'TEST-001')

    def test_update_product(self):
        """Test updating a product."""
        product = Product.objects.create(**self.product_data)
        url = reverse('product-detail', args=[product.id])

        update_data = {
            'sku': 'TEST-001',
            'name': 'Updated Product',
            'description': 'Updated description',
            'active': False
        }
        response = self.client.put(url, update_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.name, 'Updated Product')
        self.assertFalse(product.active)

    def test_delete_product(self):
        """Test deleting a product."""
        product = Product.objects.create(**self.product_data)
        url = reverse('product-detail', args=[product.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Product.objects.count(), 0)

    def test_search_products(self):
        """Test searching products."""
        Product.objects.create(sku='LAPTOP-001', name='Dell Laptop')
        Product.objects.create(sku='MOUSE-001', name='Logitech Mouse')

        url = reverse('product-list')
        response = self.client.get(url, {'search': 'laptop'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIn('Laptop', response.data['results'][0]['name'])

    def test_filter_products_by_active(self):
        """Test filtering products by active status."""
        Product.objects.create(sku='ACTIVE-001', name='Active Product', active=True)
        Product.objects.create(sku='INACTIVE-001', name='Inactive Product', active=False)

        url = reverse('product-list')
        response = self.client.get(url, {'active': 'true'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertTrue(response.data['results'][0]['active'])

    def test_duplicate_sku_validation(self):
        """Test that duplicate SKU is rejected."""
        Product.objects.create(**self.product_data)

        url = reverse('product-list')
        response = self.client.post(url, self.product_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sku', response.data)


class BulkDeleteAPITest(TestCase):
    """Test bulk delete endpoint."""

    def setUp(self):
        """Set up test client and data."""
        self.client = APIClient()

    def test_bulk_delete_products(self):
        """Test bulk deleting all products."""
        # Create some products
        Product.objects.create(sku='TEST-001', name='Product 1')
        Product.objects.create(sku='TEST-002', name='Product 2')
        Product.objects.create(sku='TEST-003', name='Product 3')

        self.assertEqual(Product.objects.count(), 3)

        url = reverse('bulk-delete-products')
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(response.data['deleted_count'], 3)


class WebhookAPITest(TestCase):
    """Test Webhook API endpoints."""

    def setUp(self):
        """Set up test client and data."""
        self.client = APIClient()
        self.webhook_data = {
            'url': 'https://example.com/webhook',
            'events': ['product.created', 'upload.completed'],
            'active': True,
            'retry_count': 3
        }

    def test_create_webhook(self):
        """Test creating a webhook (secret_key only returned on creation)."""
        url = reverse('webhook-list')
        response = self.client.post(url, self.webhook_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Webhook.objects.count(), 1)
        # Secret key should be included in create response
        self.assertIsNotNone(response.data['secret_key'])
        self.assertGreater(len(response.data['secret_key']), 20)

    def test_list_webhooks(self):
        """Test listing webhooks (secret_key should be hidden)."""
        Webhook.objects.create(**self.webhook_data)

        url = reverse('webhook-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        # Secret key should NOT be in list response
        self.assertNotIn('secret_key', response.data['results'][0])

    def test_retrieve_webhook_hides_secret(self):
        """Test retrieving webhook detail (secret_key should be hidden)."""
        webhook = Webhook.objects.create(**self.webhook_data)
        url = reverse('webhook-detail', args=[webhook.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Secret key should NOT be in retrieve response
        self.assertNotIn('secret_key', response.data)

    def test_update_webhook(self):
        """Test updating a webhook."""
        webhook = Webhook.objects.create(**self.webhook_data)
        url = reverse('webhook-detail', args=[webhook.id])

        update_data = {
            'url': 'https://new-url.com/webhook',
            'events': ['product.updated'],
            'active': False,
            'retry_count': 5
        }
        response = self.client.put(url, update_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        webhook.refresh_from_db()
        self.assertEqual(webhook.url, 'https://new-url.com/webhook')
        self.assertFalse(webhook.active)

    def test_webhook_event_validation(self):
        """Test that invalid events are rejected."""
        url = reverse('webhook-list')
        invalid_data = {
            'url': 'https://example.com/webhook',
            'events': ['invalid.event'],
            'active': True
        }
        response = self.client.post(url, invalid_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('events', response.data)


class UploadAPITest(TestCase):
    """Test Upload API endpoints."""

    def setUp(self):
        """Set up test client."""
        self.client = APIClient()

    def test_upload_status(self):
        """Test retrieving upload status."""
        task = UploadTask.objects.create(
            filename='test.csv',
            total_rows=1000,
            processed_rows=500,
            status='processing'
        )

        url = reverse('upload-status', args=[task.task_id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['filename'], 'test.csv')
        self.assertEqual(response.data['status'], 'processing')
        self.assertEqual(response.data['progress_percentage'], 50.0)

    def test_upload_status_not_found(self):
        """Test upload status with invalid task ID."""
        fake_uuid = uuid.uuid4()
        url = reverse('upload-status', args=[fake_uuid])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_upload_history(self):
        """Test retrieving upload history."""
        UploadTask.objects.create(filename='file1.csv', status='completed')
        UploadTask.objects.create(filename='file2.csv', status='processing')

        url = reverse('upload-history')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

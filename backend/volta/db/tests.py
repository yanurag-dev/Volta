"""
Tests for database models.
"""

from django.test import TestCase
from volta.db.models import Product, UploadTask, Webhook


class ProductModelTest(TestCase):
    """Test Product model."""

    def test_create_product(self):
        """Test creating a product."""
        product = Product.objects.create(
            sku='TEST-001',
            name='Test Product',
            description='Test description',
            active=True
        )
        self.assertEqual(product.sku, 'TEST-001')
        self.assertEqual(product.name, 'Test Product')
        self.assertTrue(product.active)

    def test_sku_case_insensitive_uniqueness(self):
        """Test that SKU is case-insensitive unique."""
        Product.objects.create(sku='test-001', name='Product 1')

        # Try to create with different case - should fail
        with self.assertRaises(Exception):
            Product.objects.create(sku='TEST-001', name='Product 2')

    def test_sku_whitespace_stripping(self):
        """Test that SKU whitespace is stripped."""
        product = Product.objects.create(
            sku='  TRIM-001  ',
            name='Trimmed Product'
        )
        self.assertEqual(product.sku, 'TRIM-001')


class UploadTaskModelTest(TestCase):
    """Test UploadTask model."""

    def test_create_upload_task(self):
        """Test creating an upload task."""
        task = UploadTask.objects.create(
            filename='test.csv',
            total_rows=1000,
            status='pending'
        )
        self.assertEqual(task.filename, 'test.csv')
        self.assertEqual(task.status, 'pending')
        self.assertIsNotNone(task.task_id)

    def test_progress_percentage_calculation(self):
        """Test progress percentage calculation."""
        task = UploadTask.objects.create(
            filename='test.csv',
            total_rows=1000,
            processed_rows=250
        )
        self.assertEqual(task.progress_percentage, 25.0)


class WebhookModelTest(TestCase):
    """Test Webhook model."""

    def test_create_webhook(self):
        """Test creating a webhook."""
        webhook = Webhook.objects.create(
            url='https://example.com/webhook',
            events=['product.created', 'upload.completed'],
            active=True
        )
        self.assertEqual(webhook.url, 'https://example.com/webhook')
        self.assertTrue(webhook.active)
        self.assertIn('product.created', webhook.events)

    def test_secret_key_auto_generation(self):
        """Test that secret key is auto-generated."""
        webhook = Webhook.objects.create(
            url='https://example.com/webhook',
            events=['product.created']
        )
        self.assertIsNotNone(webhook.secret_key)
        self.assertGreater(len(webhook.secret_key), 20)

    def test_should_auto_disable(self):
        """Test auto-disable logic after failures."""
        webhook = Webhook.objects.create(
            url='https://example.com/webhook',
            events=['product.created'],
            failure_count=5
        )
        self.assertTrue(webhook.should_auto_disable())

    def test_increment_failure(self):
        """Test incrementing failure count."""
        webhook = Webhook.objects.create(
            url='https://example.com/webhook',
            events=['product.created'],
            active=True
        )

        # Increment failures
        for _ in range(5):
            webhook.increment_failure()

        webhook.refresh_from_db()
        self.assertFalse(webhook.active)
        self.assertEqual(webhook.failure_count, 5)

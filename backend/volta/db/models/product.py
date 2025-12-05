"""
Product model with optimized indexes for scalability.
"""

from django.db import models
from django.db.models.functions import Lower


class Product(models.Model):
    """
    Product model with case-insensitive unique SKU.
    Supports 500k+ products with optimized indexes.
    """
    sku = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Stock Keeping Unit - unique product identifier (case-insensitive)"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether the product is currently active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']
        indexes = [
            # Composite index for common queries (active products by name)
            models.Index(fields=['active', 'name'], name='active_name_idx'),
            # Case-insensitive SKU index for fast lookups
            models.Index(Lower('sku'), name='sku_lower_idx'),
        ]
        constraints = [
            # Ensure SKU is unique (case-insensitive)
            models.UniqueConstraint(
                Lower('sku'),
                name='unique_sku_lower'
            )
        ]

    def __str__(self):
        return f"{self.sku} - {self.name}"

    def save(self, *args, **kwargs):
        # Strip whitespace from SKU
        if self.sku:
            self.sku = self.sku.strip()
        super().save(*args, **kwargs)

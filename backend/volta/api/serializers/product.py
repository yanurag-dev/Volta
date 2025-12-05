"""
Product serializers for API.
"""

from rest_framework import serializers
from volta.db.models import Product


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model."""

    class Meta:
        model = Product
        fields = [
            'id',
            'sku',
            'name',
            'description',
            'active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_sku(self, value):
        """Validate SKU uniqueness (case-insensitive)."""
        value = value.strip()

        # Check if SKU already exists (case-insensitive)
        existing = Product.objects.filter(sku__iexact=value)

        # Exclude current instance during update
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)

        if existing.exists():
            raise serializers.ValidationError(
                f"Product with SKU '{value}' already exists (case-insensitive)."
            )

        return value


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product lists."""

    class Meta:
        model = Product
        fields = ['id', 'sku', 'name', 'active', 'created_at']
        read_only_fields = ['id', 'created_at']

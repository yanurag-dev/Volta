"""
Product API views.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from volta.db.models import Product
from volta.api.serializers.product import ProductSerializer, ProductListSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations.

    Supports:
    - List with pagination, filtering, and search
    - Create new product
    - Retrieve product details
    - Update product
    - Delete product
    """
    queryset = Product.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['active', 'sku']
    search_fields = ['sku', 'name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'name', 'sku']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Use lightweight serializer for list action."""
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer

    def list(self, request, *args, **kwargs):
        """List products with filtering and pagination."""
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single product."""
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Create a new product."""
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Update a product."""
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Partially update a product."""
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete a product."""
        return super().destroy(request, *args, **kwargs)


@api_view(['DELETE'])
def bulk_delete_products(request):
    """
    Bulk delete all products.

    This endpoint deletes ALL products in the database.
    Should be protected with confirmation in the frontend.
    """
    try:
        # delete() returns a tuple: (total_deleted, {model: count})
        deleted_info = Product.objects.all().delete()
        deleted_count = deleted_info[0]

        return Response({
            'message': f'Successfully deleted {deleted_count} products.',
            'deleted_count': deleted_count
        }, status=status.HTTP_200_OK)
    except Exception:
        raise

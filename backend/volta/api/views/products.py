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


@api_view(['DELETE'])
def bulk_delete_products(request):
    """
    Bulk delete all products.

    This endpoint deletes ALL products in the database.
    Should be protected with confirmation in the frontend.
    """
    count = Product.objects.count()
    Product.objects.all().delete()

    return Response({
        'message': f'Successfully deleted {count} products.',
        'deleted_count': count
    }, status=status.HTTP_200_OK)

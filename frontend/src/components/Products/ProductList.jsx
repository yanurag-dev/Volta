import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProducts, deleteProduct } from '../../services/products';
import { Pagination } from '../common/Pagination';
import { useToast } from '../../context/ToastContext';

export function ProductList({ filters, onEdit }) {
  // Create stable filter key for tracking changes
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Use filterKey as part of state key to auto-reset page when filters change
  const [pageState, setPageState] = useState({ filterKey, page: 1 });

  // If filters changed, reset to page 1
  const currentPage = pageState.filterKey === filterKey ? pageState.page : 1;

  // Update page state
  const setCurrentPage = (page) => {
    setPageState({ filterKey, page });
  };

  const pageSize = 20;
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', { ...filters, page: currentPage, page_size: pageSize }],
    queryFn: () => fetchProducts({ ...filters, page: currentPage, page_size: pageSize }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showSuccess('Product deleted successfully');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete product';
      showError(errorMessage);
    },
  });

  const handleEdit = (product) => {
    if (onEdit) {
      onEdit(product);
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateValue) => {
    try {
      if (!dateValue) {
        return 'N/A';
      }
      const timestamp = Date.parse(dateValue);
      if (!Number.isFinite(timestamp) || isNaN(timestamp)) {
        return 'N/A';
      }
      const date = new Date(dateValue);
      return date.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-red-600">Failed to load products: {error.message}</p>
      </div>
    );
  }

  const products = data?.results || [];
  const totalPages = data?.count ? Math.ceil(data.count / pageSize) : 0;

  if (products.length === 0) {
    return (
      <div className="text-center py-12 card">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="mt-4 text-gray-600">No products found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {products.map((product) => (
          <div key={product.id} className="card hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {product.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mt-1">SKU: {product.sku}</p>

                {product.description && (
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                    {product.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span>Created: {formatDate(product.created_at)}</span>
                  <span>Updated: {formatDate(product.updated_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  type="button"
                  onClick={() => handleEdit(product)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors"
                  title="Edit product"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete product"
                >
                  {deleteMutation.isPending ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

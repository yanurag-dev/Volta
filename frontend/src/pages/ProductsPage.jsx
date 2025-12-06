import { useState } from 'react';
import { ProductFilters } from '../components/Products/ProductFilters';
import { ProductList } from '../components/Products/ProductList';
import { ProductForm } from '../components/Products/ProductForm';
import { BulkDeleteButton } from '../components/Products/BulkDeleteButton';
import { Modal } from '../components/common/Modal';

export function ProductsPage() {
  const [filters, setFilters] = useState({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
  };

  const handleEditSuccess = () => {
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your product catalog</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Product
          </button>
          <BulkDeleteButton />
        </div>
      </div>

      <div className="space-y-6">
        <ProductFilters onFilterChange={setFilters} />
        <ProductList filters={filters} onEdit={handleEdit} />
      </div>

      {/* Create Product Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Product"
      >
        <ProductForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title="Edit Product"
      >
        <ProductForm
          product={editingProduct}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingProduct(null)}
        />
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct, updateProduct } from '../../services/products';
import { useToast } from '../../hooks/useToast';

export function ProductForm({ product, onSuccess, onCancel }) {
  const isEditing = !!product;
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    description: product?.description || '',
    active: product?.active !== undefined ? product.active : true,
  });

  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: isEditing
      ? (data) => updateProduct(product.id, data)
      : createProduct,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const message = isEditing
        ? `Product "${data.name}" updated successfully`
        : `Product "${data.name}" created successfully`;
      showSuccess(message);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      const apiErrors = error.response?.data || {};
      setErrors(apiErrors);

      // Show toast for general errors
      if (apiErrors.non_field_errors) {
        showError(apiErrors.non_field_errors);
      } else if (!Object.keys(apiErrors).length) {
        const errorMessage = error.message || `Failed to ${isEditing ? 'update' : 'create'} product`;
        showError(errorMessage);
      }
    },
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
          SKU <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="sku"
          name="sku"
          value={formData.sku}
          onChange={handleChange}
          disabled={isEditing} // SKU cannot be changed when editing
          required
          className={`input ${errors.sku ? 'border-red-500' : ''}`}
          placeholder="e.g., PROD-001"
        />
        {errors.sku && (
          <p className="mt-1 text-sm text-red-600">
            {Array.isArray(errors.sku) ? errors.sku.join(', ') : errors.sku}
          </p>
        )}
        {isEditing && (
          <p className="mt-1 text-xs text-gray-500">SKU cannot be modified</p>
        )}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className={`input ${errors.name ? 'border-red-500' : ''}`}
          placeholder="e.g., Sample Product"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">
            {Array.isArray(errors.name) ? errors.name.join(', ') : errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className={`input ${errors.description ? 'border-red-500' : ''}`}
          placeholder="Enter product description..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {Array.isArray(errors.description) ? errors.description.join(', ') : errors.description}
          </p>
        )}
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="active"
          name="active"
          checked={formData.active}
          onChange={handleChange}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
          Active Product
        </label>
      </div>

      {errors.non_field_errors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{errors.non_field_errors}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={mutation.isPending}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn btn-primary"
        >
          {mutation.isPending
            ? (isEditing ? 'Updating...' : 'Creating...')
            : (isEditing ? 'Update Product' : 'Create Product')}
        </button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkDeleteProducts } from '../../services/products';
import { useToast } from '../../context/ToastContext';

export function BulkDeleteButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const deleteMutation = useMutation({
    mutationFn: bulkDeleteProducts,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowConfirm(false);
      setConfirmText('');
      const count = data?.deleted_count || 0;
      showSuccess(`Successfully deleted ${count} product${count !== 1 ? 's' : ''}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete products';
      showError(errorMessage);
    },
  });

  const handleDelete = () => {
    if (confirmText === 'DELETE ALL') {
      deleteMutation.mutate();
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="btn btn-danger"
      >
        Delete All Products
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Delete All Products</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-3">
            This will permanently delete all products from the database. To confirm, please type{' '}
            <strong>DELETE ALL</strong> below:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE ALL"
            className="input"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE ALL' || deleteMutation.isPending}
            className="flex-1 btn btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </span>
            ) : (
              'Delete All Products'
            )}
          </button>
          <button
            onClick={() => {
              setShowConfirm(false);
              setConfirmText('');
            }}
            disabled={deleteMutation.isPending}
            className="flex-1 btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWebhook, updateWebhook } from '../../services/webhooks';
import { useToast } from '../../hooks/useToast';

const AVAILABLE_EVENTS = [
  'product.created',
  'product.updated',
  'product.deleted',
  'upload.completed',
];

export function WebhookForm({ webhook, onSuccess, onCancel }) {
  const isEditing = !!webhook;
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    url: webhook?.url || '',
    events: webhook?.events || [],
    retry_count: webhook?.retry_count || 3,
    active: webhook?.active !== undefined ? webhook.active : true,
  });

  const mutation = useMutation({
    mutationFn: isEditing
      ? (data) => updateWebhook(webhook.id, data)
      : createWebhook,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      const message = isEditing
        ? 'Webhook updated successfully'
        : `Webhook created successfully${data.secret_key ? '. Secret key: ' + data.secret_key : ''}`;
      showSuccess(message, isEditing ? 5000 : 10000);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save webhook';
      showError(errorMessage);
    },
  });

  const handleEventToggle = (event) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event]
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.url || formData.events.length === 0) {
      showError('Please provide a URL and select at least one event');
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
          Webhook URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          id="url"
          name="url"
          value={formData.url}
          onChange={handleChange}
          placeholder="https://example.com/webhook"
          className="input"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Events <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {AVAILABLE_EVENTS.map((event) => (
            <label key={event} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.events.includes(event)}
                onChange={() => handleEventToggle(event)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{event}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="retry_count" className="block text-sm font-medium text-gray-700 mb-1">
          Retry Count
        </label>
        <input
          type="number"
          id="retry_count"
          name="retry_count"
          value={formData.retry_count}
          onChange={handleChange}
          min="0"
          max="10"
          className="input"
        />
        <p className="mt-1 text-xs text-gray-500">Number of retries on failure (0-10)</p>
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
          Active Webhook
        </label>
      </div>

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
          disabled={mutation.isPending || !formData.url || formData.events.length === 0}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending
            ? (isEditing ? 'Updating...' : 'Creating...')
            : (isEditing ? 'Update Webhook' : 'Create Webhook')}
        </button>
      </div>
    </form>
  );
}

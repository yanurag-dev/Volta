import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWebhook } from '../../services/webhooks';

const AVAILABLE_EVENTS = [
  'product.created',
  'product.updated',
  'product.deleted',
  'upload.completed',
];

export function WebhookForm() {
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [secretKey, setSecretKey] = useState('');
  const [retryCount, setRetryCount] = useState(3);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setUrl('');
      setSelectedEvents([]);
      setSecretKey('');
      setRetryCount(3);
    },
  });

  const handleEventToggle = (event) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!url || selectedEvents.length === 0) {
      return;
    }

    createMutation.mutate({
      url,
      events: selectedEvents,
      secret_key: secretKey,
      retry_count: retryCount,
      active: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Create Webhook</h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL *
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Events * (select at least one)
          </label>
          <div className="space-y-2">
            {AVAILABLE_EVENTS.map((event) => (
              <label key={event} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event)}
                  onChange={() => handleEventToggle(event)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{event}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700 mb-1">
            Secret Key (optional)
          </label>
          <input
            type="password"
            id="secretKey"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="For HMAC signature verification"
            className="input"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="retryCount" className="block text-sm font-medium text-gray-700 mb-1">
            Retry Count
          </label>
          <input
            type="number"
            id="retryCount"
            value={retryCount}
            onChange={(e) => setRetryCount(Number(e.target.value))}
            min="0"
            max="10"
            className="input"
          />
          <p className="mt-1 text-xs text-gray-500">Number of retries on failure (0-10)</p>
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending || !url || selectedEvents.length === 0}
          className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Webhook'}
        </button>

        {createMutation.isError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
            {(() => {
              const error = createMutation.error;

              // Extract error message from various possible locations
              let errorMessage = error?.response?.data?.message
                || error?.response?.data?.error
                || error?.message;

              // Handle validation errors (object of field errors)
              if (error?.response?.data?.errors && typeof error.response.data.errors === 'object') {
                const validationErrors = Object.entries(error.response.data.errors)
                  .map(([field, messages]) => {
                    const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
                    const errorMessages = Array.isArray(messages) ? messages.join(', ') : messages;
                    return `${fieldName}: ${errorMessages}`;
                  })
                  .join('. ');
                errorMessage = validationErrors;
              }

              // Map common server messages to user-friendly text
              if (errorMessage?.includes('url') && errorMessage?.includes('invalid')) {
                errorMessage = 'Please provide a valid webhook URL.';
              } else if (errorMessage?.includes('events') && errorMessage?.includes('required')) {
                errorMessage = 'Please select at least one event.';
              } else if (errorMessage?.includes('already exists')) {
                errorMessage = 'A webhook with this URL already exists.';
              } else if (errorMessage?.includes('network') || errorMessage?.includes('Network')) {
                errorMessage = 'Network error. Please check your connection and try again.';
              }

              // Fallback message if no specific error available
              return errorMessage || 'Failed to create webhook. Please try again.';
            })()}
          </div>
        )}

        {createMutation.isSuccess && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
            Webhook created successfully!
          </div>
        )}
      </div>
    </form>
  );
}

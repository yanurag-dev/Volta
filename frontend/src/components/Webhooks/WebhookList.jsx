import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWebhooks, deleteWebhook, testWebhook } from '../../services/webhooks';

export function WebhookList() {
  const queryClient = useQueryClient();
  const [testStates, setTestStates] = useState({});

  const { data: webhooks, isLoading, error } = useQuery({
    queryKey: ['webhooks'],
    queryFn: fetchWebhooks,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: testWebhook,
    onMutate: (webhookId) => {
      setTestStates((prev) => ({
        ...prev,
        [webhookId]: { status: 'pending', message: 'Testing webhook...' },
      }));
    },
    onSuccess: (data, webhookId) => {
      setTestStates((prev) => ({
        ...prev,
        [webhookId]: { status: 'success', message: 'Webhook test successful' },
      }));
    },
    onError: (error, webhookId) => {
      setTestStates((prev) => ({
        ...prev,
        [webhookId]: { status: 'error', message: error.message || 'Webhook test failed' },
      }));
    },
    onSettled: (data, error, webhookId) => {
      setTimeout(() => {
        setTestStates((prev) => {
          const newStates = { ...prev };
          delete newStates[webhookId];
          return newStates;
        });
      }, 3000);
    },
  });

  const handleDelete = (id, url) => {
    if (window.confirm(`Delete webhook for ${url}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleTest = (id) => {
    testMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-red-600">Failed to load webhooks</p>
      </div>
    );
  }

  if (!webhooks || webhooks.length === 0) {
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <p className="mt-4 text-gray-600">No webhooks configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {webhooks.map((webhook) => (
        <div key={webhook.id} className="card hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-mono text-gray-900 break-all">{webhook.url}</h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    webhook.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {webhook.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {webhook.events.map((event) => (
                  <span
                    key={event}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-primary-100 text-primary-800"
                  >
                    {event}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Retries: {webhook.retry_count}</span>
                <span>Failures: {webhook.failure_count}</span>
                {webhook.last_triggered_at && (
                  <span>Last triggered: {new Date(webhook.last_triggered_at).toLocaleString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => handleTest(webhook.id)}
                disabled={testStates[webhook.id]?.status === 'pending'}
                className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50"
              >
                {testStates[webhook.id]?.status === 'pending' ? 'Testing...' : 'Test'}
              </button>

              <button
                onClick={() => handleDelete(webhook.id, webhook.url)}
                disabled={deleteMutation.isPending}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          {testStates[webhook.id]?.status === 'pending' && (
            <div className="mt-3 text-sm text-blue-600">
              {testStates[webhook.id].message}
            </div>
          )}

          {testStates[webhook.id]?.status === 'success' && (
            <div className="mt-3 text-sm text-green-600 bg-green-50 p-2 rounded">
              {testStates[webhook.id].message}
            </div>
          )}

          {testStates[webhook.id]?.status === 'error' && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
              {testStates[webhook.id].message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

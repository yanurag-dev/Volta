import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWebhooks, deleteWebhook, testWebhook, partialUpdateWebhook } from '../../services/webhooks';
import { useToast } from '../../hooks/useToast';

export function WebhookList({ onEdit }) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [testStates, setTestStates] = useState({});

  const { data: webhooks, isLoading, error } = useQuery({
    queryKey: ['webhooks'],
    queryFn: fetchWebhooks,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      showSuccess('Webhook deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete webhook');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => partialUpdateWebhook(id, { active }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      showSuccess(`Webhook ${data.active ? 'enabled' : 'disabled'} successfully`);
    },
    onError: (error) => {
      showError(error.message || 'Failed to toggle webhook');
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
      const message = data.status === 'success'
        ? `✓ ${data.message} (${data.status_code}, ${data.response_time_ms}ms)`
        : `✗ ${data.message}${data.error ? ': ' + data.error : ''}`;

      setTestStates((prev) => ({
        ...prev,
        [webhookId]: {
          status: data.status,
          message,
          status_code: data.status_code,
          response_time_ms: data.response_time_ms,
        },
      }));

      if (data.status === 'success') {
        showSuccess(message);
      } else {
        showError(message);
      }
    },
    onError: (error, webhookId) => {
      const message = error.message || 'Webhook test failed';
      setTestStates((prev) => ({
        ...prev,
        [webhookId]: { status: 'error', message },
      }));
      showError(message);
    },
    onSettled: (data, error, webhookId) => {
      setTimeout(() => {
        setTestStates((prev) => {
          const newStates = { ...prev };
          delete newStates[webhookId];
          return newStates;
        });
      }, 5000);
    },
  });

  const handleDelete = (id, url) => {
    if (window.confirm(`Delete webhook for ${url}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggle = (webhook) => {
    toggleMutation.mutate({ id: webhook.id, active: !webhook.active });
  };

  const handleTest = (id) => {
    testMutation.mutate(id);
  };

  const handleEdit = (webhook) => {
    if (onEdit) {
      onEdit(webhook);
    }
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
        <p className="text-red-600">Failed to load webhooks: {error.message}</p>
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
        <p className="text-sm text-gray-500 mt-2">Click "Create Webhook" to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {webhooks.map((webhook) => {
        const testState = testStates[webhook.id];

        return (
          <div key={webhook.id} className="card hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-sm font-mono text-gray-900 break-all truncate">
                    {webhook.url}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      webhook.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {webhook.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {(webhook.events || []).map((event) => (
                    <span
                      key={event}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-primary-100 text-primary-800"
                    >
                      {event}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Retries: {webhook.retry_count || 0}</span>
                  <span className={webhook.failure_count > 0 ? 'text-red-600 font-medium' : ''}>
                    Failures: {webhook.failure_count || 0}
                  </span>
                  {webhook.last_status_code && (
                    <span>
                      Last status: <span className={webhook.last_status_code < 400 ? 'text-green-600' : 'text-red-600'}>{webhook.last_status_code}</span>
                    </span>
                  )}
                  {webhook.last_triggered_at && (
                    <span>Last triggered: {new Date(webhook.last_triggered_at).toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleToggle(webhook)}
                  disabled={toggleMutation.isPending}
                  className={`p-2 rounded-md transition-colors ${
                    webhook.active
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                  title={webhook.active ? 'Disable webhook' : 'Enable webhook'}
                >
                  {webhook.active ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => handleTest(webhook.id)}
                  disabled={testState?.status === 'pending'}
                  className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50"
                  title="Test webhook"
                >
                  {testState?.status === 'pending' ? 'Testing...' : 'Test'}
                </button>

                <button
                  type="button"
                  onClick={() => handleEdit(webhook)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors"
                  title="Edit webhook"
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
                  onClick={() => handleDelete(webhook.id, webhook.url)}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  title="Delete webhook"
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

            {testState && (
              <div className={`mt-3 p-3 rounded text-sm ${
                testState.status === 'pending' ? 'bg-blue-50 text-blue-700' :
                testState.status === 'success' ? 'bg-green-50 text-green-700' :
                'bg-red-50 text-red-700'
              }`}>
                <div className="flex items-start gap-2">
                  {testState.status === 'pending' && (
                    <svg className="animate-spin h-4 w-4 mt-0.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{testState.message}</p>
                    {testState.response_time_ms && (
                      <p className="text-xs mt-1 opacity-75">
                        Response time: {testState.response_time_ms}ms
                        {testState.status_code && ` • Status code: ${testState.status_code}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

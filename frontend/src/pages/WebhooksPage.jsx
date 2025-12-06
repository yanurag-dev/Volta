import { useState } from 'react';
import { WebhookForm } from '../components/Webhooks/WebhookForm';
import { WebhookList } from '../components/Webhooks/WebhookList';
import { Modal } from '../components/common/Modal';

export function WebhooksPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
  };

  const handleEditSuccess = () => {
    setEditingWebhook(null);
  };

  const handleEdit = (webhook) => {
    setEditingWebhook(webhook);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure webhooks to receive real-time notifications about product events
          </p>
        </div>
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
          Create Webhook
        </button>
      </div>

      <WebhookList onEdit={handleEdit} />

      {/* Create Webhook Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Webhook"
      >
        <WebhookForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Webhook Modal */}
      <Modal
        isOpen={!!editingWebhook}
        onClose={() => setEditingWebhook(null)}
        title="Edit Webhook"
      >
        <WebhookForm
          webhook={editingWebhook}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingWebhook(null)}
        />
      </Modal>
    </div>
  );
}

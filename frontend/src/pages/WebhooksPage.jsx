import { WebhookForm } from '../components/Webhooks/WebhookForm';
import { WebhookList } from '../components/Webhooks/WebhookList';

export function WebhooksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
        <p className="text-sm text-gray-600 mt-1">
          Configure webhooks to receive real-time notifications about product events
        </p>
      </div>

      <div className="space-y-8">
        <WebhookForm />

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Webhooks</h2>
          <WebhookList />
        </div>
      </div>
    </div>
  );
}

import api from './api';

export const fetchWebhooks = async () => {
  const response = await api.get('/webhooks/');
  // Return the results array from paginated response
  return response.data.results || response.data;
};

export const fetchWebhook = async (id) => {
  const response = await api.get(`/webhooks/${id}/`);
  return response.data;
};

export const createWebhook = async (webhook) => {
  const response = await api.post('/webhooks/', webhook);
  return response.data;
};

export const updateWebhook = async (id, webhook) => {
  const response = await api.put(`/webhooks/${id}/`, webhook);
  return response.data;
};

export const deleteWebhook = async (id) => {
  const response = await api.delete(`/webhooks/${id}/`);
  return response.data;
};

export const testWebhook = async (id) => {
  const response = await api.post(`/webhooks/${id}/test/`);
  return response.data;
};

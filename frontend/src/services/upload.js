import api from './api';

export const uploadCSV = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload/', formData, {
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });

  return response.data;
};

export const getUploadStatus = async (taskId) => {
  const response = await api.get(`/upload/${taskId}/`);
  return response.data;
};

export const getUploadHistory = async () => {
  const response = await api.get('/upload/history/');
  // Return the results array from paginated response
  return response.data.results || response.data;
};

export const subscribeToUploadProgress = (taskId, onProgress, onError) => {
  const baseURL = api.defaults?.baseURL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const eventSource = new EventSource(`${baseURL}/upload/${taskId}/stream/`);

  eventSource.onmessage = (event) => {
    try {
      const progress = JSON.parse(event.data);

      if (onProgress) {
        onProgress(progress);
      }

      if (progress.status === 'completed' || progress.status === 'failed') {
        eventSource.close();
      }
    } catch (error) {
      console.error('Error parsing progress data:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE Error:', error);
    if (onError) onError(error);
    eventSource.close();
  };

  return () => eventSource.close();
};

import { useState, useEffect } from 'react';
import { subscribeToUploadProgress } from '../services/upload';

export function useUploadProgress(taskId) {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!taskId) {
      setProgress(null);
      setError(null);
      return;
    }

    const unsubscribe = subscribeToUploadProgress(
      taskId,
      (progressData) => {
        setProgress(progressData);
        setError(null);
      },
      (errorData) => {
        setError(errorData);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [taskId]);

  return { progress, error, isConnected: !!taskId };
}

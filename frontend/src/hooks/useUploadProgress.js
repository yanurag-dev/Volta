import { useState, useEffect } from 'react';
import { subscribeToUploadProgress } from '../services/upload';

export function useUploadProgress(taskId) {
  const [state, setState] = useState({ taskId: null, progress: null, error: null });

  useEffect(() => {
    if (!taskId) {
      return;
    }

    const unsubscribe = subscribeToUploadProgress(
      taskId,
      (progressData) => {
        setState({ taskId, progress: progressData, error: null });
      },
      (errorData) => {
        setState((prev) => ({ ...prev, taskId, error: errorData }));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [taskId]);

  // Return null values if taskId doesn't match (means it changed)
  const isCurrentTask = state.taskId === taskId;

  return {
    progress: isCurrentTask ? state.progress : null,
    error: isCurrentTask ? state.error : null,
    isConnected: !!taskId
  };
}

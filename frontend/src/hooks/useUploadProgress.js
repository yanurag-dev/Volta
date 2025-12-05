import { useState, useEffect } from 'react';
import { subscribeToUploadProgress } from '../services/upload';

export function useUploadProgress(taskId) {
  const [state, setState] = useState({ taskId: null, progress: null, error: null });

  useEffect(() => {
    if (!taskId) {
      return;
    }

    console.log('[useUploadProgress] Starting SSE connection for task:', taskId);

    const unsubscribe = subscribeToUploadProgress(
      taskId,
      (progressData) => {
        console.log('[useUploadProgress] Progress update:', progressData);
        setState({ taskId, progress: progressData, error: null });
      },
      (errorData) => {
        console.error('[useUploadProgress] SSE error:', errorData);
        setState((prev) => ({ ...prev, taskId, error: errorData }));
      }
    );

    return () => {
      console.log('[useUploadProgress] Cleaning up SSE connection for task:', taskId);
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

import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadCSV } from '../services/upload';
import { FileUploader } from '../components/Upload/FileUploader';
import { ProgressBar } from '../components/Upload/ProgressBar';
import { UploadHistory } from '../components/Upload/UploadHistory';
import { CSVTemplateDownload } from '../components/Upload/CSVTemplateDownload';
import { useUploadProgress } from '../hooks/useUploadProgress';
import { useToast } from '../hooks/useToast';

export function UploadPage() {
  const [taskId, setTaskId] = useState(null);
  const [lastUploadedFile, setLastUploadedFile] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completionTime, setCompletionTime] = useState(null);
  const { progress } = useUploadProgress(taskId);
  const { showSuccess, showError, showWarning } = useToast();
  const hasShownCompletionToast = useRef(false);
  const timerIntervalRef = useRef(null);

  // Timer logic - update elapsed time every second
  useEffect(() => {
    if (progress && progress.status === 'processing' && startTime) {
      // Start timer
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      // Stop timer when not processing
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [progress, startTime]);

  // Show toast notifications when upload completes or fails
  useEffect(() => {
    if (!progress) {
      hasShownCompletionToast.current = false;
      setCompletionTime(null);
      return;
    }

    // Check if upload completed
    if (progress.status === 'completed' && !hasShownCompletionToast.current) {
      hasShownCompletionToast.current = true;

      // Calculate final completion time
      if (startTime) {
        const finalTime = Math.floor((Date.now() - startTime) / 1000);
        setCompletionTime(finalTime);
      }

      // Check if there's a warning (e.g., empty CSV)
      if (progress.error_message || progress.message?.includes('no data')) {
        showWarning(progress.error_message || progress.message || 'Upload completed with warnings');
      } else if (progress.failed_rows > 0) {
        showWarning(
          `Upload completed: ${progress.successful_rows} succeeded, ${progress.failed_rows} failed`
        );
      } else {
        showSuccess(
          `Upload completed successfully! ${progress.successful_rows || progress.total_rows || 0} products imported.`
        );
      }
    }

    // Check if upload failed
    if (progress.status === 'failed' && !hasShownCompletionToast.current) {
      hasShownCompletionToast.current = true;
      if (startTime) {
        const finalTime = Math.floor((Date.now() - startTime) / 1000);
        setCompletionTime(finalTime);
      }
      const errorMsg = progress.error_message || progress.message || 'Upload failed';
      showError(errorMsg);
    }
  }, [progress, showSuccess, showError, showWarning, startTime]);

  const uploadMutation = useMutation({
    mutationFn: uploadCSV,
    onMutate: () => {
      setTaskId(null);
      setStartTime(null);
      setElapsedTime(0);
      setCompletionTime(null);
    },
    onSuccess: (data) => {
      // Backend returns { message, task: { task_id, ... } }
      setTaskId(data.task?.task_id);
      setStartTime(Date.now());
      showSuccess('File uploaded successfully. Processing started.');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload file';
      showError(errorMessage);
    },
  });

  const handleUpload = async (file) => {
    setLastUploadedFile(file);
    uploadMutation.mutate(file);
  };

  const handleRetry = () => {
    if (lastUploadedFile) {
      uploadMutation.reset();
      uploadMutation.mutate(lastUploadedFile);
    }
  };

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Products</h1>
        <p className="text-sm text-gray-600 mt-1">
          Import products from a CSV file with real-time progress tracking
        </p>
      </div>

      <div className="space-y-8">
        <CSVTemplateDownload />

        <div className="card">
          <FileUploader
            onUpload={handleUpload}
            isUploading={uploadMutation.isPending}
          />

          {uploadMutation.isError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Upload Failed</h3>
                  <p className="mt-1 text-sm text-red-700">
                    {uploadMutation.error?.response?.data?.error || uploadMutation.error?.message || 'An error occurred during upload'}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry Upload
                  </button>
                </div>
              </div>
            </div>
          )}

          {progress && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Upload Progress</h3>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-mono text-gray-600">
                    {progress.status === 'completed' || progress.status === 'failed'
                      ? completionTime !== null
                        ? formatTime(completionTime)
                        : formatTime(elapsedTime)
                      : formatTime(elapsedTime)
                    }
                  </span>
                  {progress.status === 'completed' && (
                    <span className="text-xs text-green-600 font-medium ml-2">✓ Completed</span>
                  )}
                  {progress.status === 'failed' && (
                    <span className="text-xs text-red-600 font-medium ml-2">✗ Failed</span>
                  )}
                </div>
              </div>
              <ProgressBar progress={progress} />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload History</h2>
          <UploadHistory />
        </div>
      </div>
    </div>
  );
}

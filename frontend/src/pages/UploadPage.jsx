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
  const { progress } = useUploadProgress(taskId);
  const { showSuccess, showError, showWarning } = useToast();
  const hasShownCompletionToast = useRef(false);

  // Show toast notifications when upload completes or fails
  useEffect(() => {
    if (!progress) {
      hasShownCompletionToast.current = false;
      return;
    }

    // Check if upload completed
    if (progress.status === 'completed' && !hasShownCompletionToast.current) {
      hasShownCompletionToast.current = true;

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
      const errorMsg = progress.error_message || progress.message || 'Upload failed';
      showError(errorMsg);
    }
  }, [progress, showSuccess, showError, showWarning]);

  const uploadMutation = useMutation({
    mutationFn: uploadCSV,
    onMutate: () => {
      setTaskId(null);
    },
    onSuccess: (data) => {
      // Backend returns { message, task: { task_id, ... } }
      setTaskId(data.task?.task_id);
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

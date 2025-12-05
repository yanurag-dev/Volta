import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadCSV } from '../services/upload';
import { FileUploader } from '../components/Upload/FileUploader';
import { ProgressBar } from '../components/Upload/ProgressBar';
import { UploadHistory } from '../components/Upload/UploadHistory';
import { useUploadProgress } from '../hooks/useUploadProgress';

export function UploadPage() {
  const [taskId, setTaskId] = useState(null);
  const { progress } = useUploadProgress(taskId);

  const uploadMutation = useMutation({
    mutationFn: uploadCSV,
    onMutate: () => {
      setTaskId(null);
    },
    onSuccess: (data) => {
      setTaskId(data.task_id);
    },
  });

  const handleUpload = async (file) => {
    uploadMutation.mutate(file);
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
        <div className="card">
          <FileUploader
            onUpload={handleUpload}
            isUploading={uploadMutation.isPending}
          />

          {uploadMutation.isError && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded">
              Upload failed: {uploadMutation.error.message}
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

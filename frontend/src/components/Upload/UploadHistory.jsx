import { useQuery } from '@tanstack/react-query';
import { getUploadHistory } from '../../services/upload';

export function UploadHistory() {
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['uploadHistory'],
    queryFn: getUploadHistory,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        <p>Failed to load upload history</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-4 text-sm text-gray-600">No upload history yet</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {history.map((upload) => (
        <div
          key={upload.task_id}
          className="card hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {upload.filename}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {upload.status === 'completed' ? (
                      <>
                        <span className="text-green-600">{(upload.successful_rows || 0).toLocaleString()} succeeded</span>
                        {upload.failed_rows > 0 && (
                          <span className="text-red-600"> • {upload.failed_rows.toLocaleString()} failed</span>
                        )}
                        {' '}of {(upload.total_rows || 0).toLocaleString()} products
                      </>
                    ) : (
                      <>
                        {(upload.processed_rows || 0).toLocaleString()} / {(upload.total_rows || 0).toLocaleString()} products
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(upload.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {upload.status === 'processing' && (
                <div className="w-24">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(() => {
                          if (!upload.total_rows || upload.total_rows <= 0) {
                            return 0;
                          }
                          const percent = (upload.processed_rows / upload.total_rows) * 100;
                          if (!Number.isFinite(percent)) {
                            return 0;
                          }
                          return Math.max(0, Math.min(100, percent)).toFixed(0);
                        })()}%`
                      }}
                    />
                  </div>
                </div>
              )}
              {getStatusBadge(upload.status)}
            </div>
          </div>

          {upload.error_message && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
              {upload.error_message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({ progress }) {
  if (!progress) return null;

  const { current = 0, total = 0, percentage = 0, status = 'pending', errors = [] } = progress;
  
  // Ensure errors is always an array
  const errorsList = Array.isArray(errors) ? errors : [];

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'failed':
        return 'bg-red-600';
      case 'processing':
        return 'bg-primary-600';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Import Complete';
      case 'failed':
        return 'Import Failed';
      case 'processing':
        // Show different messages based on progress
        if (percentage === 0) {
          return 'Parsing CSV';
        } else if (percentage < 10) {
          return 'Validating Products';
        } else if (percentage < 100) {
          return 'Importing Products';
        } else {
          return 'Finalizing';
        }
      default:
        return 'Pending';
    }
  };

  const getDetailedStatus = () => {
    if (status === 'processing') {
      if (percentage === 0) {
        return 'Reading and parsing CSV file...';
      } else if (percentage < 10) {
        return 'Validating product data...';
      } else if (percentage < 100) {
        return 'Importing products into database...';
      } else {
        return 'Completing import process...';
      }
    }
    return null;
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-gray-900">Upload Progress</p>
          <p className="text-xs text-gray-500 mt-1">
            {current.toLocaleString()} / {total.toLocaleString()} products
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-gray-900">{percentage.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">{getStatusText()}</p>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-300 ease-out ${getStatusColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer" />
        </div>
      </div>

      {status === 'processing' && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{getDetailedStatus()}</span>
        </div>
      )}

      {status === 'completed' && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          <span>Upload completed successfully</span>
        </div>
      )}

      {status === 'failed' && (
        <div className="rounded-md bg-red-50 p-3">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Upload failed</p>
              {errorsList.length > 0 && (
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {errorsList.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';

export function ProgressBar({ progress }) {
  // Track progress for speed calculation - hooks MUST be called before any early returns
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [currentTip, setCurrentTip] = useState(0);
  const prevProgressRef = useRef({ current: 0, timestamp: Date.now() });

  // Early return AFTER all hooks are declared
  if (!progress) return null;

  const { current = 0, total = 0, percentage = 0, status = 'pending', errors = [] } = progress;
  
  // Ensure errors is always an array
  const errorsList = Array.isArray(errors) ? errors : [];

  // Fun tips to show during upload
  const tips = [
    "💡 Tip: Large files are processed in parallel for faster imports!",
    "🚀 Did you know? Our system can handle up to 100MB CSV files!",
    "⚡ Pro tip: Ensure your CSV has proper headers for best results.",
    "🎯 Fun fact: Each row is validated before import for data integrity.",
    "🔥 Optimization: We use background workers to keep things speedy!",
    "✨ Your file is being processed in real-time as you watch!",
    "📊 Tip: You can view upload history to track all your imports.",
    "🎨 Did you know? Failed rows are logged for easy debugging.",
  ];

  // Calculate upload speed and estimated time
  useEffect(() => {
    if (status === 'processing' && current > 0) {
      const now = Date.now();
      const timeDiff = (now - prevProgressRef.current.timestamp) / 1000; // seconds
      const rowsDiff = current - prevProgressRef.current.current;

      if (timeDiff > 0 && rowsDiff > 0) {
        const speed = rowsDiff / timeDiff; // rows per second
        setUploadSpeed(speed);

        const remaining = total - current;
        const eta = remaining / speed; // seconds
        setEstimatedTime(eta);
      }

      prevProgressRef.current = { current, timestamp: now };
    }
  }, [current, status, total]);

  // Rotate tips every 5 seconds
  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % tips.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [status, tips.length]);

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return 'Calculating...';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatSpeed = (speed) => {
    if (!speed || !isFinite(speed)) return '0';
    if (speed < 1) return speed.toFixed(2);
    if (speed < 10) return speed.toFixed(1);
    return Math.round(speed).toLocaleString();
  };

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
          {status === 'processing' && uploadSpeed > 0 && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="inline-flex items-center gap-1 text-blue-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {formatSpeed(uploadSpeed)} rows/sec
              </span>
              {estimatedTime && (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(estimatedTime)} remaining
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-gray-900">{percentage.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">{getStatusText()}</p>
        </div>
      </div>

      <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
        <div
          className={`h-3 rounded-full transition-all duration-500 ease-out ${getStatusColor()} relative overflow-hidden`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
          {/* Pulsing effect for active uploads */}
          {status === 'processing' && (
            <div className="absolute inset-0 bg-white opacity-10 animate-pulse" />
          )}
        </div>
        {/* Glowing effect */}
        {status === 'processing' && percentage > 0 && (
          <div 
            className="absolute top-0 h-3 rounded-full blur-sm opacity-50 transition-all duration-500 ease-out"
            style={{ 
              width: `${Math.min(percentage, 100)}%`,
              background: `linear-gradient(90deg, transparent, ${status === 'processing' ? '#3b82f6' : '#10b981'})`
            }}
          />
        )}
      </div>

      {status === 'processing' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
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
            <span className="font-medium">{getDetailedStatus()}</span>
          </div>
          
          {/* Fun tips carousel */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 transition-all duration-500">
            <p className="text-xs text-gray-700 animate-fadeIn">
              {tips[currentTip]}
            </p>
          </div>
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

import { useState, useRef } from 'react';

export function FileUploader({ onUpload, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleChange = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('File size must be less than 100MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile && onUpload) {
      onUpload(selectedFile);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />

        {!selectedFile ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <div>
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-primary-600 hover:text-primary-700 font-medium"
              >
                Choose a file
              </label>
              <span className="text-gray-600"> or drag and drop</span>
            </div>

            <p className="text-sm text-gray-500">CSV files up to 100MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg
                className="w-16 h-16 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <div>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="btn btn-primary"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={handleClear}
                disabled={isUploading}
                className="btn btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

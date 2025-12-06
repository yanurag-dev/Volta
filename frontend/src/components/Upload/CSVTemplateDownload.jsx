export function CSVTemplateDownload() {
  const handleDownload = () => {
    // Create sample CSV content
    const csvContent = `sku,name,description
PROD-001,Sample Product 1,This is a sample product description
PROD-002,Sample Product 2,Another sample product with details
PROD-003,Sample Product 3,Third example product`;

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'product_template.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900">Need a template?</h3>
          <p className="text-sm text-blue-700 mt-1">
            Download a sample CSV template to see the required format. Your CSV should have the following columns:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
            <li><strong>sku</strong> (required) - Unique product identifier</li>
            <li><strong>name</strong> (required) - Product name</li>
            <li><strong>description</strong> (optional) - Product description</li>
          </ul>
          <button
            onClick={handleDownload}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download CSV Template
          </button>
        </div>
      </div>
    </div>
  );
}


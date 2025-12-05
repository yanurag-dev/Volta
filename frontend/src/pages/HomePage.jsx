import { Link } from 'react-router-dom';

export function HomePage() {
  const features = [
    {
      title: 'Product Management',
      description: 'View, search, and manage your product catalog with ease',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      link: '/products',
    },
    {
      title: 'CSV Import',
      description: 'Upload and import thousands of products with real-time progress tracking',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      link: '/upload',
    },
    {
      title: 'Webhook Integration',
      description: 'Configure webhooks to receive real-time notifications about product events',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      link: '/webhooks',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Volta
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          A powerful product importer system for managing and importing large-scale product catalogs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {features.map((feature) => (
          <Link
            key={feature.title}
            to={feature.link}
            className="card hover:shadow-lg transition-all group"
          >
            <div className="text-primary-600 mb-4 group-hover:text-primary-700 transition-colors">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </Link>
        ))}
      </div>

      <div className="card bg-gray-50 border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-primary-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Getting Started</h3>
            <p className="text-sm text-gray-600">
              Start by uploading a CSV file with your product data, then use the product management
              interface to view and manage your catalog. Configure webhooks to integrate with your
              external systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

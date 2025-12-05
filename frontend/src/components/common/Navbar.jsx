import { Link, useLocation } from 'react-router-dom';

export function Navbar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-semibold text-gray-900">Volta</span>
            </Link>

            <div className="ml-10 flex items-center space-x-4">
              <Link
                to="/products"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/products')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Products
              </Link>

              <Link
                to="/upload"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/upload')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Upload
              </Link>

              <Link
                to="/webhooks"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/webhooks')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Webhooks
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

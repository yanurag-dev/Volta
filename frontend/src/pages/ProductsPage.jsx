import { useState } from 'react';
import { ProductFilters } from '../components/Products/ProductFilters';
import { ProductList } from '../components/Products/ProductList';
import { BulkDeleteButton } from '../components/Products/BulkDeleteButton';

export function ProductsPage() {
  const [filters, setFilters] = useState({});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your product catalog</p>
        </div>
        <BulkDeleteButton />
      </div>

      <div className="space-y-6">
        <ProductFilters onFilterChange={setFilters} />
        <ProductList filters={filters} />
      </div>
    </div>
  );
}

import { useState } from 'react';

export function ProductFilters({ onFilterChange }) {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('all');

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    applyFilters(value, active);
  };

  const handleActiveChange = (value) => {
    setActive(value);
    applyFilters(search, value);
  };

  const applyFilters = (searchValue, activeValue) => {
    const filters = {};

    if (searchValue) {
      filters.search = searchValue;
    }

    if (activeValue !== 'all') {
      filters.active = activeValue === 'active';
    }

    onFilterChange(filters);
  };

  const handleReset = () => {
    setSearch('');
    setActive('all');
    onFilterChange({});
  };

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            id="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by SKU, name, or description..."
            className="input"
          />
        </div>

        <div className="sm:w-48">
          <label htmlFor="active" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="active"
            value={active}
            onChange={(e) => handleActiveChange(e.target.value)}
            className="input"
          >
            <option value="all">All Products</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="flex items-end">
          <button onClick={handleReset} className="btn btn-secondary">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

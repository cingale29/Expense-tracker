'use client';

import { ExpenseFiltersState, FilterCategory, CATEGORIES } from '@/types';
import { Search, X, SlidersHorizontal } from 'lucide-react';

interface Props {
  filters: ExpenseFiltersState;
  onChange: (f: ExpenseFiltersState) => void;
  resultCount: number;
}

export default function ExpenseFilters({ filters, onChange, resultCount }: Props) {
  function set<K extends keyof ExpenseFiltersState>(key: K, value: ExpenseFiltersState[K]) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange({ search: '', category: 'All', startDate: '', endDate: '' });
  }

  const hasActiveFilters =
    filters.search || filters.category !== 'All' || filters.startDate || filters.endDate;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      {/* Row 1: Search + clear */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search expenses…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => set('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {/* Row 2: Category + Date range */}
      <div className="flex flex-wrap gap-2 items-center">
        <SlidersHorizontal size={14} className="text-gray-400 shrink-0" />

        {/* Category chips */}
        {(['All', ...CATEGORIES] as FilterCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => set('category', cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filters.category === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 text-gray-600"
            title="Start date"
          />
          <span className="text-gray-400 text-xs">→</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => set('endDate', e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 text-gray-600"
            title="End date"
          />
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-400 px-0.5">
        Showing <span className="font-semibold text-gray-600">{resultCount}</span> result
        {resultCount !== 1 ? 's' : ''}
        {hasActiveFilters ? ' (filtered)' : ''}
      </p>
    </div>
  );
}

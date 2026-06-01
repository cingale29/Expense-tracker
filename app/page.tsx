'use client';

import { useState } from 'react';
import { Plus, Zap } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import SummaryCards from '@/components/SummaryCards';
import CategoryChart from '@/components/CategoryChart';
import MonthlyChart from '@/components/MonthlyChart';
import RecentTransactions from '@/components/RecentTransactions';
import ExpenseForm from '@/components/ExpenseForm';
import CloudExportModal from '@/components/CloudExportModal';
import { ExpenseFormData } from '@/types';

export default function DashboardPage() {
  const { expenses, isLoaded, addExpense } = useExpenses();
  const [showForm, setShowForm]             = useState(false);
  const [showCloudExport, setShowCloudExport] = useState(false);

  function handleSave(data: ExpenseFormData) {
    addExpense(data);
    setShowForm(false);
  }

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCloudExport(true)}
            disabled={expenses.length === 0}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-sm"
          >
            <Zap size={15} /> Cloud Export
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Skeleton loading */}
      {!isLoaded ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 h-28 animate-pulse border border-gray-100" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100" />
            <div className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <SummaryCards expenses={expenses} />

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyChart expenses={expenses} />
            <CategoryChart expenses={expenses} />
          </div>

          {/* Recent transactions */}
          <RecentTransactions expenses={expenses} />
        </div>
      )}

      {/* Add expense modal */}
      {showForm && (
        <ExpenseForm onSave={handleSave} onClose={() => setShowForm(false)} />
      )}

      {/* Cloud Export modal */}
      {showCloudExport && (
        <CloudExportModal expenses={expenses} onClose={() => setShowCloudExport(false)} />
      )}
    </div>
  );
}

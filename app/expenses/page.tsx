'use client';

import { useState } from 'react';
import { Plus, Zap } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import ExpenseList from '@/components/ExpenseList';
import ExpenseFilters from '@/components/ExpenseFilters';
import ExpenseForm from '@/components/ExpenseForm';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import CloudExportModal from '@/components/CloudExportModal';
import { Expense, ExpenseFormData, ExpenseFiltersState } from '@/types';

const defaultFilters: ExpenseFiltersState = {
  search: '',
  category: 'All',
  startDate: '',
  endDate: '',
};

export default function ExpensesPage() {
  const { isLoaded, addExpense, updateExpense, deleteExpense, filterExpenses } =
    useExpenses();

  const [filters, setFilters] = useState<ExpenseFiltersState>(defaultFilters);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [showAddForm, setShowAddForm]       = useState(false);
  const [showCloudExport, setShowCloudExport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = filterExpenses(filters);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleAdd(data: ExpenseFormData) {
    addExpense(data);
    setShowAddForm(false);
    showToast('Expense added ✓');
  }

  function handleEdit(data: ExpenseFormData) {
    if (!editTarget) return;
    updateExpense(editTarget.id, data);
    setEditTarget(null);
    showToast('Expense updated ✓');
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteExpense(deleteTarget.id);
    setDeleteTarget(null);
    showToast('Expense deleted ✓');
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and review all your transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCloudExport(true)}
            disabled={filtered.length === 0}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-sm"
          >
            <Zap size={15} /> Cloud Export
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {!isLoaded ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />
          <div className="bg-white rounded-2xl h-96 animate-pulse border border-gray-100" />
        </div>
      ) : (
        <div className="space-y-4">
          <ExpenseFilters
            filters={filters}
            onChange={setFilters}
            resultCount={filtered.length}
          />
          <ExpenseList
            expenses={filtered}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg z-50 animate-in fade-in">
          {toast}
        </div>
      )}

      {/* Add expense modal */}
      {showAddForm && (
        <ExpenseForm onSave={handleAdd} onClose={() => setShowAddForm(false)} />
      )}

      {/* Edit expense modal */}
      {editTarget && (
        <ExpenseForm
          expense={editTarget}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          description={deleteTarget.description}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Cloud Export modal */}
      {showCloudExport && (
        <CloudExportModal
          expenses={filtered}
          onClose={() => setShowCloudExport(false)}
        />
      )}
    </div>
  );
}

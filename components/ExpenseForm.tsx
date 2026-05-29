'use client';

import { useState, useEffect } from 'react';
import {
  Expense,
  ExpenseFormData,
  FormErrors,
  CATEGORIES,
  CATEGORY_EMOJI,
} from '@/types';
import { getTodayString } from '@/utils/formatters';
import { X, DollarSign, Calendar, Tag, FileText, Save } from 'lucide-react';

interface Props {
  expense?: Expense; // if set → edit mode
  onSave: (data: ExpenseFormData) => void;
  onClose: () => void;
}

const empty: ExpenseFormData = {
  date: '',
  amount: '',
  category: 'Food',
  description: '',
};

export default function ExpenseForm({ expense, onSave, onClose }: Props) {
  const [form, setForm] = useState<ExpenseFormData>(empty);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (expense) {
      setForm({
        date: expense.date,
        amount: expense.amount.toFixed(2),
        category: expense.category,
        description: expense.description,
      });
    } else {
      setForm({ ...empty, date: getTodayString() });
    }
    setErrors({});
  }, [expense]);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.date) e.date = 'Date is required.';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = 'Enter a valid amount greater than 0.';
    if (Number(form.amount) > 1_000_000)
      e.amount = 'Amount is too large.';
    if (!form.description.trim())
      e.description = 'Description is required.';
    if (form.description.trim().length > 100)
      e.description = 'Description must be 100 characters or fewer.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    // Simulate a brief save delay for visual feedback
    setTimeout(() => {
      onSave(form);
      setSaving(false);
    }, 200);
  }

  function field(key: keyof ExpenseFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  const isEdit = !!expense;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <FileText size={14} /> Description
                </span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => field('description', e.target.value)}
                placeholder="e.g. Grocery shopping"
                maxLength={101}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                  errors.description
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-200 bg-gray-50 focus:border-indigo-400'
                }`}
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1">{errors.description}</p>
              )}
            </div>

            {/* Amount + Date row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={14} /> Amount
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => field('amount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`w-full pl-7 pr-3 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                      errors.amount
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 bg-gray-50 focus:border-indigo-400'
                    }`}
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} /> Date
                  </span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => field('date', e.target.value)}
                  max={getTodayString()}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    errors.date
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-200 bg-gray-50 focus:border-indigo-400'
                  }`}
                />
                {errors.date && (
                  <p className="text-xs text-red-500 mt-1">{errors.date}</p>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Tag size={14} /> Category
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => field('category', cat)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      form.category === cat
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{CATEGORY_EMOJI[cat]}</span>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

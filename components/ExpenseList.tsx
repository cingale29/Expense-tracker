'use client';

import { useState } from 'react';
import { Expense, CATEGORY_BG, CATEGORY_EMOJI } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

type SortKey = 'date' | 'amount' | 'category' | 'description';
type SortDir = 'asc' | 'desc';

interface Props {
  expenses: Expense[];
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}

export default function ExpenseList({ expenses, onEdit, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...expenses].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'date')        cmp = a.date.localeCompare(b.date);
    else if (sortKey === 'amount') cmp = a.amount - b.amount;
    else if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
    else                           cmp = a.description.localeCompare(b.description);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={13} className="text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="text-indigo-500" />
      : <ChevronDown size={13} className="text-indigo-500" />;
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <span className="text-5xl">💸</span>
        <p className="text-base font-medium text-gray-500">No expenses found</p>
        <p className="text-sm">Try adjusting your filters or add a new expense.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              {(
                [
                  ['date',        'Date'],
                  ['description', 'Description'],
                  ['category',    'Category'],
                  ['amount',      'Amount'],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none"
                >
                  <span className="flex items-center gap-1">
                    {label} <SortIcon col={key} />
                  </span>
                </th>
              ))}
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50/60 transition-colors group">
                <td className="px-5 py-3.5 text-gray-500 text-sm whitespace-nowrap">
                  {formatDate(e.date)}
                </td>
                <td className="px-5 py-3.5 text-gray-800 font-medium max-w-xs">
                  <span className="mr-2">{CATEGORY_EMOJI[e.category]}</span>
                  <span className="truncate">{e.description}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_BG[e.category]}`}>
                    {e.category}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">
                  {formatCurrency(e.amount)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(e)}
                      className="w-8 h-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-gray-400 flex items-center justify-center transition-colors"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(e)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="md:hidden divide-y divide-gray-100">
        {sorted.map((e) => (
          <li key={e.id} className="px-4 py-3.5 flex items-start gap-3">
            <span className="text-2xl mt-0.5">{CATEGORY_EMOJI[e.category]}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm truncate">{e.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_BG[e.category]}`}>
                  {e.category}
                </span>
                <span className="text-xs text-gray-400">{formatDate(e.date)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="font-bold text-gray-900 text-sm">{formatCurrency(e.amount)}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(e)}
                  className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(e)}
                  className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Footer totals */}
      {expenses.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/70">
          <p className="text-xs text-gray-500">
            {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
          </p>
          <p className="text-sm font-bold text-gray-900">
            Total: {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Expense, CATEGORY_BG, CATEGORY_EMOJI } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { ArrowRight } from 'lucide-react';

interface Props {
  expenses: Expense[];
}

export default function RecentTransactions({ expenses }: Props) {
  const recent = expenses.slice(0, 7);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-800">Recent Transactions</h3>
        <Link
          href="/expenses"
          className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
        >
          View all <ArrowRight size={13} />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
          <span className="text-3xl">💸</span>
          <p className="text-sm">No expenses yet. Add one!</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {recent.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition-colors">
              <span className="text-xl w-8 text-center">{CATEGORY_EMOJI[e.category]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{e.description}</p>
                <p className="text-xs text-gray-400">{formatDate(e.date)}</p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_BG[e.category]}`}
              >
                {e.category}
              </span>
              <span className="text-sm font-semibold text-gray-900 shrink-0">
                {formatCurrency(e.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

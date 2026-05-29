'use client';

import { Expense, Category, CATEGORY_EMOJI } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { TrendingUp, Calendar, Tag, Hash } from 'lucide-react';

interface Props {
  expenses: Expense[];
}

export default function SummaryCards({ expenses }: Props) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);

  const thisMonth = expenses.filter((e) => e.date.startsWith(ym));
  const thisMonthTotal = thisMonth.reduce((s, e) => s + e.amount, 0);

  // Top category by spend
  const catTotals: Partial<Record<Category, number>> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount;
  });
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const [topCat, topCatAmt] = sorted[0] ?? ['—', 0];

  const cards = [
    {
      title: 'Total Spending',
      value: formatCurrency(totalAll),
      sub: `${expenses.length} transaction${expenses.length !== 1 ? 's' : ''}`,
      icon: TrendingUp,
      accent: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'This Month',
      value: formatCurrency(thisMonthTotal),
      sub: `${thisMonth.length} transaction${thisMonth.length !== 1 ? 's' : ''}`,
      icon: Calendar,
      accent: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Top Category',
      value: topCat === '—'
        ? '—'
        : `${CATEGORY_EMOJI[topCat as Category]} ${topCat}`,
      sub: topCat === '—' ? 'No data yet' : formatCurrency(topCatAmt as number),
      icon: Tag,
      accent: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Avg per Transaction',
      value: expenses.length ? formatCurrency(totalAll / expenses.length) : '$0.00',
      sub: 'all time average',
      icon: Hash,
      accent: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ title, value, sub, icon: Icon, accent, bg }) => (
        <div
          key={title}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <span className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={17} className={accent} />
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

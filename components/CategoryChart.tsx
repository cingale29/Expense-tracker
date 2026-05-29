'use client';

import { useState, useEffect } from 'react';
import { Expense, Category, CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORIES } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  expenses: Expense[];
}

interface ChartEntry {
  name: Category;
  value: number;
  emoji: string;
}

interface TooltipProps { active?: boolean; payload?: { name: string; value: number; payload: ChartEntry & { percent?: number } }[] }
const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload?.length) {
    const d = payload[0];
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-lg text-sm">
        <p className="font-semibold text-gray-800">
          {d.payload.emoji} {d.name}
        </p>
        <p className="text-gray-600">{formatCurrency(d.value)}</p>
        <p className="text-gray-400 text-xs">{d.payload.percent?.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export default function CategoryChart({ expenses }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const catTotals: Partial<Record<Category, number>> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount;
  });

  const data: ChartEntry[] = CATEGORIES
    .filter((c) => catTotals[c])
    .map((c) => ({
      name: c,
      value: catTotals[c] as number,
      emoji: CATEGORY_EMOJI[c],
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!mounted) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-80 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center h-80 text-gray-400 gap-2">
        <span className="text-4xl">📊</span>
        <p className="text-sm">No data to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-base font-semibold text-gray-800 mb-4">
        Spending by Category
      </h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={CATEGORY_COLORS[entry.name]}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: CATEGORY_COLORS[d.name] }}
            />
            <span className="text-xs text-gray-600 flex-1">
              {d.emoji} {d.name}
            </span>
            <span className="text-xs font-medium text-gray-800">
              {formatCurrency(d.value)}
            </span>
            <span className="text-xs text-gray-400 w-10 text-right">
              {total ? ((d.value / total) * 100).toFixed(0) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

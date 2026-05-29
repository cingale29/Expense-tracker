'use client';

import { useState, useEffect, useMemo } from 'react';
import { Expense } from '@/types';
import { formatCurrency, getYearMonth, formatMonthYear } from '@/utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Props {
  expenses: Expense[];
}

interface TooltipProps { active?: boolean; payload?: { value: number }[]; label?: string }
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-lg text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        <p className="text-indigo-600 font-medium">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function MonthlyChart({ expenses }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = useMemo(() => {
    const monthMap: Record<string, number> = {};
    expenses.forEach((e) => {
      const ym = getYearMonth(e.date);
      monthMap[ym] = (monthMap[ym] ?? 0) + e.amount;
    });

    // Sort months chronologically, take last 6
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([ym, total]) => ({
        month: formatMonthYear(ym),
        total,
        ym,
      }));
  }, [expenses]);

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
        <span className="text-4xl">📈</span>
        <p className="text-sm">No data to display</p>
      </div>
    );
  }

  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-base font-semibold text-gray-800 mb-4">
        Monthly Spending (last 6 months)
      </h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6', radius: 6 }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.ym}
                  fill={entry.ym === currentMonth ? '#4F46E5' : '#C7D2FE'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" /> Current month
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-200 inline-block" /> Previous months
        </span>
      </div>
    </div>
  );
}

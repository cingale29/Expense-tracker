'use client';

import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Expense, Category, CATEGORY_COLORS, CATEGORY_EMOJI } from '@/types';
import { formatCurrency, getYearMonth, getTodayString } from '@/utils/formatters';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  expenses: Expense[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDateStr(base: string, deltaDays: number): string {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const color = CATEGORY_COLORS[name as Category] ?? '#6B7280';
  const emoji = CATEGORY_EMOJI[name as Category] ?? '';
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="font-semibold text-gray-800">{emoji} {name}</span>
        <span className="font-bold text-gray-900 ml-1">{formatCurrency(value)}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MonthlyInsights({ expenses }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today      = getTodayString();
  const currentYM  = getYearMonth(today);
  const monthLabel = new Date(`${today}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  // ── Derived data ────────────────────────────────────────────────────────────

  const monthExpenses = useMemo(
    () => expenses.filter(e => getYearMonth(e.date) === currentYM),
    [expenses, currentYM],
  );

  const categoryTotals = useMemo<[Category, number][]>(() => {
    const totals: Partial<Record<Category, number>> = {};
    for (const e of monthExpenses) {
      totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    }
    return (Object.entries(totals) as [Category, number][]).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  const totalSpent = categoryTotals.reduce((s, [, v]) => s + v, 0);
  const top3       = categoryTotals.slice(0, 3);
  const chartData  = categoryTotals.map(([name, value]) => ({ name, value }));

  // Tracking streak: consecutive days going back from today with at least one expense
  const streak = useMemo(() => {
    const tracked = new Set(monthExpenses.map(e => e.date));
    let count = 0;
    for (let i = 0; i < 31; i++) {
      const d = localDateStr(today, -i);
      if (getYearMonth(d) !== currentYM) break;
      if (!tracked.has(d)) break;
      count++;
    }
    return count;
  }, [monthExpenses, currentYM, today]);

  // Last 7 days: did you log anything? (for the dot tracker)
  const last7 = useMemo(() => {
    const tracked = new Set(monthExpenses.map(e => e.date));
    return Array.from({ length: 7 }, (_, i) => tracked.has(localDateStr(today, i - 6)));
  }, [monthExpenses, today]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 md:px-8 py-6 max-w-md mx-auto space-y-5">

      {/* ── Title ── */}
      <div className="text-center pb-1">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Monthly Insights
        </h1>
        {/* Wavy underline — matches the napkin sketch */}
        <div className="flex justify-center mt-1">
          <svg width="210" height="10" viewBox="0 0 210 10" aria-hidden>
            <path
              d="M0 5 Q17 1 35 5 Q52 9 70 5 Q87 1 105 5 Q122 9 140 5 Q157 1 175 5 Q192 9 210 5"
              stroke="#6366F1"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 font-medium">{monthLabel}</p>
      </div>

      {/* ── Donut chart ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-5">
        {!mounted || monthExpenses.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2 text-gray-400">
            <div className="w-32 h-32 rounded-full border-8 border-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-300 font-medium">No data</span>
            </div>
            <p className="text-xs">No expenses this month yet</p>
          </div>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                  startAngle={90}
                  endAngle={-270}
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={`${entry.name}-${i}`}
                      fill={CATEGORY_COLORS[entry.name as Category] ?? '#6B7280'}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Centre "Spending" chip — mirrors sketch label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
              <span className="text-[11px] font-semibold text-gray-500 bg-white border border-gray-200 shadow-sm px-2.5 py-0.5 rounded-full">
                Spending
              </span>
              <span className="text-sm font-bold text-gray-900 mt-0.5">
                {formatCurrency(totalSpent)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Top 3 categories ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Top Categories</p>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
            Top 3!
          </span>
        </div>

        {top3.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">No expenses yet</p>
        ) : (
          <div className="space-y-3">
            {top3.map(([cat, amount]) => {
              const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-3">
                    {/* Coloured left bar — matches sketch */}
                    <div
                      className="w-1 h-7 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                    />
                    <span className="text-base leading-none">{CATEGORY_EMOJI[cat]}</span>
                    <span className="text-sm font-medium text-gray-700 flex-1 truncate">{cat}</span>
                    <span className="text-sm font-bold text-gray-900 tabular-nums">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  {/* Thin progress bar */}
                  <div className="ml-8 mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CATEGORY_COLORS[cat],
                        transition: 'width 0.8s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Budget Streak ── */}
      <div className="rounded-2xl border-2 border-dashed border-gray-300 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">Budget Streak</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl font-extrabold text-emerald-500 leading-none tabular-nums">
                {streak}
              </span>
              <span className="text-sm font-semibold text-gray-500">days!</span>
            </div>
          </div>

          {/* 7-day dot tracker — the "oval" from the sketch */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              This week
            </p>
            <div className="flex gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-2">
              {last7.map((active, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-colors ${
                    active
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-100'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Contextual message */}
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          {streak === 0
            ? 'Log an expense today to start your streak!'
            : streak >= 14
            ? `On fire! ${streak} days of consistent tracking. 🔥`
            : streak >= 7
            ? `Great momentum — ${streak} days in a row!`
            : `${streak} consecutive day${streak !== 1 ? 's' : ''} of expense tracking.`}
        </p>
      </div>

    </div>
  );
}

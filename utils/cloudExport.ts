import { Expense, CATEGORIES, Category } from '@/types';
import { formatDate, getYearMonth, formatMonthYear } from './formatters';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type ExportStatus      = 'success' | 'pending' | 'failed';
export type LinkExpiry        = '24h' | '7d' | '30d' | 'never';

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  groupBy?: 'category' | 'month';
  sortBy: 'date' | 'amount' | 'category';
}

export interface ExportSchedule {
  id: string;
  templateId: string;
  templateName: string;
  destination: string;
  frequency: ScheduleFrequency;
  dayOfWeek: number;
  dayOfMonth: number;
  hour: number;
  enabled: boolean;
  nextRun: string;
  createdAt: string;
}

export interface ExportHistoryItem {
  id: string;
  timestamp: string;
  templateName: string;
  destination: string;
  records: number;
  fileSize: string;
  status: ExportStatus;
  filename: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'tax-report',
    name: 'Tax Report',
    description: 'Category-grouped, ready for tax filing and accountants',
    icon: '🧾',
    badge: 'Popular',
    groupBy: 'category',
    sortBy: 'category',
  },
  {
    id: 'monthly-summary',
    name: 'Monthly Summary',
    description: 'Month-by-month breakdown with running totals',
    icon: '📅',
    groupBy: 'month',
    sortBy: 'date',
  },
  {
    id: 'category-analysis',
    name: 'Category Analysis',
    description: 'Spending by category with percentage insights',
    icon: '📊',
    badge: 'Insights',
    groupBy: 'category',
    sortBy: 'amount',
  },
  {
    id: 'budget-overview',
    name: 'Budget Overview',
    description: 'Actual vs. estimated spending per category',
    icon: '💰',
    sortBy: 'category',
  },
  {
    id: 'year-review',
    name: 'Year in Review',
    description: 'Annual highlights and full spending narrative',
    icon: '🗓️',
    badge: 'New',
    groupBy: 'month',
    sortBy: 'date',
  },
  {
    id: 'full-export',
    name: 'Full Data Dump',
    description: 'Every transaction, all fields, raw format',
    icon: '📦',
    sortBy: 'date',
  },
];

export const CLOUD_DESTINATIONS = [
  { id: 'google-sheets', name: 'Google Sheets', emoji: '📗', color: 'text-green-700 bg-green-50 border-green-200' },
  { id: 'dropbox',       name: 'Dropbox',       emoji: '📦', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'onedrive',      name: 'OneDrive',      emoji: '☁️', color: 'text-sky-700 bg-sky-50 border-sky-200' },
  { id: 'notion',        name: 'Notion',        emoji: '⬜', color: 'text-gray-700 bg-gray-50 border-gray-200' },
  { id: 'slack',         name: 'Slack',         emoji: '💬', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { id: 'airtable',      name: 'Airtable',      emoji: '🔷', color: 'text-orange-700 bg-orange-50 border-orange-200' },
] as const;

export type DestinationId = typeof CLOUD_DESTINATIONS[number]['id'];

// ── Storage helpers ───────────────────────────────────────────────────────────

const HISTORY_KEY  = 'expense-tracker-export-history';
const SCHEDULE_KEY = 'expense-tracker-export-schedules';

function safeJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadHistory():   ExportHistoryItem[] { return safeJSON<ExportHistoryItem[]>(HISTORY_KEY,  []); }
export function loadSchedules(): ExportSchedule[]    { return safeJSON<ExportSchedule[]>(SCHEDULE_KEY, []); }

export function addHistoryItem(item: ExportHistoryItem): void {
  const h = loadHistory();
  h.unshift(item);
  if (h.length > 30) h.splice(30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

export function clearAllHistory(): void { localStorage.removeItem(HISTORY_KEY); }

export function upsertSchedule(s: ExportSchedule): void {
  const arr = loadSchedules();
  const i   = arr.findIndex(x => x.id === s.id);
  if (i >= 0) { arr[i] = s; } else { arr.push(s); }
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(arr));
}

export function removeSchedule(id: string): void {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(loadSchedules().filter(s => s.id !== id)));
}

// ── Utility helpers ───────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateShareToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function estimateFileSize(records: number): string {
  const bytes = records * 120;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function computeNextRun(
  frequency: ScheduleFrequency,
  hour: number,
  dayOfWeek: number,
  dayOfMonth: number,
): string {
  const now  = new Date();
  const next = new Date(now);
  if (frequency === 'daily') {
    next.setDate(now.getDate() + 1);
  } else if (frequency === 'weekly') {
    const diff = ((dayOfWeek - now.getDay()) + 7) % 7 || 7;
    next.setDate(now.getDate() + diff);
  } else {
    next.setMonth(now.getMonth() + 1, dayOfMonth);
  }
  next.setHours(hour, 0, 0, 0);
  return next.toISOString();
}

export function formatNextRun(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// ── CSV generation ────────────────────────────────────────────────────────────

function esc(s: string): string { return `"${s.replace(/"/g, '""')}"`; }

function triggerDownload(csv: string, filename: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function runTemplateExport(
  expenses: Expense[],
  template: ExportTemplate,
  filename: string,
): void {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  let rows: string[] = [];

  if (template.groupBy === 'category') {
    rows.push('Category,Date,Description,Amount');
    const groups: Partial<Record<Category, Expense[]>> = {};
    for (const e of expenses) {
      if (!groups[e.category]) groups[e.category] = [];
      groups[e.category]!.push(e);
    }
    for (const cat of CATEGORIES) {
      const ces = groups[cat];
      if (!ces || ces.length === 0) continue;
      for (const e of ces) {
        rows.push(`${cat},${formatDate(e.date)},${esc(e.description)},${e.amount.toFixed(2)}`);
      }
      const sub = ces.reduce((s, e) => s + e.amount, 0);
      rows.push(`${cat} Subtotal,,,${sub.toFixed(2)}`);
      rows.push('');
    }
    rows.push(`,,TOTAL,${total.toFixed(2)}`);

  } else if (template.groupBy === 'month') {
    rows.push('Month,Date,Description,Category,Amount');
    const groups: Record<string, Expense[]> = {};
    for (const e of expenses) {
      const ym = getYearMonth(e.date);
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(e);
    }
    for (const ym of Object.keys(groups).sort()) {
      const mes = groups[ym];
      for (const e of mes) {
        rows.push(`${formatMonthYear(ym)},${formatDate(e.date)},${esc(e.description)},${e.category},${e.amount.toFixed(2)}`);
      }
      const sub = mes.reduce((s, e) => s + e.amount, 0);
      rows.push(`${formatMonthYear(ym)} Total,,,,${sub.toFixed(2)}`);
      rows.push('');
    }
    rows.push(`,,,GRAND TOTAL,${total.toFixed(2)}`);

  } else {
    rows.push('Date,Description,Category,Amount');
    for (const e of [...expenses].sort((a, b) => a.date.localeCompare(b.date))) {
      rows.push(`${formatDate(e.date)},${esc(e.description)},${e.category},${e.amount.toFixed(2)}`);
    }
    rows.push('');
    rows.push(`,,TOTAL,${total.toFixed(2)}`);
  }

  triggerDownload(rows.join('\n'), filename);
}

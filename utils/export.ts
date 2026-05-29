import { Expense } from '@/types';
import { formatDate } from './formatters';

export function exportToCSV(expenses: Expense[], filename?: string): void {
  if (expenses.length === 0) return;

  // Column order: Date, Category, Amount, Description
  const headers = ['Date', 'Category', 'Amount', 'Description'];
  const rows = expenses.map((e) => [
    formatDate(e.date),
    e.category,
    e.amount.toFixed(2),
    `"${e.description.replace(/"/g, '""')}"`,
  ]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRow = ['', 'TOTAL', total.toFixed(2), ''];

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
    '',
    totalRow.join(','),
  ].join('\n');

  const BOM = '﻿'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import { Expense } from '@/types';
import { formatCurrency, formatDate } from './formatters';

export type ExportFormat = 'csv' | 'json' | 'pdf';

// ── helpers ─────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── CSV ──────────────────────────────────────────────────────────────────────

export function exportAsCSV(expenses: Expense[], filename: string): void {
  const BOM = '﻿'; // Excel UTF-8 compatibility
  const headers = ['Date', 'Category', 'Amount', 'Description'];
  const rows = expenses.map((e) => [
    formatDate(e.date),
    e.category,
    e.amount.toFixed(2),
    `"${e.description.replace(/"/g, '""')}"`,
  ]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const csv = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
    '',
    `Total,,${total.toFixed(2)},`,
  ].join('\n');
  triggerDownload(
    new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' }),
    filename.endsWith('.csv') ? filename : `${filename}.csv`,
  );
}

// ── JSON ─────────────────────────────────────────────────────────────────────

export function exportAsJSON(expenses: Expense[], filename: string): void {
  const payload = {
    exported_at: new Date().toISOString(),
    total_records: expenses.length,
    total_amount: parseFloat(
      expenses.reduce((s, e) => s + e.amount, 0).toFixed(2),
    ),
    currency: 'USD',
    expenses: expenses.map((e) => ({
      date: e.date,
      category: e.category,
      amount: e.amount,
      description: e.description,
    })),
  };
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    filename.endsWith('.json') ? filename : `${filename}.json`,
  );
}

// ── PDF ──────────────────────────────────────────────────────────────────────

export async function exportAsPDF(
  expenses: Expense[],
  filename: string,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Brand header ──
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 18, 'F');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ExpenseTrack', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 230);
  doc.text('Personal Finance Report', 76, 12);

  // ── Report meta ──
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Report', 14, 30);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  const genDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.text(`Generated: ${genDate}`, 14, 37);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // ── KPI pills ──
  const pills = [
    { label: 'Records', value: expenses.length.toString() },
    { label: 'Total',   value: formatCurrency(total) },
    { label: 'Average', value: expenses.length ? formatCurrency(total / expenses.length) : '$0' },
  ];
  pills.forEach((p, i) => {
    const x = 14 + i * 62;
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(x, 43, 56, 14, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(99, 102, 241);
    doc.setFont('helvetica', 'normal');
    doc.text(p.label, x + 5, 49);
    doc.setFontSize(10);
    doc.setTextColor(55, 48, 163);
    doc.setFont('helvetica', 'bold');
    doc.text(p.value, x + 5, 54);
  });

  // ── Table ──
  autoTable(doc, {
    startY: 64,
    head: [['Date', 'Category', 'Amount', 'Description']],
    body: expenses.map((e) => [
      formatDate(e.date),
      e.category,
      formatCurrency(e.amount),
      e.description,
    ]),
    foot: [['', 'TOTAL', formatCurrency(total), '']],
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 28 },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
    tableLineColor: [229, 231, 235],
    tableLineWidth: 0.1,
  });

  // ── Footer ──
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}  ·  ExpenseTrack`,
      14,
      doc.internal.pageSize.getHeight() - 6,
    );
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

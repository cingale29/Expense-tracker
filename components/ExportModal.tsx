'use client';

import { useState, useMemo } from 'react';
import {
  X, Download, FileText, Braces, FileImage,
  Calendar, Tag, Hash, DollarSign,
  CheckSquare, Square, Loader2, AlertCircle,
  ChevronDown,
} from 'lucide-react';
import {
  Expense, Category, CATEGORIES, CATEGORY_BG, CATEGORY_EMOJI,
} from '@/types';
import { formatCurrency, formatDate, getTodayString } from '@/utils/formatters';
import {
  ExportFormat, exportAsCSV, exportAsJSON, exportAsPDF,
} from '@/utils/exportAdvanced';

interface Props {
  expenses: Expense[];
  onClose: () => void;
}

// ── Format config ────────────────────────────────────────────────────────────

const FORMATS: {
  id: ExportFormat;
  label: string;
  ext: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  description: string;
}[] = [
  {
    id: 'csv', label: 'CSV', ext: '.csv', icon: FileText,
    color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200',
    description: 'Spreadsheet-ready, opens in Excel',
  },
  {
    id: 'json', label: 'JSON', ext: '.json', icon: Braces,
    color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200',
    description: 'Structured data for developers',
  },
  {
    id: 'pdf', label: 'PDF', ext: '.pdf', icon: FileImage,
    color: 'text-red-600', bg: 'bg-red-50 border-red-200',
    description: 'Print-ready formatted report',
  },
];

const PREVIEW_ROWS = 6;

// ── Component ────────────────────────────────────────────────────────────────

export default function ExportModal({ expenses, onClose }: Props) {
  const today = getTodayString();

  const [format, setFormat]         = useState<ExportFormat>('csv');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [cats, setCats]             = useState<Set<Category>>(new Set(CATEGORIES));
  const [filename, setFilename]     = useState(`expenses-${today}`);
  const [isExporting, setExporting] = useState(false);
  const [done, setDone]             = useState(false);

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => expenses.filter((e) => {
    if (startDate && e.date < startDate) return false;
    if (endDate   && e.date > endDate)   return false;
    if (!cats.has(e.category))           return false;
    return true;
  }), [expenses, startDate, endDate, cats]);

  const total    = filtered.reduce((s, e) => s + e.amount, 0);
  const preview  = filtered.slice(0, PREVIEW_ROWS);
  const overflow = filtered.length - preview.length;
  const fmt      = FORMATS.find((f) => f.id === format)!;

  // ── Handlers ─────────────────────────────────────────────────────────────

  function toggleCat(c: Category) {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) { next.delete(c); } else { next.add(c); }
      return next;
    });
  }

  function toggleAll() {
    setCats(cats.size === CATEGORIES.length ? new Set() : new Set(CATEGORIES));
  }

  async function handleExport() {
    if (filtered.length === 0) return;
    setExporting(true);
    // Small artificial delay so loading state is visible
    await new Promise((r) => setTimeout(r, 400));
    try {
      if (format === 'csv')  exportAsCSV(filtered, filename);
      if (format === 'json') exportAsJSON(filtered, filename);
      if (format === 'pdf')  await exportAsPDF(filtered, filename);
      setDone(true);
      setTimeout(() => { setDone(false); }, 2500);
    } finally {
      setExporting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Export Expenses</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Choose format, apply filters, preview your data
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 min-h-0">

            {/* LEFT: Controls */}
            <div className="lg:col-span-2 px-6 py-5 space-y-5 border-b lg:border-b-0 lg:border-r border-gray-100">

              {/* Format */}
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Format
                </p>
                <div className="space-y-2">
                  {FORMATS.map((f) => {
                    const Icon = f.icon;
                    const active = format === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFormat(f.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                          active
                            ? `${f.bg} border-current ring-1 ring-current/20`
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? f.bg : 'bg-gray-100'}`}>
                          <Icon size={16} className={active ? f.color : 'text-gray-500'} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`text-sm font-semibold ${active ? f.color : 'text-gray-700'}`}>
                            {f.label}
                          </span>
                          <span className="block text-xs text-gray-400 truncate">{f.description}</span>
                        </span>
                        {active && (
                          <span className={`w-2 h-2 rounded-full ${f.color.replace('text-', 'bg-')} shrink-0`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Date range */}
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Calendar size={11} /> Date Range
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">From</label>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || today}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">To</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      max={today}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    />
                  </div>
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 mt-1"
                  >
                    Clear dates
                  </button>
                )}
              </section>

              {/* Categories */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Tag size={11} /> Categories
                  </p>
                  <button
                    onClick={toggleAll}
                    className="text-xs text-indigo-500 hover:text-indigo-700"
                  >
                    {cats.size === CATEGORIES.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-1">
                  {CATEGORIES.map((c) => {
                    const checked = cats.has(c);
                    return (
                      <button
                        key={c}
                        onClick={() => toggleCat(c)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                          checked ? 'bg-gray-50' : 'opacity-50'
                        } hover:bg-gray-100`}
                      >
                        {checked
                          ? <CheckSquare size={14} className="text-indigo-500 shrink-0" />
                          : <Square size={14} className="text-gray-300 shrink-0" />}
                        <span className="text-sm">{CATEGORY_EMOJI[c]}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_BG[c]}`}>
                          {c}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Filename */}
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Filename
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value || `expenses-${today}`)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    placeholder="expenses-2024"
                  />
                  <span className="text-xs text-gray-400 shrink-0">{fmt.ext}</span>
                </div>
              </section>
            </div>

            {/* RIGHT: Preview */}
            <div className="lg:col-span-3 px-6 py-5 flex flex-col gap-4">

              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Hash,       label: 'Records',  value: filtered.length.toString() },
                  { icon: DollarSign, label: 'Total',    value: formatCurrency(total) },
                  { icon: Tag,        label: 'Categories', value: `${cats.size} / ${CATEGORIES.length}` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5 text-center border border-gray-100">
                    <Icon size={13} className="text-indigo-400 mx-auto mb-1" />
                    <p className="text-base font-bold text-gray-900 leading-none">{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Data Preview
                </p>

                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-52 text-gray-400 gap-2 border border-dashed border-gray-200 rounded-xl">
                    <AlertCircle size={28} className="text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">No records match your filters</p>
                    <p className="text-xs">Try widening the date range or selecting more categories</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            {['Date', 'Category', 'Amount', 'Description'].map((h) => (
                              <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {preview.map((e) => (
                            <tr key={e.id} className="hover:bg-gray-50/60">
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(e.date)}</td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_BG[e.category]}`}>
                                  {CATEGORY_EMOJI[e.category]} {e.category}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(e.amount)}</td>
                              <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{e.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {overflow > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border-t border-indigo-100 text-xs text-indigo-600">
                        <ChevronDown size={12} />
                        {overflow} more record{overflow !== 1 ? 's' : ''} will be included in the export
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
          <p className="text-xs text-gray-500">
            {filtered.length > 0
              ? <>Exporting <span className="font-semibold text-gray-700">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span> · {formatCurrency(total)} total as <span className="font-semibold text-gray-700">{filename}{fmt.ext}</span></>
              : <span className="text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> No records selected</span>
            }
          </p>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || filtered.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                done
                  ? 'bg-emerald-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isExporting ? (
                <><Loader2 size={15} className="animate-spin" /> Exporting…</>
              ) : done ? (
                <><span>✓</span> Exported!</>
              ) : (
                <><Download size={15} /> Export {filtered.length} record{filtered.length !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

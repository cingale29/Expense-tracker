'use client';

import { useState, useEffect } from 'react';
import {
  X, Send, RefreshCw, Share2, Clock, Mail,
  Loader2, Download, Copy, Check, Trash2, Plus,
  Globe, QrCode, Link, AlertCircle, Zap,
  CheckCircle, FileText,
} from 'lucide-react';
import { Expense } from '@/types';
import { formatCurrency, getTodayString } from '@/utils/formatters';
import {
  EXPORT_TEMPLATES, CLOUD_DESTINATIONS,
  ExportTemplate, ExportSchedule, ExportHistoryItem,
  ScheduleFrequency, LinkExpiry,
  generateId, generateShareToken, estimateFileSize,
  computeNextRun, formatNextRun,
  loadHistory, loadSchedules,
  addHistoryItem, clearAllHistory,
  upsertSchedule, removeSchedule,
  runTemplateExport,
} from '@/utils/cloudExport';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'templates' | 'send' | 'schedule' | 'share' | 'history';

const TABS: { id: TabId; label: string; Icon: React.ElementType; hint: string }[] = [
  { id: 'templates', label: 'Templates',   Icon: FileText,   hint: 'Smart formats'      },
  { id: 'send',      label: 'Send & Sync', Icon: Send,       hint: 'Email & cloud'      },
  { id: 'schedule',  label: 'Auto-Backup', Icon: RefreshCw,  hint: 'Recurring exports'  },
  { id: 'share',     label: 'Share Link',  Icon: Share2,     hint: 'URLs & QR codes'    },
  { id: 'history',   label: 'History',     Icon: Clock,      hint: 'Past exports'       },
];

// ── QR Code visual ────────────────────────────────────────────────────────────

function QRGrid({ value }: { value: string }) {
  const SIZE = 13;
  const seed = value.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
  const cells = Array.from({ length: SIZE * SIZE }, (_, i) => {
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    if ((x < 3 && y < 3) || (x > SIZE - 4 && y < 3) || (x < 3 && y > SIZE - 4)) return true;
    return ((seed * (i + 1) * 0x9E3779B9) >>> 0) % 5 < 2;
  });
  return (
    <div className="inline-block p-3 bg-white rounded-xl border-2 border-gray-200 shadow-inner">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SIZE}, 10px)`,
          gap: '2px',
        }}
      >
        {cells.map((filled, i) => (
          <div
            key={i}
            style={{
              width: 10, height: 10, borderRadius: 1,
              backgroundColor: filled ? '#1e1b4b' : '#ffffff',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExportHistoryItem['status'] }) {
  if (status === 'success') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Check size={9} /> Done
    </span>
  );
  if (status === 'pending') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <Loader2 size={9} className="animate-spin" /> Pending
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
      <AlertCircle size={9} /> Failed
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  expenses: Expense[];
  onClose: () => void;
}

export default function CloudExportModal({ expenses, onClose }: Props) {
  const today = getTodayString();
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // ── Tab state ────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabId>('templates');

  // ── Templates tab ────────────────────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>(EXPORT_TEMPLATES[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone]   = useState(false);

  // ── Send & Sync tab ──────────────────────────────────────────────────────────
  const [emailAddress, setEmailAddress]   = useState('');
  const [emailState, setEmailState]       = useState<'idle' | 'sending' | 'sent'>('idle');
  const [connected, setConnected]         = useState<Set<string>>(new Set());
  const [connecting, setConnecting]       = useState<string | null>(null);

  // ── Schedule tab ─────────────────────────────────────────────────────────────
  const [schedFreq,       setSchedFreq]       = useState<ScheduleFrequency>('weekly');
  const [schedHour,       setSchedHour]       = useState(9);
  const [schedDOW,        setSchedDOW]        = useState(1);
  const [schedDOM,        setSchedDOM]        = useState(1);
  const [schedTemplateId, setSchedTemplateId] = useState(EXPORT_TEMPLATES[0].id);
  const [schedules,       setSchedules]       = useState<ExportSchedule[]>([]);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [scheduleSaved,   setScheduleSaved]   = useState(false);

  // ── Share tab ────────────────────────────────────────────────────────────────
  const [shareLink,     setShareLink]     = useState('');
  const [copied,        setCopied]        = useState(false);
  const [showQR,        setShowQR]        = useState(false);
  const [linkExpiry,    setLinkExpiry]    = useState<LinkExpiry>('7d');
  const [generatingLink, setGeneratingLink] = useState(false);

  // ── History tab ──────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<ExportHistoryItem[]>([]);

  // Load persisted data
  useEffect(() => {
    setHistory(loadHistory());
    setSchedules(loadSchedules());
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleExport(destLabel = 'Downloaded') {
    if (expenses.length === 0) return;
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 700));
    const filename = `${selectedTemplate.id}-${today}`;
    runTemplateExport(expenses, selectedTemplate, filename);
    const item: ExportHistoryItem = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      templateName: selectedTemplate.name,
      destination: destLabel,
      records: expenses.length,
      fileSize: estimateFileSize(expenses.length),
      status: 'success',
      filename: `${filename}.csv`,
    };
    addHistoryItem(item);
    setHistory(prev => [item, ...prev]);
    setIsExporting(false);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2500);
  }

  async function handleEmailSend() {
    if (!emailAddress.trim()) return;
    setEmailState('sending');
    await new Promise(r => setTimeout(r, 1800));
    runTemplateExport(expenses, selectedTemplate, `${selectedTemplate.id}-${today}`);
    const item: ExportHistoryItem = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      templateName: selectedTemplate.name,
      destination: `Email → ${emailAddress}`,
      records: expenses.length,
      fileSize: estimateFileSize(expenses.length),
      status: 'success',
      filename: `${selectedTemplate.id}-${today}.csv`,
    };
    addHistoryItem(item);
    setHistory(prev => [item, ...prev]);
    setEmailState('sent');
    setTimeout(() => { setEmailState('idle'); setEmailAddress(''); }, 3000);
  }

  async function handleConnect(serviceId: string) {
    setConnecting(serviceId);
    await new Promise(r => setTimeout(r, 2000));
    setConnected(prev => { const n = new Set(prev); n.add(serviceId); return n; });
    setConnecting(null);
  }

  async function handleCreateSchedule() {
    setCreatingSchedule(true);
    await new Promise(r => setTimeout(r, 600));
    const tmpl = EXPORT_TEMPLATES.find(t => t.id === schedTemplateId) ?? EXPORT_TEMPLATES[0];
    const schedule: ExportSchedule = {
      id: generateId(),
      templateId: schedTemplateId,
      templateName: tmpl.name,
      destination: 'Local Download',
      frequency: schedFreq,
      dayOfWeek: schedDOW,
      dayOfMonth: schedDOM,
      hour: schedHour,
      enabled: true,
      nextRun: computeNextRun(schedFreq, schedHour, schedDOW, schedDOM),
      createdAt: new Date().toISOString(),
    };
    upsertSchedule(schedule);
    setSchedules(prev => [...prev, schedule]);
    setCreatingSchedule(false);
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 2500);
  }

  async function handleGenerateLink() {
    setGeneratingLink(true);
    await new Promise(r => setTimeout(r, 1000));
    const token = generateShareToken();
    const expiry = linkExpiry !== 'never' ? `?expires=${linkExpiry}` : '';
    setShareLink(`https://expensetrack.app/share/${token}${expiry}`);
    setShowQR(false);
    setGeneratingLink(false);
  }

  function handleCopyLink() {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleScheduleEnabled(id: string) {
    setSchedules(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, enabled: !s.enabled };
      upsertSchedule(updated);
      return updated;
    }));
  }

  function deleteScheduleItem(id: string) {
    removeSchedule(id);
    setSchedules(prev => prev.filter(s => s.id !== id));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-6 py-5 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Globe size={18} className="text-white/90" />
                <h2 className="text-lg font-bold text-white">Cloud Export Hub</h2>
                <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {expenses.length} records
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Connected · Automated · Shareable — {formatCurrency(total)} total
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Connected service badges */}
          {connected.size > 0 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <span className="text-[10px] text-indigo-200 font-medium">Connected:</span>
              {CLOUD_DESTINATIONS.filter(d => connected.has(d.id)).map(d => (
                <span key={d.id} className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  {d.emoji} {d.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b border-gray-100 bg-gray-50/80 overflow-x-auto shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 min-w-0 flex flex-col items-center gap-1 px-2 py-3 text-center transition-all border-b-2 ${
                tab === id
                  ? 'border-indigo-500 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={15} />
              <span className="text-[10px] font-semibold leading-none whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ TEMPLATES TAB ══════════════════════════════════════════════════ */}
          {tab === 'templates' && (
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Choose a template that matches your goal — each generates a tailored CSV structure.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {EXPORT_TEMPLATES.map(tmpl => {
                    const active = selectedTemplate.id === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(tmpl)}
                        className={`relative text-left rounded-xl border-2 p-3 transition-all ${
                          active
                            ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {tmpl.badge && (
                          <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            tmpl.badge === 'Popular'  ? 'bg-amber-100 text-amber-700' :
                            tmpl.badge === 'Insights' ? 'bg-blue-100 text-blue-700'  :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {tmpl.badge}
                          </span>
                        )}
                        {active && (
                          <CheckCircle size={12} className="absolute top-2 right-2 text-indigo-500" />
                        )}
                        <div className="text-xl mb-1.5">{tmpl.icon}</div>
                        <p className={`text-xs font-semibold leading-tight ${active ? 'text-indigo-700' : 'text-gray-800'}`}>
                          {tmpl.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{tmpl.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview spec */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{selectedTemplate.icon}</span>
                  <span className="text-sm font-semibold text-gray-800">{selectedTemplate.name}</span>
                  <span className="ml-auto text-[10px] text-gray-400">{estimateFileSize(expenses.length)}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{selectedTemplate.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Date', 'Description', 'Category', 'Amount',
                    selectedTemplate.groupBy === 'category' ? 'Subtotals' :
                    selectedTemplate.groupBy === 'month'    ? 'Monthly Groups' : 'Grand Total'
                  ].map(f => (
                    <span key={f} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ SEND & SYNC TAB ════════════════════════════════════════════════ */}
          {tab === 'send' && (
            <div className="p-5 space-y-5">

              {/* Email section */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <Mail size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Email Report</p>
                    <p className="text-[10px] text-gray-400">Send directly to any inbox</p>
                  </div>
                </div>

                {emailState === 'sent' ? (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Report sent!</p>
                      <p className="text-xs text-emerald-600">A copy downloaded to your device too.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={e => setEmailAddress(e.target.value)}
                      placeholder="colleague@company.com"
                      className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    />
                    <button
                      onClick={handleEmailSend}
                      disabled={!emailAddress.trim() || emailState === 'sending'}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {emailState === 'sending'
                        ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                        : <><Send size={14} /> Send</>
                      }
                    </button>
                  </div>
                )}
              </section>

              {/* Cloud services */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center">
                    <Zap size={14} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Cloud Integrations</p>
                    <p className="text-[10px] text-gray-400">Connect once, sync automatically</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CLOUD_DESTINATIONS.map(dest => {
                    const isConnected  = connected.has(dest.id);
                    const isConnecting = connecting === dest.id;
                    return (
                      <div
                        key={dest.id}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all ${
                          isConnected ? dest.color : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className="text-lg leading-none">{dest.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${isConnected ? '' : 'text-gray-700'}`}>
                            {dest.name}
                          </p>
                          {isConnected ? (
                            <p className="text-[10px] font-medium opacity-70">Connected ✓</p>
                          ) : (
                            <button
                              onClick={() => handleConnect(dest.id)}
                              disabled={isConnecting}
                              className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isConnecting ? <><Loader2 size={9} className="animate-spin" /> Connecting…</> : '+ Connect'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                  <AlertCircle size={10} /> OAuth authorization required. Simulated UI — no real data is sent.
                </p>
              </section>
            </div>
          )}

          {/* ══ SCHEDULE TAB ═══════════════════════════════════════════════════ */}
          {tab === 'schedule' && (
            <div className="p-5 space-y-5">

              {/* New schedule form */}
              <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Plus size={14} className="text-indigo-500" /> New Backup Schedule
                </p>

                {/* Template */}
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1.5">Template</label>
                  <select
                    value={schedTemplateId}
                    onChange={e => setSchedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {EXPORT_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Frequency */}
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1.5">Frequency</label>
                  <div className="flex gap-2">
                    {(['daily', 'weekly', 'monthly'] as ScheduleFrequency[]).map(f => (
                      <button
                        key={f}
                        onClick={() => setSchedFreq(f)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                          schedFreq === f
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional day selector */}
                {schedFreq === 'weekly' && (
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1.5">Day of week</label>
                    <div className="flex gap-1">
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <button
                          key={i}
                          onClick={() => setSchedDOW(i)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            schedDOW === i
                              ? 'bg-indigo-500 text-white border-indigo-500'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {schedFreq === 'monthly' && (
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1.5">Day of month</label>
                    <select
                      value={schedDOM}
                      onChange={e => setSchedDOM(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Time */}
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1.5">Time</label>
                  <select
                    value={schedHour}
                    onChange={e => setSchedHour(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {Array.from({ length: 24 }, (_, h) => {
                      const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
                      return <option key={h} value={h}>{label}</option>;
                    })}
                  </select>
                </div>

                {/* Next run preview */}
                <div className="bg-indigo-50 rounded-lg px-3 py-2 text-xs text-indigo-700 flex items-center gap-2">
                  <Clock size={12} className="shrink-0" />
                  Next run: <strong>{formatNextRun(computeNextRun(schedFreq, schedHour, schedDOW, schedDOM))}</strong>
                </div>

                <button
                  onClick={handleCreateSchedule}
                  disabled={creatingSchedule}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    scheduleSaved
                      ? 'bg-emerald-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
                  }`}
                >
                  {creatingSchedule ? (
                    <><Loader2 size={14} className="animate-spin" /> Scheduling…</>
                  ) : scheduleSaved ? (
                    <><Check size={14} /> Schedule Saved!</>
                  ) : (
                    <><RefreshCw size={14} /> Create Backup Schedule</>
                  )}
                </button>
              </section>

              {/* Active schedules */}
              {schedules.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Active Schedules ({schedules.length})
                  </p>
                  <div className="space-y-2">
                    {schedules.map(s => (
                      <div key={s.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 bg-white">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${s.enabled ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{s.templateName}</p>
                          <p className="text-[10px] text-gray-400 capitalize">
                            {s.frequency} · Next: {formatNextRun(s.nextRun)}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleScheduleEnabled(s.id)}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                            s.enabled
                              ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                              : 'border-gray-200 text-gray-500 bg-gray-50'
                          }`}
                        >
                          {s.enabled ? 'On' : 'Off'}
                        </button>
                        <button
                          onClick={() => deleteScheduleItem(s.id)}
                          className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {schedules.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-xs">
                  No schedules yet. Create one above to automate your exports.
                </div>
              )}
            </div>
          )}

          {/* ══ SHARE TAB ══════════════════════════════════════════════════════ */}
          {tab === 'share' && (
            <div className="p-5 space-y-5">

              {/* Link expiry */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Link Expiry</p>
                <div className="flex gap-2">
                  {(['24h', '7d', '30d', 'never'] as LinkExpiry[]).map(e => (
                    <button
                      key={e}
                      onClick={() => setLinkExpiry(e)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        linkExpiry === e
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {e === '24h' ? '24 Hours' : e === '7d' ? '7 Days' : e === '30d' ? '30 Days' : 'Never'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerateLink}
                disabled={generatingLink || expenses.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
              >
                {generatingLink ? (
                  <><Loader2 size={15} className="animate-spin" /> Generating link…</>
                ) : (
                  <><Link size={15} /> Generate Shareable Link</>
                )}
              </button>

              {/* Link display */}
              {shareLink && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                    <Globe size={13} className="text-indigo-400 shrink-0" />
                    <span className="flex-1 text-xs text-gray-600 truncate font-mono">{shareLink}</span>
                    <button
                      onClick={handleCopyLink}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        copied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <AlertCircle size={12} className="text-amber-500 shrink-0" />
                    Recipients get a read-only snapshot. No account required.
                  </div>

                  {/* QR toggle */}
                  <button
                    onClick={() => setShowQR(prev => !prev)}
                    className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <QrCode size={14} />
                    {showQR ? 'Hide' : 'Show'} QR Code
                  </button>

                  {showQR && (
                    <div className="flex flex-col items-center gap-2 py-3">
                      <QRGrid value={shareLink} />
                      <p className="text-[10px] text-gray-400">Scan to open on mobile</p>
                    </div>
                  )}
                </div>
              )}

              {!shareLink && !generatingLink && (
                <div className="text-center py-6 text-gray-400">
                  <Share2 size={32} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-sm font-medium text-gray-500">No link generated yet</p>
                  <p className="text-xs">Click the button above to create a shareable snapshot</p>
                </div>
              )}
            </div>
          )}

          {/* ══ HISTORY TAB ════════════════════════════════════════════════════ */}
          {tab === 'history' && (
            <div className="p-5">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-2">
                  <Clock size={36} className="text-gray-200" />
                  <p className="text-sm font-medium text-gray-500">No export history yet</p>
                  <p className="text-xs">Your exports will appear here</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {history.length} export{history.length !== 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={() => { clearAllHistory(); setHistory([]); }}
                      className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Clear all
                    </button>
                  </div>

                  <div className="space-y-2">
                    {history.map(item => (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 text-sm">
                          {EXPORT_TEMPLATES.find(t => t.name === item.templateName)?.icon ?? '📄'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{item.templateName}</p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {item.destination} · {item.records} records · {item.fileSize}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(item.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <StatusBadge status={item.status} />
                          <button
                            onClick={() => runTemplateExport(
                              expenses,
                              EXPORT_TEMPLATES.find(t => t.name === item.templateName) ?? EXPORT_TEMPLATES[5],
                              item.filename.replace('.csv', ''),
                            )}
                            className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 font-medium"
                          >
                            <Download size={10} /> Re-download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
          <div className="text-xs text-gray-500">
            {tab === 'templates' && (
              <span>
                Template: <strong className="text-gray-700">{selectedTemplate.icon} {selectedTemplate.name}</strong>
                {' · '}{expenses.length} records · {formatCurrency(total)}
              </span>
            )}
            {tab === 'send' && <span>Using template: <strong className="text-gray-700">{selectedTemplate.name}</strong></span>}
            {tab === 'schedule' && <span>Schedules run automatically at the configured time</span>}
            {tab === 'share' && <span>Links are read-only and don&apos;t require sign-in</span>}
            {tab === 'history' && <span>Last 30 exports are retained locally</span>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleExport('Downloaded')}
              disabled={isExporting || expenses.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                exportDone
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white'
              }`}
            >
              {isExporting ? (
                <><Loader2 size={15} className="animate-spin" /> Exporting…</>
              ) : exportDone ? (
                <><Check size={15} /> Exported!</>
              ) : (
                <><Download size={15} /> Export Now</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

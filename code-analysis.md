# Export Feature — Code Analysis
**Branches:** `feature-data-export-v1` · `feature-data-export-v2` · `feature-data-export-v3`  
**Date:** June 2026  
**Project:** ExpenseTrack — Next.js 14 / TypeScript / Tailwind CSS

---

## Quick Comparison Table

| Dimension | V1 — Simple CSV | V2 — Advanced Local | V3 — Cloud Hub |
|---|---|---|---|
| **Files created** | 0 new | 2 new | 2 new |
| **Files modified** | 1 + 1 util | 2 pages | 2 pages |
| **New lines of code** | ~5 (net delta) | ~830 | ~1,130 |
| **Largest single file** | 36 lines | 382 lines (modal) | 838 lines (modal) |
| **New dependencies** | None | jspdf, jspdf-autotable | None |
| **Output formats** | CSV only | CSV, JSON, PDF | CSV (template-aware) |
| **Filtering** | None | Date range + category | Per-template structure |
| **User interaction model** | Single click | 2-pane config modal | 5-tab SaaS modal |
| **State management** | None (pure function) | 6 useState + useMemo | 20+ useState + useEffect |
| **Persistence** | None | None | localStorage (history + schedules) |
| **Async operations** | None | Artificial delay + jsPDF | Multiple simulated async flows |
| **Preview before export** | None | Live 6-row data table | Template spec card |
| **Mobile considerations** | Hidden on mobile | Stacked layout | Scrollable tab bar |

---

## Version 1 — Simple CSV Export

### Files Changed
```
utils/export.ts        (modified — +7 lines to existing 35)
app/page.tsx           (modified — button onClick swap only)
```

### Architecture Overview
V1 is a **pure utility function** wired directly to a button click. There is no new component, no new state, no modal. The architecture is intentionally flat:

```
User clicks button
  └─> exportToCSV(expenses)   [utils/export.ts]
        ├─ build CSV string
        └─ trigger browser download via anchor click
```

### Key Implementation Details

**Export function signature:**
```typescript
export function exportToCSV(expenses: Expense[], filename?: string): void
```

**CSV generation approach:**
- Manual string construction with `Array.join(',')`
- Explicit UTF-8 BOM (`﻿`) prepended for Excel compatibility
- Description field quote-escaped: `"${e.description.replace(/"/g, '""')}"`
- Column order: `Date, Category, Amount, Description`
- Footer total row appended after blank separator line
- Filename defaults to `expenses-YYYY-MM-DD` (ISO date from `new Date().toISOString()`)

**Download mechanism** (shared pattern across all versions):
```typescript
const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
const url  = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href     = url;
link.download = filename;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(url);
```
This is the standard browser-download pattern — creates an in-memory object URL, triggers a synthetic anchor click, then immediately revokes the URL to free memory.

**Integration point in `app/page.tsx`:**
```tsx
onClick={() => exportToCSV(expenses)}
```
No new state. No modal. The function is called inline.

### State Management
None. The function receives `expenses` as a parameter and derives everything from it.

### Error Handling
- Implicit guard: `if (expenses.length === 0) return;` at the start
- No try/catch — the only failure mode is a browser API issue, which would be silently swallowed
- The button has `disabled={expenses.length === 0}` in the UI as a redundant guard

### Security Considerations
- All data is local — no network requests
- Description field is properly CSV-escaped (double-quote encoding)
- No user input is accepted

### Performance
- O(n) time and space proportional to expense count
- Synchronous — blocks the main thread briefly on very large datasets (thousands of rows), but negligible for typical personal finance use
- No memoization needed

### Extensibility
- The optional `filename` parameter is the only hook for customization
- Adding columns requires modifying the function directly — no configuration layer
- No support for filtering; callers must pre-filter the array before passing it in

---

## Version 2 — Advanced Local Export

### Files Changed
```
components/ExportModal.tsx      (NEW — 382 lines)
utils/exportAdvanced.ts         (NEW — 178 lines)
app/page.tsx                    (modified — modal state + import)
app/expenses/page.tsx           (modified — modal state + import)
package.json / package-lock.json (modified — 2 new deps)
```

### Architecture Overview
V2 introduces a **configuration-before-export** pattern. The user opens a modal, configures the export (format, date range, categories, filename), previews the result, then triggers the download.

```
User clicks "Export Data"
  └─> ExportModal opens (state: format, dates, categories, filename)
        ├─ useMemo: filtered = expenses filtered by current config
        ├─ LEFT PANEL:
        │    ├─ Format selector (3 cards: CSV / JSON / PDF)
        │    ├─ Date range pickers (From / To with min/max constraints)
        │    ├─ Category checkboxes (toggle individual + select-all)
        │    └─ Filename input
        └─ RIGHT PANEL:
             ├─ Summary KPIs (records, total, categories selected)
             └─ Data preview table (first 6 rows + overflow count)

User clicks "Export N records"
  └─> handleExport() [async]
        ├─ setExporting(true)
        ├─ 400ms artificial delay (UX: makes loading state visible)
        ├─ exportAsCSV / exportAsJSON / exportAsPDF [utils/exportAdvanced.ts]
        └─ setDone(true) → green "Exported!" → resets after 2.5s
```

### Key Components and Responsibilities

**`ExportModal` (components/ExportModal.tsx)**
- Single component, no sub-components
- Props: `{ expenses: Expense[]; onClose: () => void }`
- Manages all configuration state internally
- Uses `useMemo` for the filter derivation (performance optimization — avoids re-filtering on every render)
- 5-8 `useState` hooks + 1 `useMemo`
- Layout: responsive 2-column grid (`lg:grid-cols-5`) — controls on left, preview on right; stacks vertically on mobile

**`exportAdvanced.ts` (utils/exportAdvanced.ts)**
- Three named export functions: `exportAsCSV`, `exportAsJSON`, `exportAsPDF`
- One private helper: `triggerDownload(blob, filename)` — shared download logic
- Zero React dependencies — pure browser utilities

### Export Format Implementation

**CSV:**
- Same BOM + anchor pattern as V1
- Slightly different column order (Date, Category, Amount, Description — same as V1 after v1 was updated)
- Total row appended: `Total,,${total},`

**JSON:**
```typescript
{
  exported_at: string,      // ISO timestamp
  total_records: number,
  total_amount: number,     // parseFloat(toFixed(2)) — avoids floating point artifacts
  currency: "USD",
  expenses: Array<{date, category, amount, description}>
}
```
Envelope pattern: data wrapped in a metadata object. Good API-design practice.

**PDF (jsPDF + jspdf-autotable):**
- Uses **dynamic imports**: `await import('jspdf')` and `await import('jspdf-autotable')`
- Dynamic imports serve two purposes: (1) keep PDF libraries out of initial JS bundle since most users won't export PDF; (2) required for browser-only APIs that would fail during SSR
- Branded indigo header bar (`setFillColor(79, 70, 229)`)
- Three KPI "pill" boxes: Records, Total, Average
- `autoTable` plugin for the data table with full styling: alternating rows, header colors, footer total, column widths
- Multi-page support: page numbering footer iterates `internal.getNumberOfPages()`

**TypeScript cast for jsPDF internal API:**
```typescript
const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } })
  .internal.getNumberOfPages();
```
The `as unknown as` double-cast is used because `jsPDF`'s `internal` property is not part of its public type definitions. This is a pragmatic workaround but exposes coupling to an undocumented API.

### State Management Pattern
```typescript
const [format, setFormat]       = useState<ExportFormat>('csv');
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate]     = useState('');
const [cats, setCats]           = useState<Set<Category>>(new Set(CATEGORIES));
const [filename, setFilename]   = useState(`expenses-${today}`);
const [isExporting, setExporting] = useState(false);
const [done, setDone]           = useState(false);

const filtered = useMemo(
  () => expenses.filter(/* date + category check */),
  [expenses, startDate, endDate, cats]
);
```
`cats` uses a `Set<Category>` for O(1) membership testing in the filter predicate. The `useMemo` dependency array is correct and exhaustive.

### Error Handling
- Empty state guard in `handleExport()`: `if (filtered.length === 0) return;`
- `try/finally` block ensures `setExporting(false)` runs even if export throws
- UI: export button disabled when `filtered.length === 0` or `isExporting`
- Empty state UI: dashed border placeholder with icon when no records match filters
- Date input constraints: `max={endDate || today}` on start, `min={startDate}` on end (prevents invalid ranges at the browser level)
- Filename fallback: `setFilename(e.target.value || \`expenses-${today}\`)` prevents empty filename

### Security Considerations
- No network requests; all processing is client-side
- CSV description field: properly escaped via `replace(/"/g, '""')`
- User-controlled filename is only used as the `download` attribute on an anchor tag — not passed to any server or file system API

### Performance Implications
- `useMemo` on filter prevents unnecessary re-computation on unrelated state changes
- PDF generation via dynamic import defers the ~200KB jsPDF bundle until first PDF export
- 400ms artificial delay adds perceived latency to every export (minor UX tradeoff for visible loading feedback)
- The preview table renders at most 6 rows regardless of dataset size — no virtualization needed

### Dependencies Added
| Package | Version | Size | Purpose |
|---|---|---|---|
| `jspdf` | ^4.2.1 | ~250KB gzipped | PDF generation |
| `jspdf-autotable` | ^5.0.8 | ~50KB gzipped | Table rendering in PDF |

Both loaded lazily via dynamic import; not in the initial bundle.

---

## Version 3 — Cloud Export Hub

### Files Changed
```
components/CloudExportModal.tsx (NEW — 838 lines)
utils/cloudExport.ts            (NEW — 264 lines)
app/page.tsx                    (modified — modal state + gradient button)
app/expenses/page.tsx           (modified — modal state + gradient button)
```
No new npm dependencies. All features implemented with browser APIs + localStorage.

### Architecture Overview
V3 models the feature as a **multi-service integration hub** in the style of a SaaS product (Notion/Airtable). The modal has five dedicated tabs, each handling a distinct workflow. State for each tab is isolated. Cross-tab concerns (selected template, export history) are shared through component-level state and localStorage.

```
User clicks "Cloud Export" (gradient button)
  └─> CloudExportModal opens
        ├─ useEffect on mount: loads history + schedules from localStorage
        ├─ Tab: Templates     — select from 6 purpose-built export structures
        ├─ Tab: Send & Sync   — email simulation + cloud service OAuth mockup
        ├─ Tab: Auto-Backup   — schedule builder → localStorage schedules
        ├─ Tab: Share Link    — URL generation + QR code visual
        └─ Tab: History       — past exports log from localStorage

Footer: "Export Now" always available — downloads current template instantly
```

### Key Components and Responsibilities

**`CloudExportModal` (components/CloudExportModal.tsx)**
- Single monolithic component with internal sub-components
- Props: `{ expenses: Expense[]; onClose: () => void }`
- Approximately 20 `useState` hooks + 1 `useEffect`
- Internal components defined at file scope (not exported):
  - `QRGrid` — deterministic QR-code visual from a string input
  - `StatusBadge` — colored pill for history item status

**`cloudExport.ts` (utils/cloudExport.ts)**
- Types: `ScheduleFrequency`, `ExportStatus`, `LinkExpiry`, `ExportTemplate`, `ExportSchedule`, `ExportHistoryItem`
- Constants: `EXPORT_TEMPLATES` (6 templates), `CLOUD_DESTINATIONS` (6 services) — typed `as const`
- Storage layer: `loadHistory()`, `loadSchedules()`, `addHistoryItem()`, `upsertSchedule()`, `removeSchedule()`, `clearAllHistory()`
- Generators: `generateId()`, `generateShareToken()`
- Utilities: `estimateFileSize()`, `computeNextRun()`, `formatNextRun()`
- Export engine: `runTemplateExport(expenses, template, filename)`

### Tab-by-Tab Technical Analysis

#### Tab 1: Templates
Six export templates defined as data (not code):
```typescript
export const EXPORT_TEMPLATES: ExportTemplate[] = [
  { id: 'tax-report',   groupBy: 'category', sortBy: 'category', badge: 'Popular', ... },
  { id: 'monthly-summary', groupBy: 'month', sortBy: 'date', ... },
  // ...
]
```
The `groupBy` field drives the CSV structure in `runTemplateExport`:
- `groupBy: 'category'` → rows grouped under category headers with subtotals
- `groupBy: 'month'` → rows grouped under month headers with monthly totals
- `undefined` → flat sorted export

This is a **data-driven architecture**: adding a new template requires only a new entry in `EXPORT_TEMPLATES`, not new code branches.

#### Tab 2: Send & Sync
**Email flow:**
```
emailState: 'idle' → 'sending' (1.8s) → 'sent' (3s) → 'idle'
```
Email simulation triggers a real local file download alongside showing the "sent" confirmation — users get the file regardless.

**Cloud service connection:**
```
connectingService: null → serviceId (2s) → null
connectedServices: Set.add(serviceId)
```
Uses a `Set<string>` to track connected services. Connected service IDs are rendered as badge pills in the modal header, visible from all tabs.

`CLOUD_DESTINATIONS` is typed `as const` giving a derived `DestinationId` union type:
```typescript
export type DestinationId = typeof CLOUD_DESTINATIONS[number]['id'];
// = 'google-sheets' | 'dropbox' | 'onedrive' | 'notion' | 'slack' | 'airtable'
```

#### Tab 3: Auto-Backup (Schedule)
```typescript
interface ExportSchedule {
  id: string;           // generateId() → timestamp36-random6
  templateId: string;
  templateName: string;
  destination: string;
  frequency: ScheduleFrequency;  // 'daily' | 'weekly' | 'monthly'
  dayOfWeek: number;   // 0-6 (for weekly)
  dayOfMonth: number;  // 1-31 (for monthly)
  hour: number;        // 0-23
  enabled: boolean;
  nextRun: string;     // ISO 8601
  createdAt: string;   // ISO 8601
}
```

`computeNextRun()` calculates the next occurrence:
```typescript
// weekly: find next occurrence of dayOfWeek, skipping same day
const diff = ((dayOfWeek - now.getDay()) + 7) % 7 || 7;
// The `|| 7` ensures "same day" always advances to next week
```

Schedules are persisted to `localStorage` via `upsertSchedule()` and loaded on mount via `useEffect`. UI supports enable/disable toggle (updates localStorage) and delete (removes from localStorage + local state).

**Limitation:** Schedules are UI-only. There is no service worker or background process to actually trigger exports on schedule. This is correctly implied in the design as a future real-backend feature.

#### Tab 4: Share Link
```typescript
export function generateShareToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
// e.g. → "k4m9xzp1ry2a"
// URL: https://expensetrack.app/share/k4m9xzp1ry2a?expires=7d
```

The generated URL uses a placeholder domain (`expensetrack.app`) — no actual server exists. The feature demonstrates the UX flow for a future backend feature.

**Clipboard API usage:**
```typescript
navigator.clipboard.writeText(shareLink).catch(() => {});
```
The `.catch(() => {})` silently ignores clipboard permission denials (e.g., in HTTP contexts where the Clipboard API is blocked). This is acceptable for a non-critical feature but means failures are invisible to the user.

**QR Code Renderer** — The `QRGrid` component generates a deterministic visual from a string:
```typescript
const seed = value.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
const cells = Array.from({ length: SIZE * SIZE }, (_, i) => {
  // Corner finder patterns (top-left, top-right, bottom-left)
  if ((x < 3 && y < 3) || (x > SIZE-4 && y < 3) || (x < 3 && y > SIZE-4)) return true;
  // Data cells: hash-based fill
  return ((seed * (i + 1) * 0x9E3779B9) >>> 0) % 5 < 2;
});
```
`0x9E3779B9` is the Fibonacci hashing constant (golden ratio × 2³²), chosen for good bit distribution. The three-corner finder pattern mimics real QR codes. This is a **visual simulation** — the grid is not a scannable QR code.

#### Tab 5: History
```typescript
// localStorage key: 'expense-tracker-export-history'
// Max 30 items retained (oldest dropped)
// Schema: ExportHistoryItem[]

export function addHistoryItem(item: ExportHistoryItem): void {
  const h = loadHistory();
  h.unshift(item);         // newest first
  if (h.length > 30) h.splice(30);  // cap at 30
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}
```
History is updated both when exporting from the Templates tab AND when using email send. Re-download in history uses `runTemplateExport` to regenerate the file client-side (no file is stored — only the metadata).

### State Management Pattern
V3 has the most complex state tree:
```typescript
// Tab routing
const [tab, setTab] = useState<TabId>('templates');
// Templates
const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>(EXPORT_TEMPLATES[0]);
const [isExporting, setIsExporting]           = useState(false);
const [exportDone, setExportDone]             = useState(false);
// Send & Sync
const [emailAddress, setEmailAddress] = useState('');
const [emailState, setEmailState]     = useState<'idle'|'sending'|'sent'>('idle');
const [connected, setConnected]       = useState<Set<string>>(new Set());
const [connecting, setConnecting]     = useState<string|null>(null);
// Schedule
const [schedFreq, setSchedFreq]         = useState<ScheduleFrequency>('weekly');
const [schedHour, setSchedHour]         = useState(9);
const [schedDOW, setSchedDOW]           = useState(1);
const [schedDOM, setSchedDOM]           = useState(1);
const [schedTemplateId, setSchedTemplateId] = useState(EXPORT_TEMPLATES[0].id);
const [schedules, setSchedules]         = useState<ExportSchedule[]>([]);
const [creatingSchedule, setCreatingSchedule] = useState(false);
const [scheduleSaved, setScheduleSaved] = useState(false);
// Share
const [shareLink, setShareLink]       = useState('');
const [copied, setCopied]             = useState(false);
const [showQR, setShowQR]             = useState(false);
const [linkExpiry, setLinkExpiry]     = useState<LinkExpiry>('7d');
const [generatingLink, setGeneratingLink] = useState(false);
// History
const [history, setHistory] = useState<ExportHistoryItem[]>([]);
```

All state lives in a single component. This is workable for a modal but would benefit from `useReducer` or context splitting if the component grows further.

### Storage Architecture
V3 uses a **two-key localStorage schema**:
```
expense-tracker-export-history   → ExportHistoryItem[]   (max 30)
expense-tracker-export-schedules → ExportSchedule[]      (unbounded)
```
The `safeJSON<T>()` helper in `cloudExport.ts` provides SSR-safe reading:
```typescript
function safeJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;  // SSR guard
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;  // handles malformed JSON
  }
}
```

### Error Handling
- Each async handler uses artificial delays to make loading states visible
- Clipboard failure silently swallowed (acceptable for copy-to-clipboard)
- localStorage reads wrapped in try/catch via `safeJSON`
- Empty state handled in History tab with illustrated placeholder
- "Export Now" button disabled when `expenses.length === 0`
- No global error boundary (all versions lack this)

### Security Considerations
- All data processing is client-side; no network requests carry user data
- The share link feature generates URLs that point to a non-existent server — no actual data leakage
- localStorage data is not encrypted; scheduling metadata (template names) is stored in plain text
- CSV escaping: `esc(s)` helper function properly double-quotes fields

### Performance Implications
- 20+ state variables could cause excessive re-renders; tabs unmount and remount when switched (state preserved in parent)
- `useEffect` loads from localStorage only once on mount — correct approach
- No `useMemo` on the filtered/computed data (unlike V2) — minor missed optimization
- QR grid renders 169 divs (13×13) each render — trivial at this scale but notable in principle
- History re-download re-runs CSV generation from current `expenses` prop, not a stored file — could produce different output if data changed

---

## Cross-Cutting Technical Comparison

### Code Size and Complexity

| Metric | V1 | V2 | V3 |
|---|---|---|---|
| New utility LOC | ~5 (delta) | 178 | 264 |
| New component LOC | 0 | 382 | 838 |
| Total new LOC | ~5 | ~560 | ~1,100 |
| Cyclomatic complexity (est.) | 1 | ~15 | ~40 |
| State variables | 0 | 7 | 20+ |
| Async operations | 0 | 1 (PDF) | 8 |

### Shared Patterns Across All Versions
1. **Browser download via anchor element** — all three use `URL.createObjectURL + anchor.click()`
2. **UTF-8 BOM** for Excel CSV compatibility (`﻿` / `﻿`)
3. **Quote-escaping for CSV** — `description.replace(/"/g, '""')`
4. **Disabled button when empty** — `disabled={expenses.length === 0}`

### Divergent Patterns

**File organization:**
- V1: modifies existing util — no new files
- V2: new util file with pure functions; component in `/components`
- V3: new util file with storage logic + type definitions; single large component

**Async strategy:**
- V1: synchronous throughout
- V2: async only for PDF (genuine async need — dynamic import + library operations)
- V3: async for every user action (artificial delays to demonstrate loading states)

**State scope:**
- V1: stateless — data flows in, file flows out
- V2: modal-scoped state; no persistence
- V3: modal-scoped state + localStorage persistence across sessions

**Filtering responsibility:**
- V1: caller pre-filters; function accepts any `Expense[]`
- V2: filtering is internal to the modal (useMemo-derived from state)
- V3: caller pre-filters (expenses page passes `filtered`); template choice determines CSV structure

---

## Strengths and Weaknesses

### V1
**Strengths:**
- Minimal surface area — nothing to break, nothing to learn
- Zero dependencies added
- Synchronous and instantly reliable
- Easy to test in isolation
- No cognitive overhead for users

**Weaknesses:**
- No user control over what gets exported (date range, categories)
- No output format choice
- No visual feedback during export
- If called with unfiltered `expenses`, no way to scope the export

---

### V2
**Strengths:**
- Real multi-format output (CSV, JSON, PDF) serving genuinely different use cases
- Live data preview before committing to export — trust-building feature
- `useMemo` for filter performance — thoughtful optimization
- Custom filename — small but meaningful user control
- PDF is production-quality with branding, KPI pills, and page numbering
- JSON envelope format is API-design-quality — useful for developers or data pipelines
- `try/finally` in export handler — robust state management

**Weaknesses:**
- `jsPDF.internal.getNumberOfPages()` accessed via `as unknown as` cast — brittle against library updates
- The 400ms artificial delay adds latency on every CSV/JSON export unnecessarily
- No export history — user has no record of what they've exported
- `cats` state initialized to `new Set(CATEGORIES)` — if `CATEGORIES` changes, the modal initialization changes too (minor coupling)
- Component is large enough (~382 lines) that splitting into sub-components would improve readability

---

### V3
**Strengths:**
- Template concept is genuinely novel — Tax Report vs Monthly Summary vs Full Dump are real distinct needs
- `as const` typed `CLOUD_DESTINATIONS` gives compile-time safety on destination IDs
- localStorage persistence for history/schedules survives page refreshes
- Data-driven template architecture: new templates are data, not code
- `safeJSON` helper is reusable and properly handles SSR + malformed JSON
- `generateId()` using `Date.now().toString(36)` produces readable, sortable IDs

**Weaknesses:**
- ~838-line component is too large for a single file — strong candidate for extraction into sub-components (`TemplatesTab`, `SendSyncTab`, etc.)
- 20+ `useState` calls in one component signal the need for `useReducer`
- Scheduling is pure UI — no background execution mechanism
- Share links point to a non-existent server (expected, but should be documented clearly in UI)
- Missing `useMemo` on derived data (V2 had this; V3 regressed)
- Clipboard failure is silently swallowed with no user feedback
- QR visual is decorative only — not a real QR code (undocumented)
- Artificial delays on every action can feel sluggish on slower hardware

---

## Recommendation: Hybrid "Best of All Three"

If merging into a production branch, the optimal combination would be:

### What to take from V1
- The clean `triggerDownload` helper pattern — extract as a shared util
- The principle: always have a zero-configuration fast path (keep a simple "Export CSV" button alongside any modal)

### What to take from V2
- The three-format output model (CSV / JSON / PDF)
- The live preview table — highest user-trust feature
- `useMemo` for filtered data derivation
- `try/finally` error handling in async export
- The 2-pane responsive layout concept
- Dynamic import for PDF (defer the large bundle)

### What to take from V3
- The template concept — different CSV structures for different purposes (Tax, Monthly, etc.)
- localStorage history — user confidence that their exports are tracked
- The `ExportTemplate` data-driven architecture
- `safeJSON` storage helper
- `as const` typed constant arrays with derived union types
- The `generateId()` pattern

### What to build fresh
- Break the component into tab sub-components (each ~60-80 lines)
- Replace 20 `useState` calls with `useReducer`
- Real `useMemo` on all derived data
- Proper error boundaries
- Explicit user feedback on clipboard failures
- Document simulated features (scheduling, share links, cloud sync) with "Coming soon" badges rather than functional-looking but non-functional UI flows

---

*Analysis generated from direct source code inspection across all three feature branches.*

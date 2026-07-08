'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ════════════════════════════════════════════════════════════════════
//  TYPES — attendance_logs CSV schema
//  Columns: id | date | staff_name | items_sold | revenue_generated
//           | late_minutes | status
// ════════════════════════════════════════════════════════════════════
interface AttendanceRecord {
  id:                string;
  date:              string;  // 'YYYY-MM-DD' — already WIB-converted by export button
  staff_name:        string;
  items_sold:        number;
  revenue_generated: number;
  late_minutes:      number;
  status:            string;
}

interface DailyPivot {
  date:     string;
  label:    string;
  dayIndex: number;
  revenue:  number;
  items:    number;
  shifts:   number;
}

// ════════════════════════════════════════════════════════════════════
//  CSV PARSER — hardened native implementation
//  Excel equivalent: Data → Get External Data → From Text/CSV
//
//  Bug fixes vs previous version:
//  1. parseNum() uses Number() + fallback — handles floats, whitespace,
//     and empty strings without producing NaN.
//  2. Lines are filtered for minimum viable column count before mapping.
//  3. Header normalisation strips BOM (\uFEFF), CR, and extra quotes.
//  4. date field falls back to extracting YYYY-MM-DD from created_at
//     timestamptz if a bare 'date' column is absent.
// ════════════════════════════════════════════════════════════════════

/** Parse a single CSV line respecting RFC 4180 quoting. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur   = '';
  let inQ   = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped double-quotes ("")
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      fields.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

/** Safely convert any value to a finite number, defaulting to 0. */
function parseNum(raw: string | undefined): number {
  if (!raw) return 0;
  const s = raw.replace(/[^\d.\-]/g, ''); // strip currency symbols, spaces
  const n = Number(s);
  return isFinite(n) ? n : 0;
}

/** Strip BOM, surrounding quotes, and carriage returns from a header token. */
function cleanHeader(h: string): string {
  return h.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').replace(/\r/g, '').trim();
}

function parseCsv(text: string): AttendanceRecord[] {
  // Normalise line endings; split; drop blank lines
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(cleanHeader);

  // Build a quick index map so field lookup is O(1)
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => { idx[h] = i; });

  const get = (fields: string[], key: string): string =>
    (fields[idx[key]] ?? '').replace(/^"|"$/g, '').trim();

  // Minimum required columns — abort early with clear console warning
  const required = ['staff_name', 'items_sold', 'revenue_generated'];
  const missing  = required.filter(k => !(k in idx));
  if (missing.length > 0) {
    console.warn('[Analytics CSV] Missing columns:', missing, '| Found:', headers);
    return [];
  }

  const records: AttendanceRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);

    // Skip lines that don't have enough columns (e.g. trailing blank rows)
    if (fields.length < Math.max(...Object.values(idx)) + 1) continue;

    // Resolve date: prefer dedicated 'date' column; fall back to created_at
    let date = get(fields, 'date');
    if (!date && 'created_at' in idx) {
      const raw = get(fields, 'created_at');
      // created_at is WIB ISO string from ExportAnalyticsButton — take first 10 chars
      date = raw.slice(0, 10);
    }

    // Skip rows with no parseable date (would break regression day-index)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const staffName = get(fields, 'staff_name');
    if (!staffName) continue; // skip rows with no staff (e.g. header duplication)

    records.push({
      id:                get(fields, 'id'),
      date,
      staff_name:        staffName,
      items_sold:        parseNum(get(fields, 'items_sold')),
      revenue_generated: parseNum(get(fields, 'revenue_generated')),
      late_minutes:      parseNum(get(fields, 'late_minutes')),
      status:            get(fields, 'status'),
    });
  }

  return records;
}

// ════════════════════════════════════════════════════════════════════
//  LINEAR REGRESSION — manual, no external library
//  Excel equivalent: FORECAST.LINEAR / TREND
//
//  Ordinary Least Squares (OLS):
//    m = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
//    c = (Σy − m·Σx) / n
//    R² = 1 − SS_res / SS_tot     where SS_tot > 0
//    ŷ(x) = m·x + c
// ════════════════════════════════════════════════════════════════════
interface Regression {
  slope:     number;
  intercept: number;
  r2:        number;
  predict:   (x: number) => number;
}

function linearRegression(ys: number[]): Regression {
  const n = ys.length;
  if (n < 2) {
    const c = ys[0] ?? 0;
    return { slope: 0, intercept: c, r2: 0, predict: () => c };
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    const x = i + 1;
    sumX  += x;
    sumY  += ys[i];
    sumXY += x * ys[i];
    sumX2 += x * x;
  }

  const denom    = n * sumX2 - sumX * sumX;
  const m        = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const c        = (sumY - m * sumX) / n;
  const meanY    = sumY / n;

  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssTot += (ys[i] - meanY) ** 2;
    ssRes += (ys[i] - (m * (i + 1) + c)) ** 2;
  }

  const r2      = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const predict = (x: number) => Math.max(0, m * x + c);

  return { slope: m, intercept: c, r2, predict };
}

// ════════════════════════════════════════════════════════════════════
//  HELPERS & CONSTANTS
// ════════════════════════════════════════════════════════════════════
const DENDA_PER_MENIT = 500; // Rp — matches admin/page.tsx payroll logic

const CHART_PALETTE = ['#C69C6D', '#3A2A1A', '#2D5A2D', '#8A2E2E', '#8C7A6B', '#D9A05B'];

// Named colors for recurring staff so charts are deterministic
const STAFF_COLOR_MAP: Record<string, string> = {
  Arief: '#C69C6D',
  Vikry: '#3A2A1A',
};
const staffColor = (name: string, fallbackIdx: number) =>
  STAFF_COLOR_MAP[name] ?? CHART_PALETTE[fallbackIdx % CHART_PALETTE.length];

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const fmtDateLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

const SELECT_ICON = `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238C7A6B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`;

// Branded recharts tooltip
const ChogoTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#EBE5D9] rounded-2xl p-3 shadow-lg text-xs min-w-[155px]">
      <p className="font-black text-[#3A2A1A] mb-1.5 uppercase tracking-widest text-[10px]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}:{' '}
          {typeof p.value === 'number' && p.value > 999 ? formatRp(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
//  DROPZONE COMPONENT — Empty State
// ════════════════════════════════════════════════════════════════════
interface DropzoneProps {
  onFile:  (records: AttendanceRecord[], name: string) => void;
  onError: (msg: string) => void;
}

function CsvDropzone({ onFile, onError }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [parsing,  setParsing]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('File harus berformat .csv');
      return;
    }
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text    = e.target?.result as string;
        const records = parseCsv(text);
        if (!records.length) {
          onError('CSV tidak mengandung baris data valid. Cek kolom: id, date, staff_name, items_sold, revenue_generated, late_minutes, status');
          return;
        }
        onFile(records, file.name);
      } catch (err) {
        onError(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => { onError('FileReader gagal membaca file.'); setParsing(false); };
    reader.readAsText(file, 'utf-8');
  }, [onFile, onError]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[10px] font-black text-[#C69C6D] uppercase tracking-[0.4em] mb-2">
            Attendance Analytics · Data Science
          </p>
          <h1 className="text-4xl font-serif font-black text-[#3A2A1A] tracking-tight mb-2">
            Chōgō Staff Analytics
          </h1>
          <p className="text-sm text-[#8C7A6B] font-medium">
            Upload CSV hasil export dari{' '}
            <code className="bg-[#EBE5D9] px-1.5 py-0.5 rounded font-black text-[#3A2A1A]">attendance_logs</code>{' '}
            untuk memuat dashboard
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer rounded-[32px] border-2 border-dashed p-16 flex flex-col items-center justify-center gap-5 transition-all duration-200 select-none
            ${dragging ? 'border-[#C69C6D] bg-[#C69C6D]/5 scale-[1.01]' : 'border-[#EBE5D9] bg-white hover:border-[#C69C6D] hover:bg-[#FAF8F5]'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }}
          />

          <div className={`p-5 rounded-full transition-colors ${dragging ? 'bg-[#C69C6D]/10' : 'bg-[#FAF8F5]'}`}>
            {parsing
              ? <svg className="h-10 w-10 text-[#C69C6D] animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 10z"/></svg>
              : <svg className={`h-10 w-10 transition-colors ${dragging ? 'text-[#C69C6D]' : 'text-[#8C7A6B]'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
            }
          </div>

          <div className="text-center">
            <p className="text-lg font-black text-[#3A2A1A] mb-1">
              {parsing ? 'Memuat & Parsing Data...' : dragging ? 'Lepaskan file di sini' : 'Upload Attendance CSV'}
            </p>
            <p className="text-sm font-medium text-[#8C7A6B]">
              {parsing ? 'Harap tunggu sebentar' : 'Drag & drop atau klik untuk memilih file .csv'}
            </p>
          </div>

          {!parsing && (
            <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#EBE5D9] rounded-xl px-4 py-2">
              <span className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Sumber:</span>
              <code className="text-[10px] font-black text-[#3A2A1A]">Export CSV — [Bulan] dari navbar admin</code>
            </div>
          )}
        </div>

        {/* Schema reference */}
        <div className="mt-6 bg-white border border-[#EBE5D9] rounded-2xl p-5">
          <p className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest mb-3">Kolom yang Diharapkan</p>
          <div className="flex flex-wrap gap-2">
            {['id','date','staff_name','items_sold','revenue_generated','late_minutes','status'].map(col => (
              <code key={col} className="text-[10px] bg-[#FAF8F5] border border-[#EBE5D9] px-2.5 py-1 rounded-lg font-bold text-[#3A2A1A]">{col}</code>
            ))}
          </div>
          <p className="text-[9px] text-[#8C7A6B] mt-3 font-medium">
            Kolom <code className="font-bold">created_at</code> (timestamptz) juga diterima sebagai fallback untuk field <code className="font-bold">date</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  DASHBOARD VIEW
// ════════════════════════════════════════════════════════════════════
interface DashboardProps {
  records:  AttendanceRecord[];
  filename: string;
  onReset:  () => void;
}

function DashboardView({ records, filename, onReset }: DashboardProps) {

  // ── EXCEL EQUIVALENT: SLICER ─────────────────────────────────────
  // Two independent dropdown filters. Changing either re-derives all
  // KPIs, charts, and pivot table via useMemo — identical to Excel
  // Slicer where all connected PivotTables update simultaneously.
  //
  // Graceful fallback: if no records match the active filter combo,
  // `filtered` is an empty array and every derived value is 0 / [].
  // Components render an empty-state badge rather than NaN or crash.
  const staffOptions = useMemo(() =>
    ['All', ...Array.from(new Set(records.map(r => r.staff_name).filter(Boolean))).sort()],
    [records]
  );
  const statusOptions = useMemo(() =>
    ['All', ...Array.from(new Set(records.map(r => r.status).filter(Boolean))).sort()],
    [records]
  );

  const [staffFilter,  setStaffFilter]  = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [chartTab,     setChartTab]     = useState<'trend' | 'staff' | 'punctuality'>('trend');

  // Reset slicers if options change (new file uploaded mid-session)
  // useMemo dependency ensures stable reference
  const filteredStaff  = staffOptions.includes(staffFilter)  ? staffFilter  : 'All';
  const filteredStatus = statusOptions.includes(statusFilter) ? statusFilter : 'All';

  // ── EXCEL EQUIVALENT: SUMIFS / COUNTIFS — filter predicate ───────
  // .filter() = multi-criteria condition (like SUMIFS criteria_range)
  const filtered = useMemo(() =>
    records.filter(r =>
      (filteredStaff  === 'All' || r.staff_name === filteredStaff) &&
      (filteredStatus === 'All' || r.status      === filteredStatus)
    ),
    [records, filteredStaff, filteredStatus]
  );

  // KPI 1 — SUMIFS(revenue_generated, staff_name, X, status, Y)
  const totalRevenue = useMemo(() => filtered.reduce((a, r) => a + r.revenue_generated, 0), [filtered]);

  // KPI 2 — SUMIFS(items_sold, staff_name, X, status, Y)
  const totalItems   = useMemo(() => filtered.reduce((a, r) => a + r.items_sold, 0), [filtered]);

  // KPI 3 — SUMIFS(late_minutes, …) × DENDA_PER_MENIT
  const totalDenda   = useMemo(() => filtered.reduce((a, r) => a + r.late_minutes * DENDA_PER_MENIT, 0), [filtered]);

  // COUNTIFS equivalents
  const lateCount    = useMemo(() => filtered.filter(r => r.late_minutes > 0).length, [filtered]);
  const onTimeCount  = useMemo(() => filtered.filter(r => r.late_minutes === 0).length, [filtered]);

  // ── EXCEL EQUIVALENT: PIVOT TABLE ────────────────────────────────
  // Row field = date · Values = SUM(revenue_generated), SUM(items_sold), COUNT(shifts)
  const dailyPivot: DailyPivot[] = useMemo(() => {
    const map = new Map<string, { revenue: number; items: number; shifts: number }>();
    filtered.forEach(r => {
      const existing = map.get(r.date) ?? { revenue: 0, items: 0, shifts: 0 };
      map.set(r.date, {
        revenue: existing.revenue + r.revenue_generated,
        items:   existing.items   + r.items_sold,
        shifts:  existing.shifts  + 1,
      });
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v], i) => ({
        date,
        label:    fmtDateLabel(date),
        dayIndex: i + 1,
        revenue:  v.revenue,
        items:    v.items,
        shifts:   v.shifts,
      }));
  }, [filtered]);

  // ── EXCEL EQUIVALENT: FORECAST.LINEAR ────────────────────────────
  // OLS regression on daily revenue (y) vs. day index (x = 1…n).
  // Forecasts ŷ for day n+1 … n+7.
  const reg = useMemo(() => linearRegression(dailyPivot.map(d => d.revenue)), [dailyPivot]);

  const forecastPts = useMemo(() => {
    if (!dailyPivot.length) return [];
    const lastDate = new Date(dailyPivot[dailyPivot.length - 1].date + 'T00:00:00');
    return Array.from({ length: 7 }, (_, i) => {
      const fd = new Date(lastDate);
      fd.setDate(lastDate.getDate() + i + 1);
      const x = dailyPivot.length + i + 1;
      return {
        label:    fmtDateLabel(fd.toLocaleDateString('sv-SE')),
        dayIndex: x,
        forecast: Math.round(reg.predict(x)),
      };
    });
  }, [dailyPivot, reg]);

  const forecast7Total = useMemo(() => forecastPts.reduce((a, p) => a + p.forecast, 0), [forecastPts]);

  // Merged line-chart series: historical + regression trendline + forecast
  const trendData = useMemo(() => [
    ...dailyPivot.map(d => ({
      label:     d.label,
      Revenue:   d.revenue,
      'Tren (ŷ)': Math.round(reg.predict(d.dayIndex)),
      Forecast:  undefined as number | undefined,
    })),
    ...forecastPts.map(f => ({
      label:     f.label,
      Revenue:   undefined as number | undefined,
      'Tren (ŷ)': Math.round(reg.predict(f.dayIndex)),
      Forecast:  f.forecast,
    })),
  ], [dailyPivot, forecastPts, reg]);

  // ── PIVOT: staff cumulative (Bar Chart) ───────────────────────────
  // EXCEL EQUIVALENT: SUMIFS(revenue_generated, staff_name, each_value)
  const staffData = useMemo(() => {
    const map = new Map<string, { revenue: number; items: number; shifts: number; denda: number }>();
    filtered.forEach(r => {
      const e = map.get(r.staff_name) ?? { revenue: 0, items: 0, shifts: 0, denda: 0 };
      map.set(r.staff_name, {
        revenue: e.revenue + r.revenue_generated,
        items:   e.items   + r.items_sold,
        shifts:  e.shifts  + 1,
        denda:   e.denda   + r.late_minutes * DENDA_PER_MENIT,
      });
    });
    return Array.from(map.entries())
      .map(([name, v], i) => ({ name, ...v, color: staffColor(name, i) }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  // ── PIVOT: punctuality distribution (Pie Chart) ───────────────────
  // EXCEL EQUIVALENT: COUNTIFS(late_minutes,"=0") vs COUNTIFS(…,">0")
  const punctualityData = useMemo(() => [
    { name: 'On-Time', value: onTimeCount, color: '#2D5A2D' },
    { name: 'Late',    value: lateCount,   color: '#8A2E2E' },
  ].filter(d => d.value > 0), [onTimeCount, lateCount]);

  // ── EXCEL EQUIVALENT: CONDITIONAL FORMATTING ─────────────────────
  // Dynamic CSS classes driven by computed values — equivalent to CF rules
  // "Format cells where value > 0 → green", "< 0 → red" etc.
  const slopeClass = reg.slope >= 0 ? 'text-[#2D5A2D]' : 'text-[#8A2E2E]';
  const slopeBadge = reg.slope >= 0 ? 'bg-[#E8F5E9] text-[#2D5A2D]' : 'bg-[#FDF2F2] text-[#8A2E2E]';
  const r2Class    = reg.r2 >= 0.7 ? 'text-[#2D5A2D]' : reg.r2 >= 0.4 ? 'text-[#C69C6D]' : 'text-[#8A2E2E]';
  const r2Label    = reg.r2 >= 0.7 ? 'Kuat ✓' : reg.r2 >= 0.4 ? 'Sedang' : 'Lemah ✗';

  const avgDailyRev = dailyPivot.length > 0 ? totalRevenue / dailyPivot.length : 0;

  // Row-level CF: three-tier colour scale vs. daily average
  const cfClass = (rev: number) =>
    rev >= avgDailyRev * 1.2 ? 'bg-[#E8F5E9] text-[#2D5A2D]' :
    rev >= avgDailyRev * 0.8 ? 'bg-[#FAF8F5] text-[#8C7A6B]' :
                                'bg-[#FDF2F2] text-[#8A2E2E]';
  const cfLabel = (rev: number) =>
    rev >= avgDailyRev * 1.2 ? 'High' : rev >= avgDailyRev * 0.8 ? 'Normal' : 'Low';

  // Empty-state guard — show zero-data notice instead of broken chart
  const hasData = filtered.length > 0 && dailyPivot.length > 0;

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F9F6F0] p-4 md:p-8 text-[#3A2A1A]">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <p className="text-[10px] font-black text-[#C69C6D] uppercase tracking-[0.35em] mb-1">
              Attendance Analytics · {filename}
            </p>
            <h1 className="text-4xl font-serif font-black tracking-tight">Staff Analytics Dashboard</h1>
            <p className="text-sm text-[#8C7A6B] font-medium mt-1">
              {records.length.toLocaleString('id-ID')} records · {dailyPivot.length} hari ·{' '}
              {staffOptions.length - 1} staff
              {dailyPivot.length >= 30
                ? ' · CLT ≥ 30 ✓'
                : ` · CLT: n=${dailyPivot.length}${dailyPivot.length < 30 ? ' ⚠ (< 30, gunakan hasil regresi dengan hati-hati)' : ''}`}
            </p>
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-2 h-[48px] px-5 bg-white border border-[#EBE5D9] rounded-2xl text-[11px] font-black uppercase tracking-widest text-[#8C7A6B] hover:border-[#C69C6D] hover:text-[#3A2A1A] transition-all shadow-sm shrink-0"
          >
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Ganti File
          </button>
        </div>

        {/* ── SLICER PANEL ──────────────────────────────────────────
            EXCEL EQUIVALENT: Insert → Slicer
            Connected to filtered dataset → all KPIs + charts update. */}
        <div className="bg-white border border-[#EBE5D9] rounded-[24px] p-5 mb-8 flex flex-wrap gap-5 items-end shadow-sm">
          <div>
            <label className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest block mb-1.5">
              🔪 Slicer — Staff Name
            </label>
            <select
              value={filteredStaff}
              onChange={e => setStaffFilter(e.target.value)}
              className="appearance-none h-[44px] bg-[#FAF8F5] border border-[#EBE5D9] px-4 pr-10 rounded-xl text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:border-[#C69C6D] text-[#3A2A1A] min-w-[180px]"
              style={{ backgroundImage: SELECT_ICON, backgroundPosition: 'right 12px center', backgroundSize: '14px', backgroundRepeat: 'no-repeat' }}
            >
              {staffOptions.map(s => <option key={s} value={s}>{s === 'All' ? 'Semua Staff' : s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest block mb-1.5">
              🔪 Slicer — Shift Status
            </label>
            <select
              value={filteredStatus}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none h-[44px] bg-[#FAF8F5] border border-[#EBE5D9] px-4 pr-10 rounded-xl text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:border-[#C69C6D] text-[#3A2A1A] min-w-[180px]"
              style={{ backgroundImage: SELECT_ICON, backgroundPosition: 'right 12px center', backgroundSize: '14px', backgroundRepeat: 'no-repeat' }}
            >
              {statusOptions.map(s => <option key={s} value={s}>{s === 'All' ? 'Semua Status' : s}</option>)}
            </select>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest">Filter Aktif</p>
            <p className="text-xs font-black text-[#3A2A1A]">
              {filteredStaff === 'All' ? 'Semua Staff' : filteredStaff} · {filteredStatus === 'All' ? 'Semua Status' : filteredStatus}
            </p>
            <p className="text-[9px] text-[#8C7A6B] font-medium mt-0.5">{filtered.length} / {records.length} records</p>
          </div>
        </div>

        {/* Empty state when filter has no matches */}
        {!hasData && (
          <div className="bg-white border border-[#EBE5D9] rounded-[24px] p-10 text-center mb-8">
            <p className="text-3xl mb-3">🔍</p>
            <h3 className="text-lg font-black text-[#3A2A1A] mb-1">Tidak Ada Data</h3>
            <p className="text-sm text-[#8C7A6B]">
              Kombinasi filter saat ini tidak menemukan record. Ubah Slicer di atas.
            </p>
          </div>
        )}

        {hasData && (
          <>
            {/* ── KPI CARDS ──────────────────────────────────────────
                EXCEL EQUIVALENT:
                  Card 1 → SUMIFS(revenue_generated, staff, X, status, Y)
                  Card 2 → SUMIFS(items_sold, …)
                  Card 3 → SUMIFS(late_minutes × 500, …)
                  Card 4 → FORECAST.LINEAR — Σ ŷ(n+1…n+7) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

              {/* KPI 1: Total Revenue */}
              <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest">Total Revenue</p>
                    <p className="text-[8px] text-[#8C7A6B] mt-0.5">SUMIFS(revenue_generated)</p>
                  </div>
                  <div className="p-2 bg-[#FAF8F5] rounded-xl text-[#C69C6D]">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-[#3A2A1A] leading-none">{formatRp(totalRevenue)}</h3>
                {/* CONDITIONAL FORMATTING: slope direction badge */}
                <div className={`mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${slopeBadge}`}>
                  {reg.slope >= 0 ? '↑' : '↓'} Tren {reg.slope >= 0 ? 'naik' : 'turun'}
                </div>
              </div>

              {/* KPI 2: Total Items Sold */}
              <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest">Total Items Sold</p>
                    <p className="text-[8px] text-[#8C7A6B] mt-0.5">SUMIFS(items_sold)</p>
                  </div>
                  <div className="p-2 bg-[#FAF8F5] rounded-xl text-[#C69C6D]">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-[#3A2A1A]">
                  {totalItems.toLocaleString('id-ID')}
                  <span className="text-base font-bold text-[#8C7A6B] ml-1">item</span>
                </h3>
                <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FAF8F5] text-[#8C7A6B]">
                  {filtered.length} shift · {dailyPivot.length} hari
                </div>
              </div>

              {/* KPI 3: Total Denda */}
              <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest">Total Denda</p>
                    <p className="text-[8px] text-[#8C7A6B] mt-0.5">SUMIFS(late_min × 500)</p>
                  </div>
                  <div className="p-2 bg-[#FAF8F5] rounded-xl text-[#8A2E2E]">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-[#3A2A1A]">{formatRp(totalDenda)}</h3>
                {/* CONDITIONAL FORMATTING: severity scale */}
                <div className={`mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black
                  ${totalDenda === 0 ? 'bg-[#E8F5E9] text-[#2D5A2D]' : totalDenda < 50000 ? 'bg-[#FFF8E1] text-[#C69C6D]' : 'bg-[#FDF2F2] text-[#8A2E2E]'}`}>
                  {lateCount === 0 ? '✓ Semua Tepat Waktu' : `${lateCount} shift telat`}
                </div>
              </div>

              {/* KPI 4: 7-Day Revenue Forecast */}
              <div className="bg-gradient-to-br from-[#3A2A1A] to-[#1A1008] p-6 rounded-[24px] border border-[#C69C6D]/30 shadow-lg text-white">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[9px] font-black text-[#C69C6D] uppercase tracking-widest">7-Day Forecast</p>
                    <p className="text-[8px] text-[#8C7A6B] mt-0.5">FORECAST.LINEAR</p>
                  </div>
                  <div className="p-2 bg-[#C69C6D]/20 rounded-xl text-[#C69C6D]">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                  </div>
                </div>
                <h3 className="text-2xl font-black leading-none">{formatRp(forecast7Total)}</h3>
                {/* CONDITIONAL FORMATTING: R² strength */}
                <p className="mt-3 text-[10px] text-[#C69C6D] font-bold">
                  R² = <span className={r2Class}>{(reg.r2 * 100).toFixed(1)}% ({r2Label})</span>
                </p>
              </div>
            </div>

            {/* ── REGRESSION MODEL STATS ─────────────────────────── */}
            <div className="bg-white border border-[#EBE5D9] rounded-[20px] p-4 mb-8 flex flex-wrap gap-x-8 gap-y-3 items-center shadow-sm">
              <div><p className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest">Algoritma</p><p className="text-sm font-black text-[#3A2A1A]">Simple Linear Regression (OLS)</p></div>
              <div><p className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest">Dataset (n)</p><p className="text-sm font-black text-[#3A2A1A]">{dailyPivot.length} hari</p></div>
              <div><p className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest">Slope m</p><p className={`text-sm font-black ${slopeClass}`}>{reg.slope >= 0 ? '+' : ''}{Math.round(reg.slope).toLocaleString('id-ID')} Rp/hari</p></div>
              <div><p className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest">Intercept c</p><p className="text-sm font-black text-[#3A2A1A]">{formatRp(reg.intercept)}</p></div>
              <div><p className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest">R²</p><p className={`text-sm font-black ${r2Class}`}>{(reg.r2 * 100).toFixed(2)}% — {r2Label}</p></div>
              <div><p className="text-[9px] font-black text-[#8C7A6B] uppercase tracking-widest">Persamaan</p><p className="text-sm font-black text-[#3A2A1A] font-mono">ŷ = {Math.round(reg.slope).toLocaleString()}x + {Math.round(reg.intercept).toLocaleString()}</p></div>
            </div>

            {/* ── CHART TABS ──────────────────────────────────────── */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {[
                { id: 'trend',       label: 'Revenue Trend + Forecast' },
                { id: 'staff',       label: 'Performa Staff' },
                { id: 'punctuality', label: 'Ketepatan Waktu' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setChartTab(tab.id as any)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                    ${chartTab === tab.id ? 'bg-[#3A2A1A] text-white shadow-md' : 'bg-white text-[#8C7A6B] border border-[#EBE5D9] hover:border-[#C69C6D]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════
                CHART 1 — PIVOT CHART: Line — Revenue Trend + Forecast
                EXCEL EQUIVALENT:
                  • PivotChart → Insert → Line Chart
                  • Series "Revenue": PivotTable SUM(revenue_generated) by date
                  • Series "Tren (ŷ)": FORECAST.LINEAR regression fitted line
                  • Series "Forecast": predicted ŷ for days n+1…n+7
            ══════════════════════════════════════════════════════ */}
            {chartTab === 'trend' && (
              <div className="bg-white rounded-[32px] border border-[#EBE5D9] p-6 shadow-sm mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
                  <div>
                    <h2 className="text-xl font-serif font-black text-[#3A2A1A]">Daily Revenue Trend + 7-Day Forecast</h2>
                    <p className="text-xs text-[#8C7A6B] mt-0.5">Pivot Chart (Line) · FORECAST.LINEAR · ŷ = {Math.round(reg.slope).toLocaleString()}x + {Math.round(reg.intercept).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px] font-bold shrink-0">
                    <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-[#C69C6D] inline-block rounded" />Aktual</span>
                    <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-[#3A2A1A] inline-block" />Regresi</span>
                    <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dotted border-[#8C7A6B] inline-block" />Forecast</span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBE5D9" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#8C7A6B', fontWeight: 700 }} tickLine={false} interval={Math.max(0, Math.floor(trendData.length / 8))} />
                    <YAxis tick={{ fontSize: 9, fill: '#8C7A6B', fontWeight: 700 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChogoTooltip />} />
                    {dailyPivot.length > 0 && (
                      <ReferenceLine
                        x={dailyPivot[dailyPivot.length - 1].label}
                        stroke="#C69C6D" strokeDasharray="4 4"
                        label={{ value: 'Hari Ini', fill: '#C69C6D', fontSize: 9, fontWeight: 700, position: 'insideTopRight' }}
                      />
                    )}
                    <Line type="monotone" dataKey="Revenue"    stroke="#C69C6D" strokeWidth={2.5} dot={false} connectNulls={false} />
                    <Line type="monotone" dataKey="Tren (ŷ)"  stroke="#3A2A1A" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                    <Line type="monotone" dataKey="Forecast"   stroke="#8C7A6B" strokeWidth={2} strokeDasharray="3 3" dot={{ fill: '#8C7A6B', r: 3 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>

                {/* Forecast daily breakdown */}
                <div className="mt-5 p-4 bg-[#FAF8F5] rounded-2xl border border-[#EBE5D9]">
                  <p className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest mb-3">Rincian Forecast 7 Hari</p>
                  <div className="flex flex-wrap gap-2">
                    {forecastPts.map((f, i) => (
                      <div key={i} className="bg-white border border-[#EBE5D9] rounded-xl px-3 py-2 text-center min-w-[78px]">
                        <p className="text-[9px] font-black text-[#8C7A6B] uppercase">{f.label}</p>
                        <p className="text-xs font-black text-[#3A2A1A]">{(f.forecast / 1000).toFixed(0)}K</p>
                      </div>
                    ))}
                    <div className="bg-[#3A2A1A] rounded-xl px-4 py-2 text-center min-w-[100px] flex flex-col justify-center">
                      <p className="text-[9px] font-black text-[#C69C6D] uppercase">Total</p>
                      <p className="text-xs font-black text-white">{formatRp(forecast7Total)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                CHART 2 — PIVOT CHART: Bar — Staff Revenue Comparison
                EXCEL EQUIVALENT:
                  • PivotChart → Clustered Bar Chart
                  • Row: staff_name · Value: SUM(revenue_generated)
                  • SUMIFS(revenue_generated, staff_name, "Arief"), etc.
            ══════════════════════════════════════════════════════ */}
            {chartTab === 'staff' && (
              <div className="bg-white rounded-[32px] border border-[#EBE5D9] p-6 shadow-sm mb-8">
                <div className="mb-6">
                  <h2 className="text-xl font-serif font-black text-[#3A2A1A]">Perbandingan Performa Staff</h2>
                  <p className="text-xs text-[#8C7A6B] mt-0.5">Pivot Chart (Bar) · SUMIFS(revenue_generated, staff_name) DESC</p>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={staffData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} barSize={52}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBE5D9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#3A2A1A', fontWeight: 700 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#8C7A6B', fontWeight: 700 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChogoTooltip />} />
                    <Bar dataKey="revenue" name="Revenue" radius={[8, 8, 0, 0]}>
                      {staffData.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffData.map((s, i) => {
                    const pct = totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0;
                    const staffRecs = filtered.filter(r => r.staff_name === s.name);
                    const attendancePct = staffRecs.length > 0
                      ? ((staffRecs.filter(r => r.late_minutes === 0).length / staffRecs.length) * 100)
                      : 0;
                    return (
                      <div key={i} className="p-4 rounded-2xl border border-[#EBE5D9] bg-[#FAF8F5]">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="text-xs font-black text-[#3A2A1A] uppercase tracking-widest">{s.name}</span>
                          {i === 0 && <span className="ml-auto text-[9px] font-black bg-[#C69C6D] text-white px-2 py-0.5 rounded-full uppercase">MVP</span>}
                        </div>
                        <div className="space-y-1.5 text-[10px] font-bold text-[#8C7A6B]">
                          <div className="flex justify-between"><span>Revenue</span><span className="text-[#3A2A1A] font-black">{formatRp(s.revenue)}</span></div>
                          <div className="flex justify-between"><span>Items</span><span className="text-[#3A2A1A]">{s.items.toLocaleString('id-ID')}</span></div>
                          <div className="flex justify-between"><span>Shift</span><span className="text-[#3A2A1A]">{s.shifts} hari</span></div>
                          {/* CONDITIONAL FORMATTING: denda */}
                          <div className="flex justify-between">
                            <span>Denda</span>
                            <span className={s.denda > 0 ? 'text-[#8A2E2E]' : 'text-[#2D5A2D]'}>
                              {s.denda > 0 ? formatRp(s.denda) : 'Rp 0 ✓'}
                            </span>
                          </div>
                          {/* CONDITIONAL FORMATTING: attendance % */}
                          <div className="flex justify-between">
                            <span>On-Time</span>
                            <span className={attendancePct >= 80 ? 'text-[#2D5A2D]' : 'text-[#8A2E2E]'}>
                              {attendancePct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 w-full bg-white rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                        </div>
                        <p className="text-[9px] font-black mt-1" style={{ color: s.color }}>{pct.toFixed(1)}% revenue share</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                CHART 3 — PIVOT CHART: Pie — Punctuality Distribution
                EXCEL EQUIVALENT:
                  • PivotChart → Pie Chart
                  • COUNTIFS(late_minutes,"=0") → "On-Time"
                  • COUNTIFS(late_minutes,">0") → "Late"
            ══════════════════════════════════════════════════════ */}
            {chartTab === 'punctuality' && (
              <div className="bg-white rounded-[32px] border border-[#EBE5D9] p-6 shadow-sm mb-8">
                <div className="mb-6">
                  <h2 className="text-xl font-serif font-black text-[#3A2A1A]">Distribusi Ketepatan Waktu</h2>
                  <p className="text-xs text-[#8C7A6B] mt-0.5">
                    Pivot Chart (Pie) · COUNTIFS(late_minutes,"=0") vs COUNTIFS(late_minutes,"&gt;0")
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={punctualityData} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3} dataKey="value" nameKey="name">
                        {punctualityData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChogoTooltip />} />
                      <Legend formatter={v => <span className="text-[10px] font-black text-[#3A2A1A] uppercase">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-4">
                    {/* On-Time */}
                    <div className="p-5 rounded-2xl border border-[#C8E6C9] bg-[#E8F5E9]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] font-black text-[#2D5A2D] uppercase tracking-widest">On-Time</p>
                          <h3 className="text-3xl font-black text-[#2D5A2D]">{onTimeCount}</h3>
                          <p className="text-[10px] font-bold text-[#2D5A2D]">
                            {filtered.length > 0 ? ((onTimeCount / filtered.length) * 100).toFixed(1) : 0}% dari total shift
                          </p>
                        </div>
                        <span className="text-2xl">✓</span>
                      </div>
                      <div className="w-full bg-[#C8E6C9] rounded-full h-2">
                        <div className="bg-[#2D5A2D] h-2 rounded-full" style={{ width: `${filtered.length > 0 ? (onTimeCount / filtered.length) * 100 : 0}%` }} />
                      </div>
                    </div>

                    {/* Late */}
                    <div className="p-5 rounded-2xl border border-[#F5C6C6] bg-[#FDF2F2]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] font-black text-[#8A2E2E] uppercase tracking-widest">Late</p>
                          <h3 className="text-3xl font-black text-[#8A2E2E]">{lateCount}</h3>
                          <p className="text-[10px] font-bold text-[#8A2E2E]">
                            {filtered.length > 0 ? ((lateCount / filtered.length) * 100).toFixed(1) : 0}% · Denda {formatRp(totalDenda)}
                          </p>
                        </div>
                        <span className="text-2xl">⚠</span>
                      </div>
                      <div className="w-full bg-[#F5C6C6] rounded-full h-2">
                        <div className="bg-[#8A2E2E] h-2 rounded-full" style={{ width: `${filtered.length > 0 ? (lateCount / filtered.length) * 100 : 0}%` }} />
                      </div>
                    </div>

                    {/* Per-staff breakdown */}
                    {staffData.length > 1 && (
                      <div className="p-4 rounded-2xl border border-[#EBE5D9] bg-[#FAF8F5]">
                        <p className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest mb-3">Per Staff</p>
                        {staffData.map((s, i) => {
                          const sr  = filtered.filter(r => r.staff_name === s.name);
                          const otc = sr.filter(r => r.late_minutes === 0).length;
                          const pct = sr.length > 0 ? (otc / sr.length) * 100 : 0;
                          return (
                            <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                              <span className="text-[10px] font-black text-[#3A2A1A] w-20 truncate">{s.name}</span>
                              <div className="flex-1 bg-white rounded-full h-1.5 overflow-hidden">
                                <div className="h-1.5 rounded-full bg-[#2D5A2D]" style={{ width: `${pct}%` }} />
                              </div>
                              {/* CONDITIONAL FORMATTING: attendance rate */}
                              <span className={`text-[10px] font-black w-10 text-right ${pct >= 80 ? 'text-[#2D5A2D]' : 'text-[#8A2E2E]'}`}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                PIVOT TABLE — Daily Aggregation
                EXCEL EQUIVALENT: PivotTable
                  • Rows:   date (Group by Day)
                  • Values: SUM(items_sold), SUM(revenue_generated), COUNT(shifts)
                  • Grand Total footer row
                Conditional Formatting applied per-row: High / Normal / Low
                vs. average daily revenue (three-tier colour scale)
            ══════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[32px] border border-[#EBE5D9] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-[#EBE5D9]">
                <h2 className="text-xl font-serif font-black text-[#3A2A1A]">Pivot Table — Daily Aggregation</h2>
                <p className="text-xs text-[#8C7A6B] mt-0.5">
                  Excel equiv: PivotTable · Row: date · Values: SUM(items_sold), SUM(revenue_generated)
                  · CF: vs avg daily revenue
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EBE5D9]">
                      {['Tanggal','Day','Items Terjual','Revenue','Shift','vs Rata-rata','CF Status'].map(h => (
                        <th key={h} className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EBE1]">
                    {dailyPivot.map(row => {
                      const diffPct   = avgDailyRev > 0 ? ((row.revenue - avgDailyRev) / avgDailyRev) * 100 : 0;
                      const diffClass = diffPct >= 0 ? 'text-[#2D5A2D]' : 'text-[#8A2E2E]';
                      return (
                        <tr key={row.date} className="hover:bg-[#FCF9F4] transition-colors">
                          <td className="p-4 text-xs font-bold text-[#3A2A1A]">
                            {new Date(row.date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-4 text-xs font-bold text-[#8C7A6B]">{row.dayIndex}</td>
                          <td className="p-4 text-xs font-black text-[#C69C6D]">{row.items.toLocaleString('id-ID')}</td>
                          <td className="p-4 text-xs font-black text-[#3A2A1A]">{formatRp(row.revenue)}</td>
                          <td className="p-4 text-xs font-bold text-[#8C7A6B]">{row.shifts}</td>
                          <td className={`p-4 text-xs font-black ${diffClass}`}>
                            {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cfClass(row.revenue)}`}>
                              {cfLabel(row.revenue)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#3A2A1A] text-white">
                      <td className="p-4 text-xs font-black uppercase tracking-widest">Grand Total</td>
                      <td className="p-4 text-xs font-bold">{dailyPivot.length} hari</td>
                      <td className="p-4 text-xs font-black text-[#C69C6D]">{totalItems.toLocaleString('id-ID')}</td>
                      <td className="p-4 text-xs font-black">{formatRp(totalRevenue)}</td>
                      <td className="p-4 text-xs font-black">{filtered.length}</td>
                      <td className="p-4 text-xs font-bold">Avg: {formatRp(avgDailyRev)}/hari</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${slopeBadge}`}>
                          Slope {reg.slope >= 0 ? '↑' : '↓'}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}

        <p className="text-center text-[10px] text-[#8C7A6B] font-bold mt-8 uppercase tracking-widest">
          Chōgō Coffee · Staff Attendance Analytics · Tugas Akhir · UNSAP 2025
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PAGE ROOT — state machine: dropzone (null) → dashboard (loaded)
// ════════════════════════════════════════════════════════════════════
export default function AnalyticsPage() {
  const [records,  setRecords]  = useState<AttendanceRecord[] | null>(null);
  const [filename, setFilename] = useState('');
  const [parseErr, setParseErr] = useState('');

  const handleFile  = useCallback((r: AttendanceRecord[], name: string) => {
    setParseErr('');
    setRecords(r);
    setFilename(name);
  }, []);

  const handleReset = useCallback(() => {
    setRecords(null);
    setFilename('');
    setParseErr('');
  }, []);

  if (!records) {
    return (
      <>
        <CsvDropzone onFile={handleFile} onError={setParseErr} />
        {parseErr && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#8A2E2E] text-white px-6 py-3 rounded-2xl text-xs font-black shadow-xl z-50 max-w-md text-center">
            {parseErr}
          </div>
        )}
      </>
    );
  }

  return <DashboardView records={records} filename={filename} onReset={handleReset} />;
}
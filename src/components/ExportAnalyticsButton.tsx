'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExportAnalyticsButtonProps {
  /**
   * Zero-indexed month (0 = January … 11 = December).
   * Pass -1 to export ALL data with no date filter.
   */
  month: number;
  /**
   * Calendar year for the export. Defaults to 2026.
   */
  year?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS_ID = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
] as const;

const MONTHS_SLUG = [
  'januari','februari','maret','april','mei','juni',
  'juli','agustus','september','oktober','november','desember',
] as const;

// ── Financial-month → calendar date range ─────────────────────────────────────
// Chogo rule: day >= 28 belongs to next financial month.
// So financial month M spans calendar dates from the 28th of (M-1) through
// the 27th of M (inclusive), which means we query created_at:
//   >= first instant of 28th of previous calendar month
//   <  first instant of 28th of current calendar month
// For "Semua Data" (month === -1) we skip date filtering entirely.
function buildDateRange(
  financialMonth: number, // 0-indexed, -1 = all
  year: number,
): { start: string; end: string } | null {
  if (financialMonth === -1) return null;

  // Previous calendar month (28th) = start of this financial month
  const prevCalMonth = financialMonth === 0 ? 11 : financialMonth - 1;
  const prevYear     = financialMonth === 0 ? year - 1 : year;

  // Start: 2026-06-28T00:00:00+07:00 (WIB midnight)
  const startWib = new Date(prevYear, prevCalMonth, 28, 0, 0, 0);
  // End  : 2026-07-28T00:00:00+07:00 (exclusive upper bound)
  const endWib   = new Date(year, financialMonth, 28, 0, 0, 0);

  // Convert WIB (UTC+7) to UTC for Supabase timestamptz comparison.
  // new Date(local) gives UTC already when using numeric constructor,
  // but we need to subtract 7h to get the WIB midnight in UTC.
  const toUTC = (d: Date) => new Date(d.getTime() - 7 * 60 * 60 * 1000).toISOString();

  return { start: toUTC(startWib), end: toUTC(endWib) };
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function escapeField(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const dataRows = rows.map(r => headers.map(h => escapeField(r[h])).join(','));
  return [headers.join(','), ...dataRows].join('\n');
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExportAnalyticsButton({
  month,
  year = 2026,
}: ExportAnalyticsButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  // Derive human-readable label from the prop (re-computes on every render when
  // parent passes a new month — no stale closure issues).
  const monthLabel  = month === -1 ? 'Semua Data' : `${MONTHS_ID[month]} ${year}`;
  const monthSlug   = month === -1 ? 'semua'      : `${MONTHS_SLUG[month]}-${year}`;
  const filename    = `chogo-attendance-${monthSlug}.csv`;

  async function handleExport() {
    setStatus('loading');
    setErrMsg('');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Columns exported — maps directly to analytics page CSV schema:
    // id | date | staff_name | items_sold | revenue_generated | late_minutes | status
    const COLUMNS = 'id,created_at,staff_name,items_sold,revenue_generated,late_minutes,status';

    let query = supabase
      .from('attendance_logs')
      .select(COLUMNS)
      .order('created_at', { ascending: true });

    // Apply date range only when a specific financial month is selected
    const range = buildDateRange(month, year);
    if (range) {
      // gte/lt on timestamptz — Supabase compares in UTC, which is correct
      // because buildDateRange() already converts WIB midnight → UTC.
      query = query.gte('created_at', range.start).lt('created_at', range.end);
    }

    const { data, error } = await query;

    if (error) {
      setStatus('error');
      setErrMsg(error.message);
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    if (!data || data.length === 0) {
      setStatus('error');
      setErrMsg(`Tidak ada data untuk ${monthLabel}.`);
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    // Remap created_at → date (YYYY-MM-DD WIB) so analytics page gets
    // a clean date string without timezone ambiguity.
    const remapped = data.map((r: any) => {
      // Parse created_at timestamptz and convert to WIB date string
      const wibDate = new Date(
        new Date(r.created_at).getTime() + 7 * 60 * 60 * 1000,
      ).toISOString().slice(0, 10); // 'YYYY-MM-DD'

      return {
        id:                r.id,
        date:              wibDate,
        staff_name:        r.staff_name   ?? '',
        items_sold:        r.items_sold   ?? 0,
        revenue_generated: r.revenue_generated ?? 0,
        late_minutes:      r.late_minutes ?? 0,
        status:            r.status       ?? '',
      };
    });

    const CSV_HEADERS = [
      'id','date','staff_name','items_sold','revenue_generated','late_minutes','status',
    ];

    const csv = buildCsv(remapped, CSV_HEADERS);
    triggerDownload(csv, filename);

    setStatus('success');
    setTimeout(() => setStatus('idle'), 2500);
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const base = 'inline-flex items-center gap-2 h-[48px] px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed';

  const variant =
    status === 'success' ? 'bg-[#E8F5E9] text-[#2D5A2D] border border-[#C8E6C9]' :
    status === 'error'   ? 'bg-[#FDF2F2] text-[#8A2E2E] border border-[#F5C6C6]' :
    status === 'loading' ? 'bg-[#FAF8F5] text-[#8C7A6B] border border-[#EBE5D9]'  :
                           'bg-white text-[#3A2A1A] border border-[#EBE5D9] hover:border-[#C69C6D]';

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleExport}
        disabled={status === 'loading'}
        className={`${base} ${variant}`}
        title={`Export data ${monthLabel} dari attendance_logs`}
      >
        {/* Icon */}
        {status === 'loading' && (
          <svg className="h-3.5 w-3.5 animate-spin shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 10z"/>
          </svg>
        )}
        {status === 'success' && (
          <svg className="h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        )}
        {status === 'error' && (
          <svg className="h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        )}
        {status === 'idle' && (
          <svg className="h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
        )}

        {/* Label — dynamically reflects active month prop */}
        <span>
          {status === 'loading' ? 'Mengambil...' :
           status === 'success' ? `✓ ${filename}` :
           status === 'error'   ? 'Gagal — Coba Lagi' :
           `Export CSV — ${monthLabel}`}
        </span>
      </button>

      {status === 'error' && errMsg && (
        <p className="text-[9px] font-bold text-[#8A2E2E] pl-1">{errMsg}</p>
      )}
    </div>
  );
}
'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- KONFIGURASI KEUANGAN & ADMIN ---
const ADMIN_SECRET_KEY = 'CHOGO2024';
const SUPER_ADMIN_ID = '1a24f87a-8ee9-4e19-857a-06ec616d1378';
const OWNER_ID = 'f2b6a943-4f9e-4b2a-8d1c-99e52e25d2b7';

const GAJI_POKOK_STAFF = 35000;
const BONUS_PER_ITEM = 500;
const DENDA_PER_MENIT = 500;
const ROYALTI_GM_PER_ITEM = 1500;
const PERSENTASE_DIVIDEN_OWNER = 0.5; // 50% untuk Owner, 50% masuk Kas Chogo
const MODAL_KASIR_TETAP = 100000; // Uang yang selalu ada di laci (kembalian awal)

// STAFF LIST
const STAFF_LIST = [
  { id: 'c720fb23-e13f-4f5d-a2de-40989ae1df69', name: 'Vikry' },
  { id: 'a6b27457-78f6-474e-8f9b-36a45028a8be', name: 'Arief' },
  { id: 'b1935c42-8a9b-4e31-a7d2-6f2c3a5b8d91', name: 'Adin' },
  { id: OWNER_ID, name: 'Iboo (Owner)' },
  { id: SUPER_ADMIN_ID, name: 'Moch Sugih Nugraha (GM)' }
];

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// FUNGSI FIX ZONA WAKTU LOKAL
const getLocalDateString = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AdminDashboard() {
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'PAYROLL' | 'FINANCE'>('LOGS');
  
  const [logs, setLogs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());

  // Form Pengeluaran
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expQty, setExpQty] = useState('1'); 
  const [expCategory, setExpCategory] = useState('Bahan Baku');

  const fetchData = async () => {
    setLoading(true);
    const { data: logData } = await supabase.from('attendance_logs').select('*').order('created_at', { ascending: false });
    const { data: expData } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (logData) setLogs(logData);
    if (expData) setExpenses(expData);
    setLoading(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === ADMIN_SECRET_KEY) {
      setIsAuthorized(true);
      fetchData();
    } else {
      alert('Kunci Akses Salah!');
    }
  };

  const handleDeleteLog = async (id: string) => {
    if(confirm('Hapus data absensi ini?')) {
      await supabase.from('attendance_logs').delete().eq('id', id);
      fetchData();
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if(confirm('Hapus rincian pengeluaran ini?')) {
      await supabase.from('expenses').delete().eq('id', id);
      fetchData();
    }
  };

  const handleResetDenda = async (id: string) => {
    if(confirm('Reset denda menjadi Rp 0?')) {
      setLoading(true);
      await supabase.from('attendance_logs').update({ late_minutes: 0 }).eq('id', id);
      fetchData();
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc || !expAmount || !expQty) return;
    setLoading(true);
    await supabase.from('expenses').insert({ 
      description: expDesc, 
      amount: parseFloat(expAmount), 
      category: expCategory,
      qty: parseInt(expQty) 
    });
    setExpDesc(''); setExpAmount(''); setExpQty('1'); 
    fetchData();
  };

  const { payrollData, financeData, currentMonthLogs, currentMonthExpenses } = useMemo(() => {
    const filteredLogs = logs.filter(log => new Date(log.created_at).getMonth() === filterMonth);
    const filteredExpenses = expenses.filter(exp => new Date(exp.created_at).getMonth() === filterMonth);

    const dailyGlobalItems: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const dateKey = getLocalDateString(log.created_at);
      if (!dailyGlobalItems[dateKey]) dailyGlobalItems[dateKey] = 0;
      if (log.user_id !== SUPER_ADMIN_ID) dailyGlobalItems[dateKey] += (log.items_sold || 0);
    });

    const payrollByUser: Record<string, { name: string, role: string, records: any[], totalGaji: number }> = {};
    STAFF_LIST.forEach(staff => {
      let roleLabel = 'Staff';
      if (staff.id === SUPER_ADMIN_ID) roleLabel = 'GM';
      if (staff.id === OWNER_ID) roleLabel = 'Owner';
      payrollByUser[staff.id] = { name: staff.name, role: roleLabel, records: [], totalGaji: 0 };
    });

    let totalPayrollBeban = 0;
    
    filteredLogs.forEach(log => {
      const dateKey = getLocalDateString(log.created_at);
      const userPayroll = payrollByUser[log.user_id];
      if (!userPayroll) return;

      const globalItemsHariIni = dailyGlobalItems[dateKey] || 0; 
      let gajiPokok = 0, bonus = 0, denda = 0, totalBersih = 0;
      
      if (log.user_id === SUPER_ADMIN_ID) {
        bonus = globalItemsHariIni * ROYALTI_GM_PER_ITEM;
        totalBersih = bonus;
        userPayroll.records.push({ id: log.id, date: dateKey, items: globalItemsHariIni, gajiPokok: 0, bonus, denda: 0, totalBersih });
      } else if (log.user_id === OWNER_ID) {
        gajiPokok = GAJI_POKOK_STAFF;
        bonus = globalItemsHariIni * BONUS_PER_ITEM;
        totalBersih = gajiPokok + bonus;
        userPayroll.records.push({ id: log.id, date: dateKey, items: globalItemsHariIni, gajiPokok, bonus, denda: 0, totalBersih });
      } else {
        gajiPokok = GAJI_POKOK_STAFF;
        bonus = globalItemsHariIni * BONUS_PER_ITEM;
        denda = (log.late_minutes || 0) * DENDA_PER_MENIT;
        let kalkulasiKotor = gajiPokok + bonus - denda;
        totalBersih = kalkulasiKotor < 0 ? 0 : kalkulasiKotor; 
        userPayroll.records.push({ id: log.id, date: dateKey, items: globalItemsHariIni, gajiPokok, bonus, denda, totalBersih });
      }
      
      userPayroll.totalGaji += totalBersih;
      totalPayrollBeban += totalBersih;
    });

    const totalRevenue = filteredLogs.reduce((sum, log) => sum + (log.revenue_generated || 0), 0);
    
    let totalExpensesCalc = 0; 
    let totalGajiDibayar = 0;  

    filteredExpenses.forEach(exp => {
      if (exp.category === 'Pembayaran Gaji & Royalti') {
        totalGajiDibayar += (exp.amount || 0);
      } else if (exp.category !== 'Uang Kembalian (Non-Expense)') {
        totalExpensesCalc += (exp.amount || 0);
      }
    });
    
    const netProfit = totalRevenue - totalExpensesCalc - totalPayrollBeban;
    const dividenOwner = netProfit * PERSENTASE_DIVIDEN_OWNER;
    const kasChogo = netProfit - dividenOwner;

    // LOGIKA UANG FISIK (Dipisah antara dompet dan laci)
    const uangDompet = totalRevenue - totalExpensesCalc - totalGajiDibayar; // Uang hasil jualan yg dipegang owner
    const uangGrandTotal = uangDompet + MODAL_KASIR_TETAP; // Total Dompet + Laci

    let danaDitahan = totalPayrollBeban - totalGajiDibayar;
    if (danaDitahan < 0) danaDitahan = 0; 

    return {
      payrollData: Object.values(payrollByUser).filter(u => u.records.length > 0),
      financeData: { totalRevenue, totalExpenses: totalExpensesCalc, totalPayrollBeban, netProfit, dividenOwner, kasChogo, uangDompet, uangGrandTotal, danaDitahan, totalGajiDibayar },
      currentMonthLogs: filteredLogs,
      currentMonthExpenses: filteredExpenses
    };
  }, [logs, expenses, filterMonth]);

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  const formatTime = (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[32px] shadow-sm border border-[#EBE5D9] w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-[#3A2A1A] rounded-full mx-auto mb-6 flex items-center justify-center text-white text-xl">🔐</div>
          <h1 className="text-2xl font-serif font-bold text-[#3A2A1A] mb-2">Executive Portal</h1>
          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <input type="password" placeholder="Passcode" className="w-full border border-[#EBE5D9] p-4 rounded-2xl text-center text-lg tracking-[0.5em] text-[#3A2A1A] placeholder-gray-400 outline-none focus:border-[#C69C6D] bg-[#FAF8F5]" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
            <button className="w-full bg-[#3A2A1A] text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-[#C69C6D] transition-all">Unlock ERP</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] p-4 md:p-8 text-[#3A2A1A]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-serif font-black tracking-tight">Chōgō Command Center</h1>
            <p className="text-sm text-[#8C7A6B] font-medium mt-1">Sistem Terintegrasi Absensi, Payroll & Keuangan</p>
          </div>
          <div className="flex items-center gap-4">
            <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} className="bg-white border border-[#EBE5D9] px-4 py-3 rounded-full text-xs font-bold uppercase tracking-widest outline-none shadow-sm cursor-pointer hover:border-[#C69C6D] transition-colors">
              {MONTHS.map((m, i) => <option key={i} value={i}>Bulan: {m}</option>)}
            </select>
            <button onClick={fetchData} className="bg-white border border-[#EBE5D9] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:border-[#3A2A1A] transition-all shadow-sm">
              {loading ? '...' : '🔄 Sync'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['LOGS', 'PAYROLL', 'FINANCE'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#3A2A1A] text-white shadow-md' : 'bg-white text-[#8C7A6B] border border-[#EBE5D9] hover:border-[#C69C6D]'}`}>
              {tab === 'LOGS' ? 'Data Absen' : tab === 'PAYROLL' ? 'Slip Gaji' : 'Laba & Rugi'}
            </button>
          ))}
        </div>

        {/* --- TAB 1: ABSENSI --- */}
        {activeTab === 'LOGS' && (
          <div className="bg-white rounded-[32px] border border-[#EBE5D9] overflow-hidden shadow-sm p-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EBE5D9]">
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Tanggal (Shift)</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Nama</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">In / Out</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Bukti & Lokasi</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Catatan / Pekerjaan</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Item / Revenue</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE1]">
                  {currentMonthLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FCF9F4] transition-colors">
                      <td className="p-4 text-xs font-bold">{formatDate(log.created_at)}</td>
                      <td className="p-4 font-black uppercase text-xs">{log.staff_name}</td>
                      <td className="p-4 text-xs">
                        <span className="text-[#2D5A2D] font-bold">{formatTime(log.created_at)}</span> - <span className="text-[#8A2E2E] font-bold">{formatTime(log.clock_out_time)}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          {log.clock_in_photo_url ? (
                            <a href={log.clock_in_photo_url} target="_blank" rel="noopener noreferrer">
                              <img src={log.clock_in_photo_url} alt="Selfie" className="w-10 h-10 rounded-lg object-cover border border-[#EBE5D9] hover:scale-125 transition-transform cursor-zoom-in" />
                            </a>
                          ) : <span className="text-[10px] text-gray-400 font-bold">No Photo</span>}
                        </div>
                      </td>
                      <td className="p-4 text-[10px] font-bold text-[#8C7A6B] max-w-[150px]">{log.notes || '-'}</td>
                      <td className="p-4"><div><p className="text-xs font-bold">{log.items_sold || 0} Item</p><p className="text-[10px] font-black text-[#C69C6D]">{formatRp(log.revenue_generated || 0)}</p></div></td>
                      <td className="p-4 text-center"><button onClick={() => handleDeleteLog(log.id)} className="bg-[#FDF2F2] text-[#8A2E2E] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase">Hapus</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 2: PAYROLL --- */}
        {activeTab === 'PAYROLL' && (
          <div className="space-y-8">
            {payrollData.map((user, idx) => (
              <div key={idx} className="bg-white rounded-[32px] border border-[#EBE5D9] overflow-hidden shadow-sm p-8">
                <div className="flex justify-between items-end mb-6 border-b border-[#EBE5D9] pb-4">
                  <div><h2 className="text-2xl font-serif font-black uppercase">{user.name}</h2><p className="text-xs font-bold text-[#C69C6D] uppercase">Role: {user.role}</p></div>
                  <div className="text-right"><p className="text-[10px] font-black text-[#8C7A6B] uppercase mb-1">Total Gaji {MONTHS[filterMonth]}</p><h3 className="text-2xl font-black text-[#2D5A2D]">{formatRp(user.totalGaji)}</h3></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#FAF8F5]">
                      <tr className="text-[10px] font-black text-[#8C7A6B] uppercase">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3 text-center">Item (Global)</th>
                        {user.role !== 'GM' && <th className="p-3 text-right">Gaji Pokok</th>}
                        <th className="p-3 text-right">Bonus/Royalti</th>
                        {user.role !== 'GM' && <th className="p-3 text-right">Denda</th>}
                        <th className="p-3 text-right">Total Bersih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EBE1]">
                      {user.records.map((rec, i) => (
                        <tr key={i} className="hover:bg-[#FCF9F4] text-xs">
                          <td className="p-3 font-bold">{formatDate(rec.date)}</td>
                          <td className="p-3 font-bold text-center text-[#C69C6D]">{rec.items}</td> 
                          {user.role !== 'GM' && <td className="p-3 text-right">{formatRp(rec.gajiPokok)}</td>}
                          <td className="p-3 font-bold text-[#2D5A2D] text-right">+{formatRp(rec.bonus)}</td>
                          {user.role !== 'GM' && <td className="p-3 font-bold text-[#8A2E2E] text-right">-{formatRp(rec.denda)}</td>}
                          <td className="p-3 font-black text-right">{formatRp(rec.totalBersih)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TAB 3: FINANCE --- */}
        {activeTab === 'FINANCE' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* CARD: TOTAL UANG FISIK (DIUBAH SESUAI PERMINTAAN OWNER) */}
              <div className="bg-[#2D5A2D] rounded-[24px] p-6 text-white relative overflow-hidden shadow-md border border-[#1F401F]">
                <div className="relative z-10">
                  <p className="text-xs font-black text-[#A3C8A3] uppercase mb-1">Total Uang di Tangan (Dompet Owner)</p>
                  <h2 className="text-4xl md:text-5xl font-black mb-4">{formatRp(financeData.uangDompet)}</h2>
                  
                  <div className="bg-[#1F401F] rounded-xl p-4 mt-4 border border-[#3A703A]">
                    <p className="text-[10px] font-bold text-[#A3C8A3] uppercase mb-2">Rincian Uang di Dompet:</p>
                    <div className="space-y-2 text-sm font-medium">
                      <div className="flex justify-between border-b border-[#3A703A] pb-1">
                        <span>Laba Bersih Chogo (50%)</span>
                        <span className="font-bold">{formatRp(financeData.kasChogo)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3A703A] pb-1">
                        <span>Dividen Owner (50%)</span>
                        <span className="font-bold">{formatRp(financeData.dividenOwner)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3A703A] pb-1 text-[#F1C40F]">
                        <span>Dana Ditahan (Gaji & Royalti)</span>
                        <span className="font-bold">{formatRp(financeData.danaDitahan)}</span>
                      </div>
                      
                      {/* BARIS TAMBAHAN UNTUK MODAL KASIR & GRAND TOTAL */}
                      <div className="flex justify-between pt-2 mt-1 border-t border-[#3A703A] border-dashed text-[#3AE374]">
                        <span>+ Modal Kasir (Aman di Laci)</span>
                        <span className="font-bold">{formatRp(MODAL_KASIR_TETAP)}</span>
                      </div>
                      <div className="flex justify-between pt-2 mt-2 border-t-2 border-[#A3C8A3] text-lg text-white">
                        <span>TOTAL KESELURUHAN (Dompet + Laci)</span>
                        <span className="font-black">{formatRp(financeData.uangGrandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute right-0 top-0 text-9xl opacity-5 translate-x-4 -translate-y-4">💰</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] col-span-2"><p className="text-[10px] font-black text-[#8C7A6B] uppercase mb-2">Total Pendapatan Kotor</p><h3 className="text-3xl font-black text-[#3A2A1A]">{formatRp(financeData.totalRevenue)}</h3></div>
                <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] col-span-2"><p className="text-[10px] font-black text-[#8C7A6B] uppercase mb-2">Total Pengeluaran Nota</p><h3 className="text-3xl font-black text-[#8A2E2E]">{formatRp(financeData.totalExpenses)}</h3></div>
              </div>

              {/* RINCIAN PENGELUARAN */}
              <div className="bg-white rounded-[24px] border border-[#EBE5D9] p-6">
                <h3 className="font-black uppercase text-sm mb-6">Rincian Pengeluaran Bulan {MONTHS[filterMonth]}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EBE5D9] text-[10px] font-black text-[#8C7A6B] uppercase">
                        <th className="pb-3">Tanggal</th>
                        <th className="pb-3">Kategori</th>
                        <th className="pb-3">Deskripsi</th>
                        <th className="pb-3 text-right">Total Nominal</th>
                        <th className="pb-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EBE1]">
                      {currentMonthExpenses.map(exp => (
                        <tr key={exp.id} className="text-xs">
                          <td className="py-3 font-bold">{formatDate(exp.created_at)}</td>
                          <td className="py-3 text-[10px] font-black uppercase text-[#C69C6D]">{exp.category}</td>
                          <td className="py-3">{exp.description}</td>
                          <td className={`py-3 text-right font-black ${exp.category === 'Uang Kembalian (Non-Expense)' ? 'text-[#2D5A2D]' : 'text-[#8A2E2E]'}`}>{formatRp(exp.amount)}</td>
                          <td className="py-3 text-center"><button onClick={() => handleDeleteExpense(exp.id)} className="text-red-400 hover:text-red-600 font-black uppercase text-[10px]">Hapus</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* FORM INPUT PENGELUARAN */}
            <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] h-max sticky top-8">
              <h3 className="font-black uppercase text-sm mb-6">Input Nota Keluar</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Kategori</label>
                  <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className="w-full mt-1 border border-[#EBE5D9] p-3 rounded-xl text-xs font-bold bg-[#FAF8F5] outline-none">
                    <option value="Bahan Baku">Bahan Baku</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Pembayaran Gaji & Royalti">Pembayaran Gaji & Royalti</option>
                    <option value="Uang Kembalian (Non-Expense)">Uang Kembalian (Modal Kasir)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Deskripsi</label>
                  <input type="text" placeholder="Cth: Belanja Susu" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className="w-full mt-1 border border-[#EBE5D9] p-3 rounded-xl text-xs font-bold bg-[#FAF8F5] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Total (Rp)</label>
                  <input type="number" placeholder="0" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="w-full mt-1 border border-[#EBE5D9] p-3 rounded-xl text-xs font-bold bg-[#FAF8F5] outline-none" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#C69C6D] text-white py-4 rounded-xl font-black uppercase text-[10px] hover:bg-[#B58B5C]">Simpan Nota</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
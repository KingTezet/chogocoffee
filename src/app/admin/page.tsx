'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- KONFIGURASI KEUANGAN & ADMIN ---
const ADMIN_SECRET_KEY = 'CHOGO2024';
const SUPER_ADMIN_ID = '1a24f87a-8ee9-4e19-857a-06ec616d1378';

const GAJI_POKOK_STAFF = 35000;
const BONUS_PER_ITEM = 500;
const DENDA_PER_MENIT = 500;
const ROYALTI_GM_PER_ITEM = 1500;
const PERSENTASE_DIVIDEN_OWNER = 0.5; 
const MODAL_KASIR_TETAP = 100000; 
const CUSTOMERS_PER_PAGE = 25; 

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const getLocalDateString = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getFinancialMonth = (dateStr: string) => {
  const d = new Date(dateStr);
  if (d.getDate() >= 28) { d.setMonth(d.getMonth() + 1); }
  return d.getMonth();
};

const selectBgIcon = `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238C7A6B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`;

export default function AdminDashboard() {
  // --- STATES ---
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'PAYROLL' | 'FINANCE' | 'STAFF' | 'CUSTOMERS' | 'ACTIVITY'>('LOGS');
  
  const [logs, setLogs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]); 
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [filterMonth, setFilterMonth] = useState(getFinancialMonth(new Date().toISOString()));
  const [unlockPastMonth, setUnlockPastMonth] = useState(false);

  // Form Pengeluaran
  const [expDate, setExpDate] = useState(getLocalDateString(new Date().toISOString()));
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Bahan Baku');

  // Modal Edit Absen
  const [editingLog, setEditingLog] = useState<any>(null);
  const [editItems, setEditItems] = useState('');
  const [editRevenue, setEditRevenue] = useState('');
  const [editLateMinutes, setEditLateMinutes] = useState('');

  // Form Manajemen Staff
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Staff');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Form Manajemen Pelanggan
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custStamps, setCustStamps] = useState('0');
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [currentCustomerPage, setCurrentCustomerPage] = useState(1);

  useEffect(() => {
    setUnlockPastMonth(false);
  }, [filterMonth]);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    const { data: logData } = await supabase.from('attendance_logs').select('*').order('created_at', { ascending: false });
    const { data: expData } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    const { data: actData } = await supabase.from('admin_activity_logs').select('*').order('created_at', { ascending: false });
    const { data: staffData } = await supabase.from('staff_users').select('*').order('created_at', { ascending: true });
    const { data: custData } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    
    if (logData) setLogs(logData);
    if (expData) setExpenses(expData);
    if (actData) setActivityLogs(actData);
    if (staffData) setStaffList(staffData);
    if (custData) setCustomerList(custData);
    setLoading(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === ADMIN_SECRET_KEY) { setIsAuthorized(true); fetchData(); } 
    else { alert('Kunci Akses Salah!'); }
  };

  // --- FUNGSI STAFF ---
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newStaffName) return; setLoading(true);
    if (editingStaffId) {
      await supabase.from('staff_users').update({ name: newStaffName, role: newStaffRole }).eq('id', editingStaffId);
      await supabase.from('admin_activity_logs').insert({ action: `[STAFF] Edit data ${newStaffName} menjadi role ${newStaffRole}` });
    } else {
      await supabase.from('staff_users').insert({ name: newStaffName, role: newStaffRole, status: 'Active' });
      await supabase.from('admin_activity_logs').insert({ action: `[STAFF] Menambah karyawan baru: ${newStaffName} (${newStaffRole})` });
    }
    setNewStaffName(''); setNewStaffRole('Staff'); setEditingStaffId(null); fetchData();
  };

  const handleToggleStaffStatus = async (id: string, currentStatus: string, name: string) => {
    const newStatus = currentStatus === 'Active' ? 'Resigned' : 'Active';
    if(confirm(`Ubah status ${name} menjadi ${newStatus}?`)) {
      setLoading(true);
      await supabase.from('staff_users').update({ status: newStatus }).eq('id', id);
      await supabase.from('admin_activity_logs').insert({ action: `[STAFF] Ubah status ${name} menjadi ${newStatus}` });
      fetchData();
    }
  };

  // --- FUNGSI PELANGGAN (LOYALTY) ---
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault(); if (!custName || !custPhone) return; setLoading(true);
    let formattedPhone = custPhone.trim().replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('62')) { formattedPhone = '0' + formattedPhone.slice(2); }
    if (editingCustId) {
      await supabase.from('customers').update({ name: custName, phone: formattedPhone, stamps: parseInt(custStamps || '0') }).eq('id', editingCustId);
      await supabase.from('admin_activity_logs').insert({ action: `[LOYALTY] Edit data pelanggan ${custName} (Stamp: ${custStamps})` });
    } else {
      await supabase.from('customers').insert({ name: custName, phone: formattedPhone, stamps: parseInt(custStamps || '0') });
      await supabase.from('admin_activity_logs').insert({ action: `[LOYALTY] Mendaftarkan member baru: ${custName}` });
    }
    setCustName(''); setCustPhone(''); setCustStamps('0'); setEditingCustId(null); fetchData();
  };

  const handleUpdateStamps = async (id: string, currentStamps: number, amount: number, customerName: string) => {
    let newStamps = currentStamps + amount; if (newStamps < 0) newStamps = 0;
    await supabase.from('customers').update({ stamps: newStamps }).eq('id', id);
    const actionText = amount > 0 ? 'Menambah' : 'Mengurangi';
    await supabase.from('admin_activity_logs').insert({ action: `[LOYALTY] ${actionText} stamp ${customerName} menjadi ${newStamps}` });
    fetchData();
  };

  const handleClaimReward = async (id: string, currentStamps: number, customerName: string) => {
    if (currentStamps < 10) { alert('Stamp belum mencukupi (Minimal 10 Stamp).'); return; }
    if (confirm(`Kurangi 10 stamp untuk penukaran 1 kopi gratis? Sisa stamp pelanggan akan menjadi ${currentStamps - 10}.`)) {
      setLoading(true);
      await supabase.from('customers').update({ stamps: currentStamps - 10 }).eq('id', id);
      await supabase.from('admin_activity_logs').insert({ action: `[REWARD] ${customerName} mengklaim 1 kopi gratis! (Sisa Stamp: ${currentStamps - 10})` });
      fetchData();
    }
  };

  const getWhatsAppLink = (phone: string, name: string, stamps: number) => {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) { cleanPhone = '62' + cleanPhone.slice(1); }
    let text = stamps >= 10 
      ? `Halo Kak ${name}, kami dari Chogo Coffee ingin menginfokan bahwa stamp Kakak sudah penuh (${stamps} stamp). Kakak sudah bisa menukarkannya dengan 1 kopi gratis di outlet Chogo Coffee. Sampai jumpa di outlet Kak!` 
      : `Halo Kak ${name}, kami dari Chogo Coffee ingin menginfokan bahwa kartu loyalitas Kakak sudah mencapai ${stamps} stamp nih. Sedikit lagi penuh untuk klaim 1 kopi gratis. Ditunggu kedatangannya kembali di outlet ya Kak!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const { paginatedCustomers, totalCustomerPages } = useMemo(() => {
    let result = [...customerList];
    if (searchCustomer.trim()) {
      const q = searchCustomer.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const aPriority = a.stamps >= 8 ? 1 : 0; const bPriority = b.stamps >= 8 ? 1 : 0;
      if (aPriority !== bPriority) { return bPriority - aPriority; }
      return b.stamps - a.stamps; 
    });
    const totalPages = Math.ceil(result.length / CUSTOMERS_PER_PAGE) || 1;
    const startIndex = (currentCustomerPage - 1) * CUSTOMERS_PER_PAGE;
    return { paginatedCustomers: result.slice(startIndex, startIndex + CUSTOMERS_PER_PAGE), totalCustomerPages: totalPages };
  }, [customerList, searchCustomer, currentCustomerPage]);

  // --- FUNGSI ABSEN & PENGELUARAN ---
  const handleDeleteLog = async (id: string, staffName: string) => {
    if(confirm(`Hapus data absensi ${staffName}?`)) {
      setLoading(true);
      await supabase.from('attendance_logs').delete().eq('id', id);
      await supabase.from('admin_activity_logs').insert({ action: `[ABSEN] Menghapus data absensi milik ${staffName}` });
      fetchData();
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    setLoading(true);
    await supabase.from('attendance_logs').update({
      items_sold: parseInt(editItems || '0'),
      revenue_generated: parseFloat(editRevenue || '0'),
      late_minutes: parseInt(editLateMinutes || '0')
    }).eq('id', editingLog.id);
    await supabase.from('admin_activity_logs').insert({ action: `[EDIT ABSEN] ${editingLog.staff_name} - Item: ${editItems}, Revenue: Rp${editRevenue}, Telat: ${editLateMinutes}mnt` });
    setEditingLog(null); fetchData();
  };

  const handleDeleteExpense = async (id: string, desc: string) => {
    if(confirm('Hapus rincian pengeluaran ini?')) {
      await supabase.from('expenses').delete().eq('id', id);
      await supabase.from('admin_activity_logs').insert({ action: `[PENGELUARAN] Menghapus nota: ${desc}` });
      fetchData();
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!expDesc || !expAmount || !expDate) return; 
    setLoading(true);

    const selectedD = new Date(expDate);
    selectedD.setHours(12, 0, 0, 0); 
    
    await supabase.from('expenses').insert({ 
      description: expDesc, 
      amount: parseFloat(expAmount), 
      category: expCategory,
      created_at: selectedD.toISOString() 
    });
    
    await supabase.from('admin_activity_logs').insert({ action: `[PENGELUARAN] Menambah nota ${expCategory}: ${expDesc} (Rp${expAmount})` });
    setExpDesc(''); setExpAmount(''); setExpDate(getLocalDateString(new Date().toISOString())); fetchData();
  };

  // --- LOGIKA PERHITUNGAN KEUANGAN ---
  const { payrollData, financeData, currentMonthLogs, currentMonthExpenses, currentMonthActivity } = useMemo(() => {
    const filteredLogs = logs.filter(log => filterMonth === -1 || getFinancialMonth(log.created_at) === filterMonth);
    const filteredExpenses = expenses.filter(exp => filterMonth === -1 || getFinancialMonth(exp.created_at) === filterMonth);
    const filteredActivity = activityLogs.filter(act => filterMonth === -1 || getFinancialMonth(act.created_at) === filterMonth);

    const dailyGlobalItems: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const dateKey = getLocalDateString(log.created_at);
      if (!dailyGlobalItems[dateKey]) dailyGlobalItems[dateKey] = 0;
      if (log.user_id !== SUPER_ADMIN_ID) dailyGlobalItems[dateKey] += (log.items_sold || 0);
    });

    const payrollByUser: Record<string, { name: string, role: string, records: any[], totalGaji: number }> = {};
    staffList.forEach(staff => { payrollByUser[staff.id] = { name: staff.name, role: staff.role, records: [], totalGaji: 0 }; });

    let monthlyTotalRevenue = 0;
    let monthlyPayrollBeban = 0;
    
    filteredLogs.forEach(log => {
      monthlyTotalRevenue += (log.revenue_generated || 0);
      const dateKey = getLocalDateString(log.created_at); 
      const userPayroll = payrollByUser[log.user_id]; 
      if (!userPayroll) return;

      const globalItemsHariIni = dailyGlobalItems[dateKey] || 0; 
      let gp = 0, bonus = 0, denda = 0, totalBersih = 0;
      
      if (userPayroll.role === 'GM') {
        bonus = globalItemsHariIni * ROYALTI_GM_PER_ITEM; totalBersih = bonus;
        userPayroll.records.push({ date: dateKey, items: globalItemsHariIni, gp: 0, bonus, denda: 0, bersih: totalBersih });
      } else if (userPayroll.role === 'Owner') {
        gp = GAJI_POKOK_STAFF; bonus = globalItemsHariIni * BONUS_PER_ITEM; totalBersih = gp + bonus;
        userPayroll.records.push({ date: dateKey, items: globalItemsHariIni, gp, bonus, denda: 0, bersih: totalBersih });
      } else if (userPayroll.role === 'Training') {
        gp = GAJI_POKOK_STAFF; totalBersih = gp;
        userPayroll.records.push({ date: dateKey, items: 0, gp, bonus: 0, denda: 0, bersih: totalBersih });
      } else {
        gp = GAJI_POKOK_STAFF; bonus = globalItemsHariIni * BONUS_PER_ITEM; denda = (log.late_minutes || 0) * DENDA_PER_MENIT;
        let kalkulasiKotor = gp + bonus - denda; totalBersih = Math.max(0, kalkulasiKotor); 
        userPayroll.records.push({ date: dateKey, items: globalItemsHariIni, gp, bonus, denda, bersih: totalBersih });
      }
      userPayroll.totalGaji += totalBersih;
      monthlyPayrollBeban += totalBersih;
    });

    let monthlyTotalExpenses = 0; 
    filteredExpenses.forEach(exp => {
      if (exp.category !== 'Pembayaran Gaji & Royalti' && exp.category !== 'Penarikan Dividen Owner' && exp.category !== 'Uang Kembalian (Non-Expense)') {
        monthlyTotalExpenses += (exp.amount || 0);
      }
    });

    const monthlyNetProfit = monthlyTotalRevenue - monthlyTotalExpenses - monthlyPayrollBeban;
    const monthlyHakOwner = monthlyNetProfit * PERSENTASE_DIVIDEN_OWNER;
    const monthlyKasChogo = monthlyNetProfit - monthlyHakOwner;

    const allTimeDailyGlobalItems: Record<string, number> = {};
    logs.forEach(log => {
      const dateKey = getLocalDateString(log.created_at);
      if (!allTimeDailyGlobalItems[dateKey]) allTimeDailyGlobalItems[dateKey] = 0;
      if (log.user_id !== SUPER_ADMIN_ID) allTimeDailyGlobalItems[dateKey] += (log.items_sold || 0);
    });

    let allTimeTotalRevenue = 0;
    let allTimePayrollBeban = 0;
    
    logs.forEach(log => {
      allTimeTotalRevenue += (log.revenue_generated || 0);
      const dateKey = getLocalDateString(log.created_at);
      const userRole = staffList.find(s => s.id === log.user_id)?.role;
      if (!userRole) return;

      const globalItems = allTimeDailyGlobalItems[dateKey] || 0; 
      let gp = 0, bonus = 0, denda = 0, bersih = 0;
      if (userRole === 'GM') { bersih = globalItems * ROYALTI_GM_PER_ITEM; }
      else if (userRole === 'Owner') { bersih = GAJI_POKOK_STAFF + (globalItems * BONUS_PER_ITEM); }
      else if (userRole === 'Training') { bersih = GAJI_POKOK_STAFF; }
      else { 
        gp = GAJI_POKOK_STAFF; bonus = globalItems * BONUS_PER_ITEM; denda = (log.late_minutes || 0) * DENDA_PER_MENIT; 
        bersih = Math.max(0, gp + bonus - denda); 
      }
      allTimePayrollBeban += bersih;
    });

    let allTimeTotalExpNota = 0; 
    let allTimeTotalGajiDibayar = 0;  
    let allTimeDividenDitarik = 0; 

    expenses.forEach(exp => {
      if (exp.category === 'Pembayaran Gaji & Royalti') allTimeTotalGajiDibayar += (exp.amount || 0);
      else if (exp.category === 'Penarikan Dividen Owner') allTimeDividenDitarik += (exp.amount || 0);
      else if (exp.category !== 'Uang Kembalian (Non-Expense)') allTimeTotalExpNota += (exp.amount || 0);
    });
    
    const allTimeNetProfit = allTimeTotalRevenue - allTimeTotalExpNota - allTimePayrollBeban;
    const allTimeHakDividen = allTimeNetProfit * PERSENTASE_DIVIDEN_OWNER;
    const sisaDividenOwner = allTimeHakDividen - allTimeDividenDitarik;
    const kasChogo = allTimeNetProfit - allTimeHakDividen;
    const uangDompet = allTimeTotalRevenue - allTimeTotalExpNota - allTimeTotalGajiDibayar - allTimeDividenDitarik; 
    const uangGrandTotal = uangDompet + MODAL_KASIR_TETAP; 
    let danaDitahan = Math.max(0, allTimePayrollBeban - allTimeTotalGajiDibayar); 

    return {
      payrollData: Object.values(payrollByUser).filter(u => u.records.length > 0),
      financeData: { 
        monthlyTotalRevenue, 
        monthlyTotalExpenses, 
        monthlyPayrollBeban,
        monthlyNetProfit,
        monthlyHakOwner,
        monthlyKasChogo,
        sisaDividenOwner, 
        kasChogo, 
        uangDompet, 
        uangGrandTotal, 
        danaDitahan 
      },
      currentMonthLogs: filteredLogs,
      currentMonthExpenses: filteredExpenses,
      currentMonthActivity: filteredActivity
    };
  }, [logs, expenses, activityLogs, staffList, filterMonth]);

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  const formatTime = (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const currentFinMonth = getFinancialMonth(new Date().toISOString());
  const isPastMonth = filterMonth !== -1 && filterMonth !== currentFinMonth;
  const showExpenseForm = !isPastMonth || unlockPastMonth;

  // --- TAMPILAN LOGIN ---
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[32px] shadow-sm border border-[#EBE5D9] w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-[#3A2A1A] rounded-full mx-auto mb-6 flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#3A2A1A] mb-2">Executive Portal</h1>
          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <input type="password" placeholder="Passcode" className="w-full h-[56px] border border-[#EBE5D9] px-4 rounded-2xl text-center text-lg tracking-[0.5em] text-[#3A2A1A] outline-none focus:border-[#C69C6D] bg-[#FAF8F5]" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
            <button className="w-full h-[56px] bg-[#3A2A1A] text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-[#C69C6D] transition-all">Unlock ERP</button>
          </form>
        </div>
      </div>
    );
  }

  // --- TAMPILAN DASHBOARD UTAMA ---
  return (
    <div className="min-h-screen bg-[#F9F6F0] p-4 md:p-8 text-[#3A2A1A]">
      <div className="max-w-7xl mx-auto">
        
        {/* MODAL EDIT ABSEN DENGAN FITUR EDIT KETERLAMBATAN */}
        {editingLog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-[32px] w-full max-w-sm shadow-xl border border-[#EBE5D9]">
              <h3 className="font-black text-lg mb-1 uppercase tracking-widest text-[#3A2A1A]">Edit Data</h3>
              <p className="text-xs text-[#8C7A6B] font-bold mb-6">Staff: {editingLog.staff_name}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Total Items Sold</label>
                  <input type="number" value={editItems} onChange={e => setEditItems(e.target.value)} className="w-full h-[56px] mt-2 border border-[#EBE5D9] px-4 rounded-2xl bg-[#FAF8F5] font-bold outline-none focus:border-[#C69C6D]"/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Revenue (Rp)</label>
                  <input type="number" value={editRevenue} onChange={e => setEditRevenue(e.target.value)} className="w-full h-[56px] mt-2 border border-[#EBE5D9] px-4 rounded-2xl bg-[#FAF8F5] font-bold outline-none focus:border-[#C69C6D]"/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Keterlambatan (Menit)</label>
                  <input type="number" value={editLateMinutes} onChange={e => setEditLateMinutes(e.target.value)} className="w-full h-[56px] mt-2 border border-[#EBE5D9] px-4 rounded-2xl bg-[#FAF8F5] font-bold outline-none focus:border-[#C69C6D]"/>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setEditingLog(null)} className="flex-1 h-[56px] bg-[#F5F2EE] text-[#8C7A6B] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#EBE5D9]">Batal</button>
                  <button onClick={handleSaveEdit} disabled={loading} className="flex-1 h-[56px] bg-[#3A2A1A] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#C69C6D]">{loading ? '...' : 'Simpan'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-serif font-black tracking-tight">Chōgō Command Center</h1>
            <p className="text-sm text-[#8C7A6B] font-medium mt-1">Sistem Terintegrasi Absensi, Payroll & Keuangan</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} className="appearance-none h-[56px] bg-white border border-[#EBE5D9] px-6 pr-10 rounded-2xl text-xs font-black uppercase tracking-widest outline-none shadow-sm cursor-pointer hover:border-[#C69C6D] text-[#3A2A1A] w-full md:w-auto" style={{ backgroundImage: selectBgIcon, backgroundPosition: 'right 16px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}>
              <option value={-1}>Semua Data</option>
              {MONTHS.map((m, i) => <option key={i} value={i}>Bulan: {m}</option>)}
            </select>
            <button onClick={fetchData} className="h-[56px] bg-[#3A2A1A] text-white px-8 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#C69C6D] transition-all shadow-sm shrink-0">
              {loading ? 'MEMUAT...' : 'SYNC DATA'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['LOGS', 'PAYROLL', 'FINANCE', 'STAFF', 'CUSTOMERS', 'ACTIVITY'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-[#3A2A1A] text-white shadow-md' : 'bg-white text-[#8C7A6B] border border-[#EBE5D9] hover:border-[#C69C6D]'}`}>
              {tab === 'LOGS' ? 'Data Absen' : tab === 'PAYROLL' ? 'Slip Gaji' : tab === 'FINANCE' ? 'Laba & Rugi' : tab === 'STAFF' ? 'Manajemen Staff' : tab === 'CUSTOMERS' ? 'Data Pelanggan' : 'Log Aktivitas'}
            </button>
          ))}
        </div>

        {/* TAB LOGS (ABSENSI) */}
        {activeTab === 'LOGS' && (
          <div className="bg-white rounded-[32px] border border-[#EBE5D9] overflow-hidden shadow-sm p-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EBE5D9]">
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Tanggal (Shift)</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Nama</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">In / Out</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Bukti</th>
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
                        {log.late_minutes > 0 && <span className="block text-[10px] text-red-500 font-bold mt-1">Telat {log.late_minutes}mnt</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          {log.clock_in_photo_url ? (
                            <a href={log.clock_in_photo_url} target="_blank" rel="noopener noreferrer">
                              <img src={log.clock_in_photo_url} alt="Selfie" className="w-10 h-10 rounded-lg object-cover border border-[#EBE5D9] hover:scale-110 transition-transform" />
                            </a>
                          ) : <span className="text-[10px] text-gray-400 font-bold">No Photo</span>}
                        </div>
                      </td>
                      <td className="p-4"><div><p className="text-xs font-bold">{log.items_sold || 0} Item</p><p className="text-[10px] font-black text-[#C69C6D]">{formatRp(log.revenue_generated || 0)}</p></div></td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => {
                            setEditingLog(log);
                            setEditItems(log.items_sold?.toString() || '0');
                            setEditRevenue(log.revenue_generated?.toString() || '0');
                            setEditLateMinutes(log.late_minutes?.toString() || '0');
                          }} className="bg-[#EBE5D9] text-[#3A2A1A] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-[#C69C6D] hover:text-white transition-colors">Edit</button>
                          <button onClick={() => handleDeleteLog(log.id, log.staff_name)} className="bg-[#FDF2F2] text-[#8A2E2E] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB PAYROLL (GAJI) */}
        {activeTab === 'PAYROLL' && (
          <div className="space-y-8">
            {payrollData.map((user, idx) => (
              <div key={idx} className="bg-white rounded-[32px] border border-[#EBE5D9] overflow-hidden shadow-sm p-8">
                <div className="flex justify-between items-end mb-6 border-b border-[#EBE5D9] pb-4">
                  <div><h2 className="text-2xl font-serif font-black uppercase">{user.name}</h2><p className="text-xs font-bold text-[#C69C6D] uppercase">Role: {user.role}</p></div>
                  <div className="text-right"><p className="text-[10px] font-black text-[#8C7A6B] uppercase mb-1">Total Gaji {filterMonth === -1 ? 'Semua' : MONTHS[filterMonth]}</p><h3 className="text-2xl font-black text-[#2D5A2D]">{formatRp(user.totalGaji)}</h3></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#FAF8F5]">
                      <tr className="text-[10px] font-black text-[#8C7A6B] uppercase">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3 text-center">Item {user.role === 'Training' ? '' : '(Global)'}</th>
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
                          {user.role !== 'GM' && <td className="p-3 text-right">{formatRp(rec.gp)}</td>}
                          <td className="p-3 font-bold text-[#2D5A2D] text-right">+{formatRp(rec.bonus)}</td>
                          {user.role !== 'GM' && <td className="p-3 font-bold text-[#8A2E2E] text-right">-{formatRp(rec.denda)}</td>}
                          <td className="p-3 font-black text-right">{formatRp(rec.bersih)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB FINANCE (KEUANGAN LENGKAP) */}
        {activeTab === 'FINANCE' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* KOTAK EVALUASI BULANAN */}
              {filterMonth !== -1 && (
                <div className="bg-white rounded-[24px] p-6 border border-[#EBE5D9] shadow-sm animate-fade-in-down">
                  <h3 className="font-black uppercase text-sm mb-4 text-[#3A2A1A] tracking-widest flex items-center gap-2">
                    Kilas Balik Evaluasi: Bulan {MONTHS[filterMonth]}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EBE5D9]">
                      <p className="text-[10px] font-black text-[#8C7A6B] uppercase mb-1">Total Gaji & Royalti</p>
                      <h4 className="text-lg font-black text-[#8A2E2E]">{formatRp(financeData.monthlyPayrollBeban)}</h4>
                    </div>
                    <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EBE5D9]">
                      <p className="text-[10px] font-black text-[#8C7A6B] uppercase mb-1">Laba Bersih Total</p>
                      <h4 className="text-lg font-black text-[#3A2A1A]">{formatRp(financeData.monthlyNetProfit)}</h4>
                    </div>
                    <div className="bg-[#E8F5E9] p-4 rounded-xl border border-[#C8E6C9]">
                      <p className="text-[10px] font-black text-[#2D5A2D] uppercase mb-1">Kas Chogo (50%)</p>
                      <h4 className="text-lg font-black text-[#2D5A2D]">{formatRp(financeData.monthlyKasChogo)}</h4>
                    </div>
                    <div className="bg-[#FFFDEB] p-4 rounded-xl border border-[#FFF59D]">
                      <p className="text-[10px] font-black text-[#F57F17] uppercase mb-1">Hak Owner (50%)</p>
                      <h4 className="text-lg font-black text-[#F57F17]">{formatRp(financeData.monthlyHakOwner)}</h4>
                    </div>
                  </div>
                </div>
              )}

              {/* KOTAK HIJAU UTAMA (DOMPET OWNER) ALL-TIME KUMULATIF */}
              <div className="bg-[#2D5A2D] rounded-[24px] p-8 text-white relative overflow-hidden shadow-md border border-[#1F401F]">
                <div className="relative z-10">
                  <p className="text-xs font-black text-[#A3C8A3] uppercase mb-1">Total Uang di Tangan (Dompet Owner)</p>
                  <h2 className="text-4xl md:text-5xl font-black mb-6">{formatRp(financeData.uangDompet)}</h2>
                  <div className="bg-[#1F401F] rounded-xl p-5 border border-[#3A703A]">
                    <p className="text-[10px] font-bold text-[#A3C8A3] uppercase mb-4 tracking-widest">Rincian Uang di Dompet (Akumulasi All-Time):</p>
                    <div className="space-y-3 text-sm font-medium">
                      <div className="flex justify-between border-b border-[#3A703A] pb-2">
                        <span>Laba Bersih Chogo (Sisa Kas)</span>
                        <span className="font-bold">{formatRp(financeData.kasChogo)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3A703A] pb-2">
                        <span>Dividen Owner (Belum Ditarik)</span>
                        <span className="font-bold">{formatRp(financeData.sisaDividenOwner)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3A703A] pb-2 text-[#F1C40F]">
                        <span>Dana Ditahan (Gaji & Royalti)</span>
                        <span className="font-bold">{formatRp(financeData.danaDitahan)}</span>
                      </div>
                      <div className="flex justify-between pt-2 mt-2 border-t border-[#3A703A] border-dashed text-[#3AE374]">
                        <span>+ Modal Kasir (Aman di Laci)</span>
                        <span className="font-bold">{formatRp(MODAL_KASIR_TETAP)}</span>
                      </div>
                      <div className="flex justify-between pt-4 mt-2 border-t-2 border-[#A3C8A3] text-xl text-white">
                        <span>TOTAL KESELURUHAN (Dompet + Laci)</span>
                        <span className="font-black">{formatRp(financeData.uangGrandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* STATISTIK KOTOR BULANAN */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] col-span-2">
                  <p className="text-[10px] font-black text-[#8C7A6B] uppercase mb-2">Total Pendapatan Kotor</p>
                  <h3 className="text-3xl font-black text-[#3A2A1A]">{formatRp(financeData.monthlyTotalRevenue)}</h3>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] col-span-2">
                  <p className="text-[10px] font-black text-[#8C7A6B] uppercase mb-2">Total Pengeluaran Nota</p>
                  <h3 className="text-3xl font-black text-[#8A2E2E]">{formatRp(financeData.monthlyTotalExpenses)}</h3>
                </div>
              </div>

              {/* TABEL RINCIAN PENGELUARAN BULANAN */}
              <div className="bg-white rounded-[24px] border border-[#EBE5D9] p-6 shadow-sm">
                <h3 className="font-black uppercase text-sm mb-6">Rincian Pengeluaran Bulan {filterMonth === -1 ? 'Semua' : MONTHS[filterMonth]}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EBE5D9] text-[10px] font-black text-[#8C7A6B] uppercase">
                        <th className="pb-3 px-2">Tanggal</th>
                        <th className="pb-3 px-2">Kategori</th>
                        <th className="pb-3 px-2">Deskripsi</th>
                        <th className="pb-3 px-2 text-right">Total Nominal</th>
                        <th className="pb-3 px-2 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EBE1]">
                      {currentMonthExpenses.length > 0 ? (
                        currentMonthExpenses.map(exp => (
                          <tr key={exp.id} className="text-xs hover:bg-[#FAF8F5] transition-colors">
                            <td className="py-4 px-2 font-bold">{formatDate(exp.created_at)}</td>
                            <td className="py-4 px-2 text-[10px] font-black uppercase text-[#C69C6D]">{exp.category}</td>
                            <td className="py-4 px-2 font-medium">{exp.description}</td>
                            <td className={`py-4 px-2 text-right font-black ${exp.category === 'Uang Kembalian (Non-Expense)' ? 'text-[#2D5A2D]' : 'text-[#8A2E2E]'}`}>{formatRp(exp.amount)}</td>
                            <td className="py-4 px-2 text-center">
                              <button onClick={() => handleDeleteExpense(exp.id, exp.description)} className="text-red-400 hover:text-red-600 font-black uppercase text-[10px]">Hapus</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-xs font-bold">Belum ada pengeluaran di filter bulan ini.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* FORM INPUT PENGELUARAN DENGAN FITUR TUTUP BUKU & TANGGAL */}
            <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] h-max sticky top-8 shadow-sm">
              <h3 className="font-black uppercase text-sm mb-6">Input Nota Keluar</h3>
              
              {showExpenseForm ? (
                <form onSubmit={handleAddExpense} className="space-y-4 animate-fade-in-down">
                  <div>
                    <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Tanggal Nota</label>
                    <input 
                      type="date" 
                      value={expDate} 
                      onChange={(e) => setExpDate(e.target.value)} 
                      className="w-full h-[56px] mt-2 border border-[#EBE5D9] px-4 rounded-2xl text-sm font-bold text-[#3A2A1A] bg-[#FAF8F5] outline-none focus:border-[#C69C6D]" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Kategori</label>
                    <select 
                      value={expCategory} 
                      onChange={(e) => setExpCategory(e.target.value)} 
                      className="appearance-none w-full h-[56px] mt-2 border border-[#EBE5D9] px-4 pr-10 rounded-2xl text-sm font-bold text-[#3A2A1A] bg-[#FAF8F5] outline-none focus:border-[#C69C6D] cursor-pointer"
                      style={{ backgroundImage: selectBgIcon, backgroundPosition: 'right 16px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
                    >
                      <option value="Bahan Baku">Bahan Baku</option>
                      <option value="Operasional">Operasional</option>
                      <option value="Pembayaran Gaji & Royalti">Pembayaran Gaji & Royalti</option>
                      <option value="Penarikan Dividen Owner">Penarikan Dividen Owner</option>
                      <option value="Uang Kembalian (Non-Expense)">Uang Kembalian (Modal Kasir)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Deskripsi</label>
                    <input type="text" placeholder="Cth: Belanja Susu / Tarik Laba" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className="w-full h-[56px] mt-2 border border-[#EBE5D9] px-4 rounded-2xl text-sm font-bold text-[#3A2A1A] bg-[#FAF8F5] outline-none focus:border-[#C69C6D]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Total (Rp)</label>
                    <input type="number" placeholder="0" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="w-full h-[56px] mt-2 border border-[#EBE5D9] px-4 rounded-2xl text-sm font-bold text-[#3A2A1A] bg-[#FAF8F5] outline-none focus:border-[#C69C6D]" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full h-[56px] bg-[#C69C6D] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#B58B5C] transition-colors mt-2">
                    Simpan Nota
                  </button>
                </form>
              ) : (
                <div className="text-center p-6 bg-[#FAF8F5] rounded-2xl border border-[#EBE5D9] animate-fade-in-down">
                  <div className="flex justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#8C7A6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h4 className="font-black text-[#3A2A1A] mb-1 uppercase tracking-widest text-xs">Tutup Buku</h4>
                  <p className="text-[10px] font-bold text-[#8C7A6B] mb-6">Penambahan nota untuk bulan {MONTHS[filterMonth]} sudah dikunci oleh sistem.</p>
                  <button onClick={() => setUnlockPastMonth(true)} className="w-full h-[48px] bg-[#EBE5D9] text-[#3A2A1A] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#C69C6D] hover:text-white transition-colors">
                    Buka Kunci (Revisi)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB MANAJEMEN STAFF */}
        {activeTab === 'STAFF' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[32px] border border-[#EBE5D9] overflow-hidden shadow-sm p-6">
              <h3 className="font-black uppercase text-sm mb-6">Daftar Karyawan Chōgō</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EBE5D9]">
                      <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Nama Lengkap</th>
                      <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Jabatan (Role)</th>
                      <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest text-center">Status</th>
                      <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EBE1]">
                    {staffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-[#FCF9F4] transition-colors">
                        <td className="p-4 text-sm font-black text-[#3A2A1A]">{staff.name}</td>
                        <td className="p-4 text-xs font-bold text-[#C69C6D] uppercase">{staff.role}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${staff.status === 'Active' ? 'bg-[#E8F5E9] text-[#2D5A2D]' : 'bg-[#FDF2F2] text-[#8A2E2E]'}`}>
                            {staff.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => { setEditingStaffId(staff.id); setNewStaffName(staff.name); setNewStaffRole(staff.role); }} className="bg-[#EBE5D9] text-[#3A2A1A] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-[#C69C6D] hover:text-white transition-colors">Edit</button>
                            <button onClick={() => handleToggleStaffStatus(staff.id, staff.status, staff.name)} className="bg-[#F5F2EE] text-[#8C7A6B] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-[#3A2A1A] hover:text-white transition-colors">
                              {staff.status === 'Active' ? 'Resign' : 'Aktifkan'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] h-max sticky top-8 shadow-sm">
              <h3 className="font-black uppercase text-sm mb-6">{editingStaffId ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}</h3>
              <form onSubmit={handleSaveStaff} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Nama Lengkap</label>
                  <input type="text" placeholder="Masukkan nama" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="w-full h-[56px] mt-1 border border-[#EBE5D9] px-4 rounded-2xl text-sm font-bold bg-[#FAF8F5] outline-none focus:border-[#C69C6D]" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Jabatan (Role)</label>
                  <select 
                    value={newStaffRole} 
                    onChange={(e) => setNewStaffRole(e.target.value)} 
                    className="appearance-none w-full h-[56px] mt-1 border border-[#EBE5D9] px-4 pr-10 rounded-2xl text-sm font-bold bg-[#FAF8F5] outline-none cursor-pointer focus:border-[#C69C6D]"
                    style={{ backgroundImage: selectBgIcon, backgroundPosition: 'right 16px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
                  >
                    <option value="Staff">Staff</option>
                    <option value="Training">Training</option>
                    <option value="GM">GM</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  {editingStaffId && (
                    <button type="button" onClick={() => { setEditingStaffId(null); setNewStaffName(''); setNewStaffRole('Staff'); }} className="flex-1 h-[56px] bg-[#F5F2EE] text-[#8C7A6B] rounded-2xl font-black uppercase text-[10px] hover:bg-[#EBE5D9]">Batal</button>
                  )}
                  <button type="submit" disabled={loading} className="flex-1 h-[56px] bg-[#3A2A1A] text-white rounded-2xl font-black uppercase text-[10px] hover:bg-[#C69C6D]">
                    {loading ? '...' : editingStaffId ? 'Simpan Perubahan' : 'Tambah Karyawan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB CUSTOMERS (LOYALTY CARD) */}
        {activeTab === 'CUSTOMERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[32px] border border-[#EBE5D9] p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="font-black uppercase text-sm">Database Pelanggan & Loyalty</h3>
                <input 
                  type="text" 
                  placeholder="Cari nama / no. WA..." 
                  value={searchCustomer} 
                  onChange={(e) => { setSearchCustomer(e.target.value); setCurrentCustomerPage(1); }}
                  className="w-full md:w-64 h-[48px] border border-[#EBE5D9] px-4 rounded-2xl text-xs font-bold bg-[#FAF8F5] outline-none focus:border-[#C69C6D]"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EBE5D9]">
                      <th className="p-4 font-black">Nama Pelanggan</th>
                      <th className="p-4 font-black">Nomor WhatsApp</th>
                      <th className="p-4 font-black text-center">Jumlah Stamp</th>
                      <th className="p-4 font-black text-center">Kelola Stamp</th>
                      <th className="p-4 font-black text-center">Follow Up / Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EBE1]">
                    {paginatedCustomers.length > 0 ? (
                      paginatedCustomers.map((cust) => {
                        const isPriority = cust.stamps >= 8;
                        return (
                          <tr key={cust.id} className={`transition-colors ${isPriority ? 'bg-[#FFFDEB] hover:bg-[#FFF9C4]' : 'hover:bg-[#FCF9F4]'}`}>
                            <td className="p-4 font-black">
                              <div className="flex items-center gap-2">
                                {cust.name}
                                {isPriority && (
                                  <span className="bg-[#F57F17] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {cust.stamps >= 10 ? 'Full' : 'Prioritas'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 font-bold text-[#8C7A6B]">{cust.phone}</td>
                            <td className="p-4 text-center">
                              <span className={`border px-3 py-1.5 rounded-xl font-black text-sm ${isPriority ? 'bg-white border-[#F57F17] text-[#F57F17]' : 'bg-[#FAF8F5] border-[#EBE5D9] text-[#C69C6D]'}`}>
                                {cust.stamps} / 10
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-1">
                                <button onClick={() => handleUpdateStamps(cust.id, cust.stamps, 1, cust.name)} className="bg-[#E8F5E9] text-[#2D5A2D] px-2.5 py-1 rounded-lg font-black text-sm hover:bg-[#C8E6C9]">+</button>
                                <button onClick={() => handleUpdateStamps(cust.id, cust.stamps, -1, cust.name)} className="bg-[#F5F2EE] text-[#8C7A6B] px-2.5 py-1 rounded-lg font-black text-sm hover:bg-[#EBE5D9]">-</button>
                                {cust.stamps >= 10 && (
                                  <button onClick={() => handleClaimReward(cust.id, cust.stamps, cust.name)} className="bg-[#3A2A1A] text-white px-3 py-1 rounded-lg font-black text-[10px] uppercase ml-1 tracking-wider shadow-sm">Klaim</button>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center items-center gap-2">
                                {isPriority && (
                                  <a 
                                    href={getWhatsAppLink(cust.phone, cust.name, cust.stamps)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-[#25D366] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#128C7E] shadow-sm flex items-center gap-1"
                                  >
                                    WhatsApp
                                  </a>
                                )}
                                <button onClick={() => { setEditingCustId(cust.id); setCustName(cust.name); setCustPhone(cust.phone); setCustStamps(cust.stamps.toString()); }} className="bg-[#EBE5D9] text-[#3A2A1A] px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase">Edit</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 font-bold text-xs">Pelanggan tidak ditemukan.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalCustomerPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#EBE5D9]">
                  <button onClick={() => setCurrentCustomerPage(p => Math.max(1, p - 1))} disabled={currentCustomerPage === 1} className="h-[40px] px-4 bg-[#F5F2EE] text-[#8C7A6B] font-bold text-[10px] uppercase rounded-xl disabled:opacity-50">Sebelumnya</button>
                  <span className="text-[10px] font-black text-[#3A2A1A] uppercase tracking-widest">Halaman {currentCustomerPage} dari {totalCustomerPages}</span>
                  <button onClick={() => setCurrentCustomerPage(p => Math.min(totalCustomerPages, p + 1))} disabled={currentCustomerPage === totalCustomerPages} className="h-[40px] px-4 bg-[#F5F2EE] text-[#8C7A6B] font-bold text-[10px] uppercase rounded-xl disabled:opacity-50">Selanjutnya</button>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] h-max sticky top-8 shadow-sm">
              <h3 className="font-black uppercase text-sm mb-6">{editingCustId ? 'Edit Data Pelanggan' : 'Registrasi Pelanggan'}</h3>
              <form onSubmit={handleSaveCustomer} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Nama Pelanggan</label>
                  <input type="text" placeholder="Masukkan nama" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full h-[56px] mt-1 border border-[#EBE5D9] px-4 rounded-2xl text-sm font-bold bg-[#FAF8F5] outline-none focus:border-[#C69C6D]" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#8C7A6B] uppercase">No WhatsApp</label>
                  <input type="text" placeholder="Cth: 0812..." value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full h-[56px] mt-1 border border-[#EBE5D9] px-4 rounded-2xl text-sm font-bold bg-[#FAF8F5] outline-none focus:border-[#C69C6D]" />
                </div>
                {editingCustId && (
                  <div>
                    <label className="text-[10px] font-black text-[#8C7A6B] uppercase">Jumlah Stamp</label>
                    <input type="number" placeholder="Jumlah Stamp" value={custStamps} onChange={(e) => setCustStamps(e.target.value)} className="w-full h-[56px] mt-1 border border-[#EBE5D9] px-4 rounded-2xl text-sm font-bold bg-[#FAF8F5] outline-none focus:border-[#C69C6D]" />
                  </div>
                )}
                <div className="pt-2">
                  <button type="submit" disabled={loading} className="w-full h-[56px] bg-[#3A2A1A] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#C69C6D] transition-colors">
                    {editingCustId ? 'Simpan Perubahan' : 'Daftarkan Pelanggan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB LOG ACTIVITY (AUDIT TRAIL) */}
        {activeTab === 'ACTIVITY' && (
          <div className="bg-white rounded-[32px] border border-[#EBE5D9] overflow-hidden shadow-sm p-6">
            <h3 className="font-black uppercase text-sm mb-6 tracking-widest">Riwayat Aktivitas Admin & Kasir</h3>
            {currentMonthActivity.length === 0 ? (
              <p className="text-center text-xs font-bold text-gray-400 py-10">Belum ada aktivitas admin bulan ini.</p>
            ) : (
              <ul className="space-y-4">
                {currentMonthActivity.map(act => (
                  <li key={act.id} className="flex gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE5D9] text-xs">
                    <div className="font-bold text-[#8C7A6B] shrink-0 w-24">
                      {formatDate(act.created_at)}<br/>
                      <span className="text-[10px] opacity-60">{formatTime(act.created_at)}</span>
                    </div>
                    <div className="font-medium text-[#3A2A1A]">{act.action}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
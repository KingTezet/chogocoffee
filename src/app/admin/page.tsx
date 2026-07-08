'use client';
import Link from 'next/link';
import ExportAnalyticsButton from '@/components/ExportAnalyticsButton';
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
  let m = d.getMonth();
  if (d.getDate() >= 28) { 
    m = m === 11 ? 0 : m + 1; 
  }
  return m;
};

const selectBgIcon = `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238C7A6B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`;

export default function AdminDashboard() {
  // --- STATES ---
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LOGS' | 'PAYROLL' | 'FINANCE' | 'STAFF' | 'CUSTOMERS' | 'ACTIVITY'>('DASHBOARD');
  
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
      ? `Halo Kak ${name}, ada kabar baik dari Chogo Coffee. Kartu loyalitas digital Kakak saat ini sudah penuh dan mencapai 10 stamp.\n\nKakak sudah berhak menukarkannya dengan 1 item kopi gratis langsung di outlet Chogo Coffee. Saat berkunjung nanti, Kakak cukup tunjukkan nomor WhatsApp yang terdaftar ini kepada kasir kami yang bertugas.\n\nSelamat menikmati kopi gratisnya dan sampai jumpa di outlet Chogo Coffee, Kak.` 
      : `Halo Kak ${name}, kami dari Chogo Coffee ingin menginfokan bahwa kartu loyalitas digital Kakak sudah mencapai ${stamps} stamp nih.\n\nSedikit lagi kartu stamp Kakak akan penuh untuk diklaim dengan 1 jatah kopi gratis di outlet kami.\n\nKami tunggu kedatangan Kakak kembali di outlet Chogo Coffee ya. Kakak juga bisa mengecek jumlah stamp kartu loyalitas Kakak kapan saja secara mandiri melalui tautan chogocoffee.com/loyalty. Terima kasih dan sampai jumpa, Kak.`;
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

  // --- LOGIKA PERHITUNGAN KEUANGAN & DASHBOARD ---
  const { 
    payrollData, 
    financeData, 
    currentMonthLogs, 
    currentMonthExpenses, 
    currentMonthActivity,
    dashboardStats
  } = useMemo(() => {
    const filteredLogs = logs.filter(log => filterMonth === -1 || getFinancialMonth(log.created_at) === filterMonth);
    const filteredExpenses = expenses.filter(exp => filterMonth === -1 || getFinancialMonth(exp.created_at) === filterMonth);
    const filteredActivity = activityLogs.filter(act => filterMonth === -1 || getFinancialMonth(act.created_at) === filterMonth);

    // KUMPULKAN TOTAL GLOBAL HARIAN (SINKRON UNTUK PAYROLL DAN LEADERBOARD)
    const dailyGlobalItems: Record<string, number> = {};
    const dailyGlobalRevenue: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const dateKey = getLocalDateString(log.created_at);
      if (!dailyGlobalItems[dateKey]) {
        dailyGlobalItems[dateKey] = 0;
        dailyGlobalRevenue[dateKey] = 0;
      }
      if (log.user_id !== SUPER_ADMIN_ID) {
        dailyGlobalItems[dateKey] += (Number(log.items_sold) || 0);
        dailyGlobalRevenue[dateKey] += (Number(log.revenue_generated) || 0);
      }
    });

    const payrollByUser: Record<string, { name: string, role: string, records: any[], totalGaji: number }> = {};
    staffList.forEach(staff => { payrollByUser[staff.id] = { name: staff.name, role: staff.role, records: [], totalGaji: 0 }; });

    let monthlyTotalRevenue = 0;
    let monthlyPayrollBeban = 0;
    
    filteredLogs.forEach(log => {
      monthlyTotalRevenue += (Number(log.revenue_generated) || 0);
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
        // PERBAIKAN: Menampilkan item global untuk role Training agar angkanya sama dengan staff lain di hari yang sama
        userPayroll.records.push({ date: dateKey, items: globalItemsHariIni, gp, bonus: 0, denda: 0, bersih: totalBersih });
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
        monthlyTotalExpenses += (Number(exp.amount) || 0);
      }
    });

    const monthlyNetProfit = monthlyTotalRevenue - monthlyTotalExpenses - monthlyPayrollBeban;
    const monthlyHakOwner = monthlyNetProfit * PERSENTASE_DIVIDEN_OWNER;
    const monthlyKasChogo = monthlyNetProfit - monthlyHakOwner;

    // Untuk ALL TIME Profit 
    const allTimeDailyGlobalItems: Record<string, number> = {};
    logs.forEach(log => {
      const dateKey = getLocalDateString(log.created_at);
      if (!allTimeDailyGlobalItems[dateKey]) allTimeDailyGlobalItems[dateKey] = 0;
      if (log.user_id !== SUPER_ADMIN_ID) allTimeDailyGlobalItems[dateKey] += (Number(log.items_sold) || 0);
    });

    let allTimeTotalRevenue = 0;
    let allTimePayrollBeban = 0;
    
    logs.forEach(log => {
      allTimeTotalRevenue += (Number(log.revenue_generated) || 0);
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
      if (exp.category === 'Pembayaran Gaji & Royalti') allTimeTotalGajiDibayar += (Number(exp.amount) || 0);
      else if (exp.category === 'Penarikan Dividen Owner') allTimeDividenDitarik += (Number(exp.amount) || 0);
      else if (exp.category !== 'Uang Kembalian (Non-Expense)') allTimeTotalExpNota += (Number(exp.amount) || 0);
    });
    
    const allTimeNetProfit = allTimeTotalRevenue - allTimeTotalExpNota - allTimePayrollBeban;
    const allTimeHakDividen = allTimeNetProfit * PERSENTASE_DIVIDEN_OWNER;
    const sisaDividenOwner = allTimeHakDividen - allTimeDividenDitarik;
    const kasChogo = allTimeNetProfit - allTimeHakDividen;
    const uangDompet = allTimeTotalRevenue - allTimeTotalExpNota - allTimeTotalGajiDibayar - allTimeDividenDitarik; 
    const uangGrandTotal = uangDompet + MODAL_KASIR_TETAP; 
    let danaDitahan = Math.max(0, allTimePayrollBeban - allTimeTotalGajiDibayar); 

    // --- KALKULASI KHUSUS DASHBOARD ---
    const todayStr = getLocalDateString(new Date().toISOString());
    const todayLogs = logs.filter(log => getLocalDateString(log.created_at) === todayStr);
    
    const todayRevenue = todayLogs.reduce((acc, log) => acc + (Number(log.revenue_generated) || 0), 0);
    const todayItems = todayLogs.reduce((acc, log) => acc + (Number(log.items_sold) || 0), 0);
    const todayStaffCount = todayLogs.length;

    // SINKRONISASI LEADERBOARD KARYAWAN DENGAN LOGIKA GLOBAL HARIAN
    const staffPerformanceMap: Record<string, { daysSet: Set<string> }> = {};
    filteredLogs.forEach(log => {
      if (log.user_id === SUPER_ADMIN_ID) return; 

      const rawName = log.staff_name || 'Unknown';
      const cleanName = rawName.replace(/\s*\([^)]*\)/g, '').trim();

      if (!staffPerformanceMap[cleanName]) {
        staffPerformanceMap[cleanName] = { daysSet: new Set() };
      }
      staffPerformanceMap[cleanName].daysSet.add(getLocalDateString(log.created_at));
    });

    const staffLeaderboard = Object.entries(staffPerformanceMap)
      .map(([name, stats]) => {
        let totalRev = 0;
        let totalItm = 0;
        stats.daysSet.forEach(dateKey => {
          totalRev += dailyGlobalRevenue[dateKey] || 0;
          totalItm += dailyGlobalItems[dateKey] || 0;
        });
        return { name, revenue: totalRev, items: totalItm, daysWorked: stats.daysSet.size };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); 

    const totalActiveCustomers = customerList.length;
    
    const gmLatestLog = logs.find(log => log.user_id === SUPER_ADMIN_ID);

    return {
      payrollData: Object.values(payrollByUser).filter(u => u.records.length > 0),
      financeData: { 
        monthlyTotalRevenue, monthlyTotalExpenses, monthlyPayrollBeban,
        monthlyNetProfit, monthlyHakOwner, monthlyKasChogo,
        sisaDividenOwner, kasChogo, uangDompet, uangGrandTotal, danaDitahan 
      },
      currentMonthLogs: filteredLogs,
      currentMonthExpenses: filteredExpenses,
      currentMonthActivity: filteredActivity,
      dashboardStats: {
        todayRevenue, todayItems, todayStaffCount,
        staffLeaderboard, totalActiveCustomers, gmLatestLog
      }
    };
  }, [logs, expenses, activityLogs, staffList, filterMonth, customerList]);

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

        {/* ── EXECUTIVE NAVBAR ─────────────────────────────────────────────
             Layout (left → right):
               [Title + subtitle]   [Analytics link] [Export CSV] [Month select] [Sync]
        ──────────────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-4">
          {/* Brand */}
          <div className="shrink-0">
            <h1 className="text-4xl font-serif font-black tracking-tight">Chōgō Command Center</h1>
            <p className="text-sm text-[#8C7A6B] font-medium mt-1">Sistem Terintegrasi Absensi, Payroll & Keuangan</p>
          </div>

          {/* Controls — scroll horizontally on small screens */}
          <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 flex-nowrap">

            {/* 1. Link → Analytics Dashboard */}
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-2 h-[48px] px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-[#3A2A1A] to-[#2A1E12] text-[#C69C6D] border border-[#C69C6D]/30 hover:border-[#C69C6D] hover:text-white transition-all shadow-sm whitespace-nowrap shrink-0"
            >
              <svg className="h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </Link>

            {/* 2. Export CSV — receives live filterMonth so button label + query
                 always reflect the active dropdown selection.
                 year=2026 hardcoded here; change as needed. */}
            <div className="shrink-0">
              <ExportAnalyticsButton month={filterMonth} year={2026} />
            </div>

            {/* 3. Month selector (existing) */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              className="appearance-none h-[48px] bg-white border border-[#EBE5D9] px-4 pr-9 rounded-2xl text-xs font-black uppercase tracking-widest outline-none shadow-sm cursor-pointer hover:border-[#C69C6D] text-[#3A2A1A] shrink-0"
              style={{ backgroundImage: selectBgIcon, backgroundPosition: 'right 12px center', backgroundSize: '14px', backgroundRepeat: 'no-repeat' }}
            >
              <option value={-1}>Semua Data</option>
              {MONTHS.map((m, i) => <option key={i} value={i}>Bulan: {m}</option>)}
            </select>

            {/* 4. Sync button (existing) */}
            <button
              onClick={fetchData}
              className="h-[48px] bg-[#3A2A1A] text-white px-6 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#C69C6D] transition-all shadow-sm shrink-0 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'MEMUAT...' : 'SYNC'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {['DASHBOARD', 'LOGS', 'PAYROLL', 'FINANCE', 'STAFF', 'CUSTOMERS', 'ACTIVITY'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-[#3A2A1A] text-white shadow-md' : 'bg-white text-[#8C7A6B] border border-[#EBE5D9] hover:border-[#C69C6D]'}`}>
              {tab === 'DASHBOARD' ? 'Overview' : tab === 'LOGS' ? 'Data Absen' : tab === 'PAYROLL' ? 'Slip Gaji' : tab === 'FINANCE' ? 'Laba & Rugi' : tab === 'STAFF' ? 'Manajemen Staff' : tab === 'CUSTOMERS' ? 'Data Pelanggan' : 'Log Aktivitas'}
            </button>
          ))}
        </div>

        {/* =========================================
            TAB DASHBOARD (EXECUTIVE OVERVIEW)
        ========================================= */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-8 animate-fade-in-down">
            
            {/* 1. EXECUTIVE WELCOME & VIP GM CARD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* KIRI: WELCOME ADMIN & SYSTEM HEALTH */}
              <div className="bg-white p-8 rounded-[32px] border border-[#EBE5D9] shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-3xl font-serif font-black mb-2 text-[#3A2A1A]">Halo, Admin Chōgō!</h2>
                  <p className="text-sm font-medium text-[#8C7A6B] leading-relaxed mb-6">
                    Akses kontrol penuh ke dalam sistem ERP. Pantau seluruh alur operasional, kelola manajemen staf, dan verifikasi lalu lintas keuangan dengan aman.
                  </p>
                </div>
                
                <div className="relative z-10 bg-[#FAF8F5] rounded-2xl p-4 border border-[#EBE5D9] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-black text-[#3A2A1A] uppercase tracking-widest">System Connected</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveTab('LOGS')} className="px-4 py-2 bg-[#3A2A1A] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#C69C6D] transition-colors">Absen</button>
                    <button onClick={() => setActiveTab('FINANCE')} className="px-4 py-2 bg-[#EBE5D9] text-[#3A2A1A] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#C69C6D] hover:text-white transition-colors">Finance</button>
                  </div>
                </div>
              </div>

              {/* KANAN: VIP GM STATUS CARD */}
              <div className="bg-gradient-to-br from-[#2A1E12] to-[#110C07] p-8 rounded-[32px] border border-[#C69C6D]/40 shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
                <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-48 w-48 text-[#C69C6D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="relative z-10 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[#C69C6D] text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                      Live Monitoring
                    </span>
                    <span className="bg-[#C69C6D]/20 text-[#C69C6D] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-[#C69C6D]/30">
                      Executive
                    </span>
                  </div>
                  <h2 className="text-2xl font-serif font-black text-[#EBE5D9] mb-1">General Manager</h2>
                  <p className="text-[10px] text-[#8C7A6B] font-medium tracking-widest uppercase mb-2">Strategic Oversight & Planning</p>
                </div>
                <div className="relative z-10 w-full bg-black/40 p-4 rounded-2xl border border-[#C69C6D]/20 backdrop-blur-sm shadow-inner">
                   <p className="text-[10px] text-[#8C7A6B] uppercase tracking-widest mb-1 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      Current Focus / Task:
                   </p>
                   <p className="text-sm font-bold text-[#C69C6D] leading-relaxed line-clamp-2">
                     {dashboardStats.gmLatestLog ? dashboardStats.gmLatestLog.notes : 'Standby / Reviewing business metrics...'}
                   </p>
                </div>
              </div>
            </div>

            {/* 2. REAL-TIME TODAY'S STATS */}
            <div>
              <h3 className="font-black uppercase text-sm mb-4 tracking-widest text-[#3A2A1A] border-l-4 border-[#C69C6D] pl-3">
                Live Operasional Hari Ini
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Pendapatan Hari Ini</p>
                    <div className="p-2 bg-[#F5F2EE] rounded-lg text-[#C69C6D]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-[#2D5A2D]">{formatRp(dashboardStats.todayRevenue)}</h3>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Item Terjual Hari Ini</p>
                    <div className="p-2 bg-[#F5F2EE] rounded-lg text-[#C69C6D]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-[#3A2A1A]">{dashboardStats.todayItems} <span className="text-lg text-[#8C7A6B]">Cups</span></h3>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Karyawan Masuk Hari Ini</p>
                    <div className="p-2 bg-[#F5F2EE] rounded-lg text-[#C69C6D]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-[#3A2A1A]">{dashboardStats.todayStaffCount} <span className="text-lg text-[#8C7A6B]">Orang</span></h3>
                </div>
              </div>
            </div>

            {/* 3. FINANCIAL OVERVIEW & LEADERBOARD (PRIORITAS 3 - EVALUASI BULAN INI) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* KIRI: Financial Snapshot & Dompet Card */}
              <div className="space-y-6">
                {/* Financial Snapshot */}
                <div className="bg-white rounded-[32px] border border-[#EBE5D9] p-8 shadow-sm">
                  <h3 className="font-black uppercase text-sm mb-6 tracking-widest text-[#3A2A1A] flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#C69C6D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Performa Finansial {filterMonth === -1 ? 'All-Time' : MONTHS[filterMonth]}
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-[#8C7A6B] uppercase tracking-widest">Pendapatan Kotor</span>
                        <span className="text-[#3A2A1A]">{formatRp(financeData.monthlyTotalRevenue)}</span>
                      </div>
                      <div className="w-full bg-[#F5F2EE] rounded-full h-3">
                        <div className="bg-[#C69C6D] h-3 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-[#8C7A6B] uppercase tracking-widest">Total Pengeluaran (Nota + Gaji)</span>
                        <span className="text-[#8A2E2E]">-{formatRp(financeData.monthlyTotalExpenses + financeData.monthlyPayrollBeban)}</span>
                      </div>
                      <div className="w-full bg-[#F5F2EE] rounded-full h-3">
                        <div className="bg-[#8A2E2E] h-3 rounded-full" style={{ width: `${Math.min(((financeData.monthlyTotalExpenses + financeData.monthlyPayrollBeban) / (financeData.monthlyTotalRevenue || 1)) * 100, 100)}%` }}></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#F5F2EE]">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest mb-1">Laba Bersih Estimasi</p>
                          <h3 className="text-3xl font-black text-[#2D5A2D]">{formatRp(financeData.monthlyNetProfit)}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest mb-1">Status</p>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${financeData.monthlyNetProfit >= 0 ? 'bg-[#E8F5E9] text-[#2D5A2D]' : 'bg-[#FDF2F2] text-[#8A2E2E]'}`}>
                            {financeData.monthlyNetProfit >= 0 ? 'PROFIT' : 'LOSS'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dompet Owner Mini Card (Pengisi Ruang Kosong) */}
                <div className="bg-gradient-to-br from-[#2D5A2D] to-[#152e15] rounded-[32px] p-6 shadow-sm text-white relative overflow-hidden border border-[#3A703A]">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-[#A3C8A3] uppercase tracking-widest mb-1">Total Uang di Dompet Owner</p>
                    <h2 className="text-3xl font-black mb-4">{formatRp(financeData.uangDompet)}</h2>
                    
                    <div className="space-y-2 text-xs font-medium">
                      <div className="flex justify-between border-b border-[#3A703A] pb-1.5">
                        <span className="text-[#A3C8A3]">Kas Chogo (Sisa)</span>
                        <span className="font-bold">{formatRp(financeData.kasChogo)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3A703A] pb-1.5">
                        <span className="text-[#A3C8A3]">Dividen Owner</span>
                        <span className="font-bold">{formatRp(financeData.sisaDividenOwner)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3A703A] pb-1.5 text-[#F1C40F]">
                        <span>Dana Ditahan (Gaji)</span>
                        <span className="font-bold">{formatRp(financeData.danaDitahan)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KANAN: Top Performers */}
              <div className="bg-white rounded-[32px] border border-[#EBE5D9] p-8 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-black uppercase text-sm tracking-widest text-[#3A2A1A] flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#C69C6D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    Top Performers (Kasir)
                  </h3>
                  <span className="text-[10px] font-black text-[#8C7A6B] uppercase bg-[#F5F2EE] px-2 py-1 rounded-lg text-right">
                    Bulan<br/>{filterMonth === -1 ? 'Semua' : MONTHS[filterMonth]}
                  </span>
                </div>

                {dashboardStats.staffLeaderboard.length === 0 ? (
                  <div className="text-center py-10 bg-[#F5F2EE] rounded-2xl border border-[#EBE5D9] border-dashed">
                    <p className="text-xs font-bold text-gray-400">Belum ada data penjualan karyawan.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 max-h-[400px] overflow-y-auto pt-4 pl-4 pr-2 pb-4 -ml-4 -mt-4 scrollbar-hide">
                    {dashboardStats.staffLeaderboard.map((staff, idx) => {
                      const isTop1 = idx === 0;
                      const isTop2 = idx === 1;
                      const isTop3 = idx === 2;
                      const maxRevenue = dashboardStats.staffLeaderboard[0].revenue || 1;
                      const percentage = Math.max((staff.revenue / maxRevenue) * 100, 5); 

                      return (
                        <div key={idx} className={`relative bg-white p-5 rounded-3xl border shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${isTop1 ? 'border-[#D9A05B] ring-2 ring-[#D9A05B]/20' : 'border-[#EBE5D9]'}`}>
                          
                          {/* RANK BADGE */}
                          <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-black text-white shadow-lg border-2 border-white text-xs
                            ${isTop1 ? 'bg-yellow-400' : isTop2 ? 'bg-gray-400' : isTop3 ? 'bg-orange-400' : 'bg-[#3A2A1A]'}`}>
                            #{idx + 1}
                          </div>

                          {isTop1 && (
                            <div className="absolute top-4 right-4 bg-[#D9A05B]/10 text-[#D9A05B] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">MVP</div>
                          )}

                          <div className="ml-4 mt-1">
                            <h4 className="text-lg font-black text-[#3A2A1A] uppercase mb-0.5">{staff.name}</h4>
                            <p className="text-2xl font-black text-[#2D5A2D] mb-3">{formatRp(staff.revenue)}</p>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold border-b border-[#FDF6F0] pb-1.5">
                                <span className="text-[#8C7A6B] uppercase tracking-widest">Total Item Terjual</span>
                                <span className="text-[#3A2A1A] bg-[#F5F2EE] px-2 py-0.5 rounded">{staff.items} Cups</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-bold pb-1">
                                <span className="text-[#8C7A6B] uppercase tracking-widest">Waktu Bekerja</span>
                                <span className="text-[#3A2A1A] bg-[#F5F2EE] px-2 py-0.5 rounded">{staff.daysWorked} Hari Shift</span>
                              </div>
                              
                              <div className="pt-1">
                                <div className="w-full bg-[#F5F2EE] rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${isTop1 ? 'bg-[#D9A05B]' : 'bg-[#3A2A1A]'}`} style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* 4. BOTTOM STATS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-[#D9A05B] to-[#C69C6D] p-6 rounded-[24px] shadow-sm text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-white/80 uppercase tracking-widest mb-1">Total Pelanggan Terdaftar</p>
                  <h3 className="text-4xl font-black">{dashboardStats.totalActiveCustomers} <span className="text-lg font-bold">Member</span></h3>
                </div>
                <div className="bg-white/20 p-4 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
              </div>
              <div className="bg-white border border-[#EBE5D9] p-6 rounded-[24px] shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest mb-1">Total Karyawan Aktif</p>
                  <h3 className="text-4xl font-black text-[#3A2A1A]">{staffList.filter(s => s.status === 'Active').length} <span className="text-lg font-bold text-[#8C7A6B]">Staff</span></h3>
                </div>
                <div className="bg-[#F5F2EE] text-[#8C7A6B] p-4 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
              </div>
            </div>

            {/* 5. ANALYTICS ACTION CARD */}
            <div className="bg-gradient-to-br from-[#2A1E12] to-[#110C07] p-6 rounded-[24px] border border-[#C69C6D]/30 shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                <div>
                  <p className="text-[10px] font-black text-[#C69C6D] uppercase tracking-[0.3em] mb-1">Data Science</p>
                  <h3 className="text-xl font-serif font-black text-white mb-1">Analytics Dashboard</h3>
                  <p className="text-xs text-[#8C7A6B] font-medium leading-relaxed">
                    Export data transaksi bulan ini ke CSV, lalu upload ke Analytics Dashboard<br className="hidden md:block" />
                    untuk melihat Pivot Chart, Linear Regression Forecast, dan KPI analysis.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  {/* Step 1: Export */}
                  <ExportAnalyticsButton month={filterMonth} year={2026} />
                  {/* Step 2: Go to Analytics */}
                  <a
                    href="/admin/analytics"
                    className="inline-flex items-center gap-2 h-[48px] px-5 bg-[#C69C6D] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#D9A05B] transition-all shadow-sm whitespace-nowrap"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Buka Analytics →
                  </a>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-[#8C7A6B]">
                <span className="w-5 h-5 rounded-full bg-[#C69C6D]/20 text-[#C69C6D] flex items-center justify-center font-black text-[9px]">1</span>
                Export CSV
                <span className="text-[#C69C6D]/40 mx-1">→</span>
                <span className="w-5 h-5 rounded-full bg-[#C69C6D]/20 text-[#C69C6D] flex items-center justify-center font-black text-[9px]">2</span>
                Buka Analytics
                <span className="text-[#C69C6D]/40 mx-1">→</span>
                <span className="w-5 h-5 rounded-full bg-[#C69C6D]/20 text-[#C69C6D] flex items-center justify-center font-black text-[9px]">3</span>
                Upload CSV → Dashboard aktif
              </div>
            </div>

          </div>
        )}

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
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Bukti Foto</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Catatan / Laporan</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest">Item / Revenue</th>
                    <th className="p-4 text-[10px] font-black text-[#8C7A6B] uppercase tracking-widest text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE1]">
                  {currentMonthLogs.map((log) => {
                    const outPhotoUrl = log.clock_out_photo_url || log.out_photo_url || log.photo_out || log.clock_out_photo || null;
                    
                    return (
                      <tr key={log.id} className="hover:bg-[#FCF9F4] transition-colors text-xs">
                        <td className="p-4 font-bold">{formatDate(log.created_at)}</td>
                        <td className="p-4 font-black uppercase">{log.staff_name}</td>
                        <td className="p-4">
                          <span className="text-[#2D5A2D] font-bold">{formatTime(log.created_at)}</span> - <span className="text-[#8A2E2E] font-bold">{formatTime(log.clock_out_time)}</span>
                          {log.late_minutes > 0 && <span className="block text-[10px] text-red-500 font-bold mt-1">Telat {log.late_minutes}mnt</span>}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {log.clock_in_photo_url ? (
                              <a href={log.clock_in_photo_url} target="_blank" rel="noopener noreferrer">
                                <img src={log.clock_in_photo_url} alt="In" className="w-10 h-10 rounded-lg object-cover border border-[#EBE5D9] hover:scale-110 transition-transform shadow-sm" />
                              </a>
                            ) : <div className="w-10 h-10 rounded-lg bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-400 text-center uppercase tracking-widest">No<br/>In</div>}
                            
                            {outPhotoUrl ? (
                              <a href={outPhotoUrl} target="_blank" rel="noopener noreferrer">
                                <img src={outPhotoUrl} alt="Out" className="w-10 h-10 rounded-lg object-cover border border-[#EBE5D9] hover:scale-110 transition-transform shadow-sm" />
                              </a>
                            ) : <div className="w-10 h-10 rounded-lg bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-400 text-center uppercase tracking-widest">No<br/>Out</div>}
                          </div>
                        </td>
                        <td className="p-4 text-xs font-bold text-[#8C7A6B] max-w-[200px] break-words leading-relaxed">
                          {log.notes || '-'}
                        </td>
                        <td className="p-4"><div><p className="font-bold">{log.items_sold || 0} Item</p><p className="font-black text-[#C69C6D]">{formatRp(log.revenue_generated || 0)}</p></div></td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => {
                              setEditingLog(log);
                              setEditItems(log.items_sold?.toString() || '0');
                              setEditRevenue(log.revenue_generated?.toString() || '0');
                              setEditLateMinutes(log.late_minutes?.toString() || '0');
                            }} className="bg-[#EBE5D9] text-[#3A2A1A] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-[#C69C6D] hover:text-white transition-colors">Edit</button>
                            <button onClick={() => handleDeleteLog(log.id, log.staff_name)} className="bg-[#FDF2F2] text-[#8A2E2E] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-[#8A2E2E] hover:text-white transition-colors">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
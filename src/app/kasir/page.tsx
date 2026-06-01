'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Check, X, Eye, Loader2, ClipboardList, Wallet, QrCode, Coffee, MessageCircle, Clock, Users } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const KASIR_SECRET_KEY = 'CHOGOKASIR'; // PASSCODE UNTUK KASIR
const CUSTOMERS_PER_PAGE = 25;

export default function KasirPage() {
  // --- STATES KEAMANAN & TAB ---
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'LOYALTY'>('LIVE');

  // --- STATES LIVE ORDER & LAPORAN ---
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [completedOrdersToday, setCompletedOrdersToday] = useState<any[]>([]);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // --- STATES LOYALTY CARD ---
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custStamps, setCustStamps] = useState('0');
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [currentCustomerPage, setCurrentCustomerPage] = useState(1);
  const [loadingAction, setLoadingAction] = useState(false);

  // ==========================================
  // LOGIN LOGIC
  // ==========================================
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === KASIR_SECRET_KEY) { 
      setIsAuthorized(true); 
      fetchOrders();
      fetchCustomers();
    } else { 
      alert('Kunci Akses Kasir Salah!'); 
    }
  };

  // ==========================================
  // FETCH DATA
  // ==========================================
  const fetchOrders = async () => {
    const { data: active } = await supabase.from('orders').select('*').neq('status', 'Selesai').neq('status', 'Ditolak').order('created_at', { ascending: true });
    const today = new Date(); today.setHours(0, 0, 0, 0); 
    const { data: completed } = await supabase.from('orders').select('*').eq('status', 'Selesai').gte('created_at', today.toISOString());
    if (active) setActiveOrders(active);
    if (completed) setCompletedOrdersToday(completed);
    setInitialLoading(false);
  };

  const fetchCustomers = async () => {
    const { data: custData } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (custData) setCustomerList(custData);
  };

  useEffect(() => {
    if (isAuthorized) {
      const interval = setInterval(fetchOrders, 3000); 
      return () => clearInterval(interval);
    }
  }, [isAuthorized]);

  // ==========================================
  // LOGIKA LIVE ORDER
  // ==========================================
  const openWhatsApp = (phone: string, name: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) { cleaned = '62' + cleaned.substring(1); } 
    else if (cleaned.startsWith('8')) { cleaned = '62' + cleaned; }
    const text = `Ting-tong! Halo Kak ${name}, pesanan Chōgō Coffee Anda sudah SIAP. Silakan ambil di meja pick-up ya! Terima kasih. ☕✨`;
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const updateStatus = async (id: string, status: string, phone?: string, name?: string) => {
    if (!confirm(`Konfirmasi: Pesanan ini ${status}?`)) return;
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();
    if (status === 'Selesai' && phone && name) { openWhatsApp(phone, name); }
  };

  const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  const generateReport = (orders: any[]) => {
    let totalCash = 0; let totalQris = 0; let totalItems = 0;
    const itemMap: Record<string, number> = {};
    orders.forEach(o => {
      if (o.payment_method === 'CASH') totalCash += o.total_price;
      if (o.payment_method === 'QRIS') totalQris += o.total_price;
      o.items.forEach((item: any) => {
        if (!itemMap[item.name]) itemMap[item.name] = 0;
        itemMap[item.name] += item.qty;
        totalItems += item.qty;
      });
    });
    const sortedItems = Object.entries(itemMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
    return { revenue: totalCash + totalQris, totalCash, totalQris, totalItems, itemsBreakdown: sortedItems };
  };

  const { reportPagi, reportSore, reportTotal } = useMemo(() => {
    const pagi = completedOrdersToday.filter(o => new Date(o.created_at).getHours() < 15);
    const sore = completedOrdersToday.filter(o => new Date(o.created_at).getHours() >= 15);
    return { reportPagi: generateReport(pagi), reportSore: generateReport(sore), reportTotal: generateReport(completedOrdersToday) };
  }, [completedOrdersToday]);

  const ReportCard = ({ title, report, badgeColor }: { title: string, report: any, badgeColor: string }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-[#EBE5D9] shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 border-b border-[#FDF6F0] pb-4">
        <h3 className="font-black text-lg uppercase tracking-widest">{title}</h3>
        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${badgeColor}`}>
          {report.totalItems} Item Terjual
        </span>
      </div>
      <div className="mb-6">
        <p className="text-[10px] text-[#8D7B68] font-black uppercase tracking-widest mb-1">Total Pendapatan</p>
        <h4 className="text-3xl font-black text-[#2D5A2D]">{formatRp(report.revenue)}</h4>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#8D7B68]">
            <Wallet size={14} className="text-[#3E2723]" /> Cash: {formatRp(report.totalCash)}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#8D7B68]">
            <QrCode size={14} className="text-[#2952E3]" /> QRIS: {formatRp(report.totalQris)}
          </div>
        </div>
      </div>
      <div className="flex-1 bg-[#FDF6F0] rounded-2xl p-4 border border-[#EBE5D9]">
        <p className="text-[10px] text-[#8D7B68] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
          <Coffee size={12} /> Rincian Menu Terjual
        </p>
        {report.itemsBreakdown.length === 0 ? (
          <p className="text-xs font-bold text-[#8D7B68] italic">Belum ada penjualan di shift ini.</p>
        ) : (
          <ul className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
            {report.itemsBreakdown.map((i: any, idx: number) => (
              <li key={idx} className="flex justify-between text-xs font-bold border-b border-[#EBE5D9] pb-1">
                <span>{i.name}</span>
                <span className="text-[#D9A05B] bg-white px-2 py-0.5 rounded shadow-sm">{i.qty}x</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  // ==========================================
  // LOGIKA LOYALTY CARD (DARI ADMIN)
  // ==========================================
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault(); if (!custName || !custPhone) return; setLoadingAction(true);
    let formattedPhone = custPhone.trim().replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('62')) { formattedPhone = '0' + formattedPhone.slice(2); }
    
    if (editingCustId) {
      await supabase.from('customers').update({ name: custName, phone: formattedPhone, stamps: parseInt(custStamps || '0') }).eq('id', editingCustId);
      await supabase.from('admin_activity_logs').insert({ action: `[KASIR] Edit pelanggan ${custName} (Stamp: ${custStamps})` });
    } else {
      await supabase.from('customers').insert({ name: custName, phone: formattedPhone, stamps: parseInt(custStamps || '0') });
      await supabase.from('admin_activity_logs').insert({ action: `[KASIR] Registrasi member baru: ${custName}` });
    }
    setCustName(''); setCustPhone(''); setCustStamps('0'); setEditingCustId(null); fetchCustomers(); setLoadingAction(false);
  };

  const handleUpdateStamps = async (id: string, currentStamps: number, amount: number, customerName: string) => {
    let newStamps = currentStamps + amount; if (newStamps < 0) newStamps = 0;
    await supabase.from('customers').update({ stamps: newStamps }).eq('id', id);
    const actionText = amount > 0 ? 'Menambah' : 'Mengurangi';
    await supabase.from('admin_activity_logs').insert({ action: `[KASIR] ${actionText} stamp ${customerName} jadi ${newStamps}` });
    fetchCustomers();
  };

  const handleClaimReward = async (id: string, currentStamps: number, customerName: string) => {
    if (currentStamps < 10) { alert('Stamp belum mencukupi (Minimal 10 Stamp).'); return; }
    if (confirm(`Kurangi 10 stamp untuk penukaran 1 kopi gratis? Sisa stamp pelanggan akan menjadi ${currentStamps - 10}.`)) {
      setLoadingAction(true);
      await supabase.from('customers').update({ stamps: currentStamps - 10 }).eq('id', id);
      await supabase.from('admin_activity_logs').insert({ action: `[KASIR REWARD] ${customerName} klaim 1 kopi gratis! (Sisa Stamp: ${currentStamps - 10})` });
      fetchCustomers(); setLoadingAction(false);
    }
  };

  const getLoyaltyWhatsAppLink = (phone: string, name: string, stamps: number) => {
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

  // ==========================================
  // RENDER TAMPILAN
  // ==========================================
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#FDF6F0] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[32px] shadow-sm border border-[#EBE5D9] w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-[#3E2723] rounded-full mx-auto mb-6 flex items-center justify-center text-white text-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h1 className="text-2xl font-serif font-black text-[#3E2723] mb-2">Portal Kasir</h1>
          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <input type="password" placeholder="Passcode" className="w-full h-[56px] border border-[#EBE5D9] px-4 rounded-2xl text-center text-lg tracking-[0.5em] text-[#3E2723] outline-none focus:border-[#D9A05B] bg-[#FAF8F5]" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
            <button className="w-full h-[56px] bg-[#3E2723] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#D9A05B] transition-all">Buka Mesin</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6 md:p-10 font-sans text-[#3E2723]">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[#EBE5D9] pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Terminal Kasir Chōgō</h1>
            <p className="text-[#8D7B68] text-xs font-bold mt-1 tracking-widest uppercase">Pusat Antrean & Loyalty Member</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setActiveTab('LIVE')} className={`flex-1 md:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'LIVE' ? 'bg-[#3E2723] text-white shadow-md' : 'bg-white text-[#8D7B68] border border-[#EBE5D9]'}`}>
              <Clock size={16}/> Live Order
            </button>
            <button onClick={() => setActiveTab('LOYALTY')} className={`flex-1 md:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'LOYALTY' ? 'bg-[#D9A05B] text-white shadow-md' : 'bg-white text-[#8D7B68] border border-[#EBE5D9]'}`}>
              <Users size={16}/> Member
            </button>
          </div>
        </div>

        {initialLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#D9A05B]">
            <Loader2 className="animate-spin w-10 h-10 mb-4" />
            <p className="font-bold text-sm uppercase tracking-widest">Memuat Database...</p>
          </div>
        ) : activeTab === 'LIVE' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {activeOrders.length === 0 ? (
                <div className="col-span-full p-12 text-center bg-white rounded-[2rem] border border-[#EBE5D9] shadow-sm">
                  <p className="text-[#8D7B68] font-black uppercase tracking-widest">Aman, Belum ada antrean pesanan.</p>
                </div>
              ) : (
                activeOrders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#EBE5D9] flex flex-col relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-2 h-full ${order.status === 'Sedang Dibuat' ? 'bg-[#2D5A2D]' : 'bg-[#D9A05B]'}`}></div>
                    
                    <div className="flex justify-between items-start mb-4 border-b border-[#FDF6F0] pb-4 pl-3">
                      <div>
                        <h3 className="font-black text-xl uppercase tracking-widest">{order.customer_name}</h3>
                        <p className="text-[10px] text-[#8D7B68] font-bold mt-1 uppercase tracking-widest">{order.order_type} • {order.customer_whatsapp}</p>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${order.payment_method === 'QRIS' ? 'bg-[#2952E3]/10 text-[#2952E3]' : 'bg-[#2D5A2D]/10 text-[#2D5A2D]'}`}>
                        {order.payment_method}
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl mb-4 text-[10px] font-black text-center uppercase tracking-widest ml-3 border 
                      ${order.status === 'Sedang Dibuat' ? 'bg-green-50 border-green-200 text-green-700' : 
                        order.status.includes('QRIS') ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
                      {order.status}
                    </div>

                    {order.payment_method === 'QRIS' && order.payment_proof_url && (
                      <button onClick={() => setPreviewImg(order.payment_proof_url)} className="ml-3 mb-4 bg-[#FDF6F0] text-[#3E2723] border border-[#D9A05B] py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#D9A05B] hover:text-white transition-colors">
                        <Eye size={16} /> Buka Bukti Transfer
                      </button>
                    )}

                    <ul className="mb-6 space-y-3 flex-1 bg-[#FDF6F0] p-4 rounded-2xl ml-3 border border-[#EBE5D9]">
                      {order.items.map((item: any, idx: number) => (
                        <li key={idx} className="text-sm font-bold flex justify-between items-start">
                          <div className="flex-1">
                            <span>{item.qty}x {item.name}</span>
                            {item.note && <p className="text-[10px] text-[#8A2E2E] bg-white px-1.5 py-0.5 rounded border border-red-100 inline-block mt-1">Note: {item.note}</p>}
                          </div>
                          <span className="text-[#D9A05B] ml-2">{formatRp(item.price * item.qty)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex justify-between items-center font-black text-xl mb-6 ml-3">
                      <span>TOTAL</span><span>{formatRp(order.total_price)}</span>
                    </div>

                    {order.status.includes('Menunggu') ? (
                      <div className="grid grid-cols-2 gap-3 mt-auto ml-3">
                        <button onClick={() => updateStatus(order.id, 'Sedang Dibuat')} className="bg-[#3E2723] text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md hover:bg-[#D9A05B] transition-colors"><Check size={16} /> Proses</button>
                        <button onClick={() => updateStatus(order.id, 'Ditolak')} className="bg-[#FDF2F2] text-[#8A2E2E] border border-[#8A2E2E] py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm hover:bg-[#8A2E2E] hover:text-white transition-colors"><X size={16} /> Tolak</button>
                      </div>
                    ) : (
                      <div className="mt-auto ml-3">
                        <button onClick={() => updateStatus(order.id, 'Selesai', order.customer_whatsapp, order.customer_name)} className="w-full bg-[#25D366] text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-green-600 transition-colors">
                          <MessageCircle size={18} /> Selesai & WA
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mb-10 flex items-center gap-3 border-b border-[#EBE5D9] pb-4 mt-8">
              <ClipboardList className="text-[#D9A05B]" size={28} />
              <h2 className="text-2xl font-black uppercase tracking-tighter">Laporan Harian (Hari Ini)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ReportCard title="Shift Pagi" report={reportPagi} badgeColor="bg-blue-100 text-blue-700" />
              <ReportCard title="Shift Sore" report={reportSore} badgeColor="bg-orange-100 text-orange-700" />
              <div className="md:border-l-4 md:border-[#D9A05B] md:pl-6 relative">
                <div className="absolute -top-4 -right-4 bg-[#D9A05B] text-white w-10 h-10 rounded-full flex items-center justify-center font-black rotate-12 shadow-lg">☕</div>
                <ReportCard title="Total Hari Ini" report={reportTotal} badgeColor="bg-[#3E2723] text-white" />
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[32px] border border-[#EBE5D9] p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="font-black uppercase text-sm tracking-widest text-[#D9A05B] flex items-center gap-2">
                  <Users size={20}/> Database Pelanggan
                </h3>
                <input 
                  type="text" 
                  placeholder="Cari nama / no. WA..." 
                  value={searchCustomer} 
                  onChange={(e) => { setSearchCustomer(e.target.value); setCurrentCustomerPage(1); }}
                  className="w-full md:w-64 h-[48px] border border-[#EBE5D9] px-4 rounded-2xl text-xs font-bold bg-[#FAF8F5] outline-none focus:border-[#D9A05B]"
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
                      <th className="p-4 font-black text-center">Aksi Lanjutan</th>
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
                            <td className="p-4 font-bold text-[#8D7B68]">{cust.phone}</td>
                            <td className="p-4 text-center">
                              <span className={`border px-3 py-1.5 rounded-xl font-black text-sm ${isPriority ? 'bg-white border-[#F57F17] text-[#F57F17]' : 'bg-[#FAF8F5] border-[#EBE5D9] text-[#D9A05B]'}`}>
                                {cust.stamps} / 10
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-1">
                                <button onClick={() => handleUpdateStamps(cust.id, cust.stamps, 1, cust.name)} className="bg-[#E8F5E9] text-[#2D5A2D] px-2.5 py-1 rounded-lg font-black text-sm hover:bg-[#C8E6C9]">+</button>
                                <button onClick={() => handleUpdateStamps(cust.id, cust.stamps, -1, cust.name)} className="bg-[#FDF2F2] text-[#8A2E2E] px-2.5 py-1 rounded-lg font-black text-sm hover:bg-[#FADBD8]">-</button>
                                {cust.stamps >= 10 && (
                                  <button onClick={() => handleClaimReward(cust.id, cust.stamps, cust.name)} disabled={loadingAction} className="bg-[#D9A05B] text-white px-3 py-1 rounded-lg font-black text-[10px] uppercase ml-1 tracking-wider shadow-sm hover:bg-[#3E2723]">Klaim</button>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center items-center gap-2">
                                {isPriority && (
                                  <a href={getLoyaltyWhatsAppLink(cust.phone, cust.name, cust.stamps)} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#128C7E] shadow-sm">WA</a>
                                )}
                                <button onClick={() => { setEditingCustId(cust.id); setCustName(cust.name); setCustPhone(cust.phone); setCustStamps(cust.stamps.toString()); }} className="bg-[#EBE5D9] text-[#3E2723] px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase hover:bg-[#D9A05B] hover:text-white">Edit</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold text-xs">Pelanggan tidak ditemukan.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalCustomerPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#EBE5D9]">
                  <button onClick={() => setCurrentCustomerPage(p => Math.max(1, p - 1))} disabled={currentCustomerPage === 1} className="h-[40px] px-4 bg-[#F5F2EE] text-[#8D7B68] font-bold text-[10px] uppercase rounded-xl disabled:opacity-50">Sebelumnya</button>
                  <span className="text-[10px] font-black text-[#3E2723] uppercase tracking-widest">Halaman {currentCustomerPage} dari {totalCustomerPages}</span>
                  <button onClick={() => setCurrentCustomerPage(p => Math.min(totalCustomerPages, p + 1))} disabled={currentCustomerPage === totalCustomerPages} className="h-[40px] px-4 bg-[#F5F2EE] text-[#8D7B68] font-bold text-[10px] uppercase rounded-xl disabled:opacity-50">Selanjutnya</button>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-[#EBE5D9] h-max sticky top-8 shadow-sm">
              <h3 className="font-black uppercase text-sm mb-6 tracking-widest">{editingCustId ? 'Edit Pelanggan' : 'Daftar Member Baru'}</h3>
              <form onSubmit={handleSaveCustomer} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-[#8D7B68] uppercase">Nama Pelanggan</label>
                  <input type="text" placeholder="Masukkan nama" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full h-[56px] mt-1 border border-[#EBE5D9] px-4 rounded-2xl text-sm font-bold bg-[#FAF8F5] outline-none focus:border-[#D9A05B]" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#8D7B68] uppercase">No WhatsApp</label>
                  <input type="text" placeholder="Cth: 0812..." value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full h-[56px] mt-1 border border-[#EBE5D9] px-4 rounded-2xl text-sm font-bold bg-[#FAF8F5] outline-none focus:border-[#D9A05B]" />
                </div>
                {editingCustId && (
                  <div>
                    <label className="text-[10px] font-black text-[#8D7B68] uppercase">Jumlah Stamp</label>
                    <input type="number" placeholder="Jumlah Stamp" value={custStamps} onChange={(e) => setCustStamps(e.target.value)} className="w-full h-[56px] mt-1 border border-[#EBE5D9] px-4 rounded-2xl text-sm font-bold bg-[#FAF8F5] outline-none focus:border-[#D9A05B]" />
                  </div>
                )}
                <div className="pt-2">
                  <button type="submit" disabled={loadingAction} className="w-full h-[56px] bg-[#D9A05B] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#3E2723] transition-colors shadow-md">
                    {loadingAction ? '...' : editingCustId ? 'Simpan Perubahan' : 'Daftar Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* MODAL ZOOM BUKTI TRANSFER */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3E2723]/90 backdrop-blur-sm p-4" onClick={() => setPreviewImg(null)}>
          <div className="bg-white p-4 rounded-3xl max-w-md w-full relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImg(null)} className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-2 shadow-lg font-bold"><X size={24}/></button>
            <h3 className="text-center font-black mb-4 uppercase tracking-widest">Cek Bukti Transfer</h3>
            <div className="bg-gray-100 rounded-xl flex items-center justify-center min-h-[300px] overflow-hidden p-2">
              <img src={previewImg} alt="Bukti Transfer" className="w-full h-auto max-h-[70vh] rounded-lg object-contain" />
            </div>
            <button onClick={() => setPreviewImg(null)} className="w-full mt-4 py-4 bg-[#FDF6F0] text-[#3E2723] rounded-xl font-black uppercase tracking-widest text-xs border border-[#EBE5D9]">Tutup Gambar</button>
          </div>
        </div>
      )}
    </div>
  );
}
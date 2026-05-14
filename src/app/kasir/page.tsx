'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Check, X, Eye, Loader2, ClipboardList, Wallet, QrCode, Coffee, MessageCircle, Clock } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KasirPage() {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [completedOrdersToday, setCompletedOrdersToday] = useState<any[]>([]);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchOrders = async () => {
    // 1. Ambil Pesanan Aktif (Menunggu atau Sedang Dibuat)
    const { data: active } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'Selesai')
      .neq('status', 'Ditolak')
      .order('created_at', { ascending: true });
    
    // 2. Ambil Pesanan Selesai Khusus Hari Ini (Untuk Laporan)
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const { data: completed } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'Selesai')
      .gte('created_at', today.toISOString());

    if (active) setActiveOrders(active);
    if (completed) setCompletedOrdersToday(completed);
    setInitialLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); 
    return () => clearInterval(interval);
  }, []);

  // FUNGSI KONVERSI NOMOR DAN KIRIM WA
  const openWhatsApp = (phone: string, name: string) => {
    // Bersihkan karakter selain angka
    let cleaned = phone.replace(/\D/g, '');
    // Ubah 08 menjadi 628
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    
    // Template Teks WA Gacoan-style
    const text = `Ting-tong! Halo Kak ${name}, pesanan Chōgō Coffee Anda sudah SIAP. Silakan ambil di meja pick-up ya! Terima kasih. ☕✨`;
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
    
    // Buka di tab baru
    window.open(url, '_blank');
  };

  const updateStatus = async (id: string, status: string, phone?: string, name?: string) => {
    if (!confirm(`Konfirmasi: Pesanan ini ${status}?`)) return;
    
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();

    // Jika ditekan tombol Selesai, trigger pop-up WhatsApp
    if (status === 'Selesai' && phone && name) {
      openWhatsApp(phone, name);
    }
  };

  const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  // ==========================================
  // LOGIK PEMBUATAN LAPORAN HARIAN & SHIFT
  // ==========================================
  const generateReport = (orders: any[]) => {
    let totalCash = 0;
    let totalQris = 0;
    let totalItems = 0;
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

    const sortedItems = Object.entries(itemMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    return {
      revenue: totalCash + totalQris,
      totalCash,
      totalQris,
      totalItems,
      itemsBreakdown: sortedItems
    };
  };

  const { reportPagi, reportSore, reportTotal } = useMemo(() => {
    const pagi = completedOrdersToday.filter(o => new Date(o.created_at).getHours() < 15);
    const sore = completedOrdersToday.filter(o => new Date(o.created_at).getHours() >= 15);

    return {
      reportPagi: generateReport(pagi),
      reportSore: generateReport(sore),
      reportTotal: generateReport(completedOrdersToday)
    };
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

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6 md:p-10 font-sans text-[#3E2723]">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-center mb-8 border-b border-[#EBE5D9] pb-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Live Kasir Chōgō</h1>
            <p className="text-[#8D7B68] text-xs font-bold mt-1 tracking-widest uppercase">Pusat Antrean & Verifikasi Pembayaran</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-[#2D5A2D] bg-[#2D5A2D]/10 px-4 py-2 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#2D5A2D] animate-ping"></span> Sync Aktif
          </div>
        </div>
        
        {initialLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#D9A05B]">
            <Loader2 className="animate-spin w-10 h-10 mb-4" />
            <p className="font-bold text-sm uppercase tracking-widest">Memuat Database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {activeOrders.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-[2rem] border border-[#EBE5D9] shadow-sm">
                <p className="text-[#8D7B68] font-black uppercase tracking-widest">Aman, Belum ada antrean pesanan.</p>
              </div>
            ) : (
              activeOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#EBE5D9] flex flex-col relative overflow-hidden">
                  
                  {/* Indikator Warna Garis Kiri (Kuning jika menunggu, Hijau jika sedang dibuat) */}
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

                  {/* LOGIKA TOMBOL BERUBAH BERDASARKAN STATUS */}
                  {order.status.includes('Menunggu') ? (
                    <div className="grid grid-cols-2 gap-3 mt-auto ml-3">
                      <button onClick={() => updateStatus(order.id, 'Sedang Dibuat')} className="bg-[#3E2723] text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md hover:bg-[#D9A05B] transition-colors"><Check size={16} /> Terima & Proses</button>
                      <button onClick={() => updateStatus(order.id, 'Ditolak')} className="bg-[#FDF2F2] text-[#8A2E2E] border border-[#8A2E2E] py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm hover:bg-[#8A2E2E] hover:text-white transition-colors"><X size={16} /> Tolak</button>
                    </div>
                  ) : (
                    <div className="mt-auto ml-3">
                      <button onClick={() => updateStatus(order.id, 'Selesai', order.customer_whatsapp, order.customer_name)} className="w-full bg-[#25D366] text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-green-600 transition-colors">
                        <MessageCircle size={18} /> Selesai & Kirim WA
                      </button>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        )}

        {/* =========================================
            BAGIAN 2: LAPORAN PENJUALAN HARIAN
        ========================================= */}
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
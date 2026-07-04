'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LoyaltyCardPortal() {
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCheckLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone.trim())
      .single();

    if (data && !error) {
      setCustomer(data);
    } else {
      setCustomer(null);
      setMessage('Nomor WhatsApp Anda belum terdaftar sebagai member Chōgō. Silakan hubungi kasir untuk pendaftaran.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-10 rounded-[32px] border border-[#EBE5D9] w-full max-w-[440px] shadow-sm">
        <div className="text-center mb-8">
          <p className="text-[#A68A6B] font-bold text-[10px] uppercase tracking-[0.3em] mb-2">Chōgō Coffee Co.</p>
          <h1 className="text-3xl font-serif font-black text-[#3A2A1A] tracking-tight">Loyalty Stamp Card</h1>
          <p className="text-xs text-[#8C7A6B] font-medium mt-1">Kumpulkan 10 Stamp & Nikmati 1 Kopi Gratis!</p>
        </div>

        {!customer ? (
          <form onSubmit={handleCheckLoyalty} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-[#8C7A6B] mb-2 uppercase tracking-widest">Masukkan No. WA Member</label>
              <input 
                type="text" 
                placeholder="Cth: 08123456789" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-[56px] border border-[#EBE5D9] px-4 rounded-2xl bg-[#FAF8F5] font-bold text-sm text-[#3A2A1A] outline-none focus:border-[#C69C6D]"
              />
            </div>
            {message && <p className="text-xs text-[#8A2E2E] font-bold leading-relaxed text-center bg-[#FDF2F2] p-4 rounded-2xl border border-[#FADBD8]">{message}</p>}
            <button type="submit" disabled={loading} className="w-full h-[56px] bg-[#3A2A1A] text-white font-black rounded-2xl text-xs tracking-widest uppercase hover:bg-[#C69C6D] transition-colors">
              {loading ? 'MEMPROSES...' : 'LIHAT KARTU STAMP'}
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-fade-in-down">
            {/* KARTU LOYALITAS DIGITAL */}
            <div className="bg-[#3A2A1A] text-white p-6 rounded-[24px] relative overflow-hidden shadow-md">
              <div className="relative z-10">
                <p className="text-[9px] font-black tracking-widest text-[#C69C6D] uppercase">Exclusive Member</p>
                <h2 className="text-xl font-serif font-bold mt-1 uppercase">{customer.name}</h2>
                <p className="text-xs text-gray-400 font-medium">{customer.phone}</p>
                
                {/* GRID BULATAN STAMP */}
                <div className="grid grid-cols-5 gap-3 mt-6">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const isStamped = idx < customer.stamps;
                    return (
                      <div 
                        key={idx} 
                        className={`aspect-square rounded-full flex items-center justify-center font-black text-xs border transition-all ${
                          isStamped 
                            ? 'bg-[#C69C6D] text-[#3A2A1A] border-[#C69C6D] shadow-inner scale-105' 
                            : 'bg-transparent text-gray-600 border-gray-700'
                        }`}
                      >
                        {isStamped ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : idx + 1}
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-right text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-wider">
                  {customer.stamps >= 10 ? 'Silakan Klaim ke Kasir!' : `Sisa ${10 - customer.stamps} Stamp Lagi`}
                </p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 font-serif">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <button 
              onClick={() => { setCustomer(null); setPhone(''); }} 
              className="w-full h-[56px] bg-[#F5F2EE] text-[#8C7A6B] font-black rounded-2xl text-xs tracking-widest uppercase hover:bg-[#EBE5D9] transition-colors"
            >
              Kembali
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
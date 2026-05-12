'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const OUTLET_ID = 'af3ef62a-ac69-4094-b7e4-85fc5b1c6e11';
const CHOGO_LAT = -6.858907; 
const CHOGO_LON = 107.920612;
const MAX_RADIUS = 500; 

// --- IDENTITAS (DAFTAR SUDAH DITAMBAH IBOO) ---
const SUPER_ADMIN_ID = '1a24f87a-8ee9-4e19-857a-06ec616d1378';
const OWNER_ID = 'f2b6a943-4f9e-4b2a-8d1c-99e52e25d2b7'; // ID Khusus Iboo
const STAFF_LIST = [
  { id: 'c720fb23-e13f-4f5d-a2de-40989ae1df69', name: 'Vikry' },
  { id: 'a6b27457-78f6-474e-8f9b-36a45028a8be', name: 'Arief' },
  { id: 'b1935c42-8a9b-4e31-a7d2-6f2c3a5b8d91', name: 'Adin' }, // <-- Adin ditambahkan
  { id: OWNER_ID, name: 'Iboo (Owner)' },
  { id: SUPER_ADMIN_ID, name: 'Moch Sugih Nugraha (GM)' }
];

const SHIFTS = [
  { id: 'PAGI', label: 'Shift Pagi (07:00 - 15:00)', start: '07:00' },
  { id: 'MIDDLE', label: 'Shift Middle (11:00 - 19:00)', start: '11:00' },
  { id: 'SIANG', label: 'Shift Siang (15:00 - 23:00)', start: '15:00' },
];

export default function AbsensiPortal() {
  const [mode, setMode] = useState<'IN' | 'OUT'>('IN');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [itemsSold, setItemsSold] = useState('');
  const [revenue, setRevenue] = useState('');
  const [progress, setProgress] = useState(''); 
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'info' | 'success' | 'error'>('info');

  const isGM = selectedStaff === SUPER_ADMIN_ID;
  const isOwner = selectedStaff === OWNER_ID;
  const isPrivileged = isGM || isOwner; // GM & Owner bebas lokasi

  useEffect(() => {
    if (isGM) setMode('IN');
  }, [isGM]);

  const calculateLateDenda = (shiftStartStr: string) => {
    const now = new Date();
    const [h, m] = shiftStartStr.split(':');
    const start = new Date();
    start.setHours(parseInt(h), parseInt(m), 0);
    if (now > start) {
      const diffMs = now.getTime() - start.getTime();
      return Math.floor(diffMs / 60000); 
    }
    return 0;
  };

  const handleAction = async () => {
    if (!selectedStaff || !file) {
      setMsgType('error'); setMessage('Lengkapi identitas dan foto bukti.'); return;
    }
    if (!isPrivileged && mode === 'IN' && !selectedShift) {
      setMsgType('error'); setMessage('Pilih jadwal shift Anda.'); return;
    }
    if (isGM && !progress.trim()) {
      setMsgType('error'); setMessage('Mohon isi laporan progress harian Anda.'); return;
    }
    if (!isGM && mode === 'OUT' && (!itemsSold || !revenue)) {
      setMsgType('error'); setMessage('Lengkapi laporan penjualan.'); return;
    }

    setLoading(true);
    setMsgType('info');
    setMessage('Menghubungkan ke satelit...');

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      // Geofencing: Hanya untuk Staff biasa
      if (!isPrivileged) {
        const R = 6371e3;
        const dLat = (CHOGO_LAT - latitude) * (Math.PI / 180);
        const dLon = (CHOGO_LON - longitude) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(latitude * (Math.PI / 180)) * Math.cos(CHOGO_LAT * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const distance = Math.floor(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));

        if (distance > MAX_RADIUS) {
          setMsgType('error');
          setMessage(`Akses Ditolak. Jarak Anda ${distance}m dari outlet.`);
          setLoading(false);
          return;
        }
      }

      try {
        const staffName = STAFF_LIST.find(s => s.id === selectedStaff)?.name || 'Unknown';
        const fileExt = file.name.split('.').pop();
        const fileName = `${mode}-${staffName}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage.from('selfie-photos').upload(fileName, file);
        if (uploadErr) throw uploadErr;
        const { data: imgUrl } = supabase.storage.from('selfie-photos').getPublicUrl(uploadData.path);

        if (isGM || mode === 'IN') {
          // Owner & GM tidak kena denda
          const lateMin = (isGM || isOwner) ? 0 : calculateLateDenda(SHIFTS.find(s => s.id === selectedShift)!.start);
          
          const { error: dbErr } = await supabase.from('attendance_logs').insert({
            user_id: selectedStaff,
            staff_name: staffName,
            outlet_id: OUTLET_ID,
            in_latitude: latitude,
            in_longitude: longitude,
            clock_in_photo_url: imgUrl.publicUrl,
            status: 'PRESENT',
            late_minutes: lateMin,
            notes: isGM ? progress : null, 
          });
          if (dbErr) throw dbErr;
          setMsgType('success');
          setMessage(isPrivileged ? '✅ Absen tervalidasi (Akses Khusus).' : (lateMin > 0 ? `⚠️ Terlambat ${lateMin}m.` : '✅ Masuk tepat waktu.'));
        } 
        else {
          const { data: lastLog } = await supabase.from('attendance_logs')
            .select('id').eq('user_id', selectedStaff).is('clock_out_time', null)
            .order('created_at', { ascending: false }).limit(1).single();

          if (!lastLog) throw new Error('Anda belum absen masuk hari ini.');

          const { error: dbErr } = await supabase.from('attendance_logs').update({
            clock_out_time: new Date().toISOString(),
            items_sold: parseInt(itemsSold),
            revenue_generated: parseFloat(revenue),
          }).eq('id', lastLog.id);
          if (dbErr) throw dbErr;
          setMsgType('success');
          setMessage('✅ Laporan pulang terkirim.');
        }

        setFile(null); setItemsSold(''); setRevenue(''); setProgress('');
      } catch (e: any) {
        setMsgType('error'); setMessage(`Error: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }, () => {
      setMsgType('error'); setMessage('Aktifkan GPS.'); setLoading(false);
    }, { enableHighAccuracy: true });
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-10 rounded-[32px] shadow-sm border border-[#EBE5D9] w-full max-w-[440px]">
        <div className="text-center mb-8">
          <p className="text-[#A68A6B] font-bold text-[10px] uppercase tracking-[0.3em] mb-2">Internal Portal</p>
          {!isGM && (
            <div className="flex bg-[#F5F2EE] p-1 rounded-2xl mb-6">
              <button onClick={() => setMode('IN')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${mode === 'IN' ? 'bg-[#3A2A1A] text-white shadow-md' : 'text-[#8C7A6B]'}`}>MASUK</button>
              <button onClick={() => setMode('OUT')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${mode === 'OUT' ? 'bg-[#3A2A1A] text-white shadow-md' : 'text-[#8C7A6B]'}`}>PULANG</button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-[#8C7A6B] mb-2 uppercase tracking-widest">Identitas</label>
            <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="w-full border border-[#EBE5D9] p-4 rounded-2xl text-[#3A2A1A] bg-[#FAF8F5] outline-none font-bold text-sm">
              <option value="">-- Pilih Nama --</option>
              {STAFF_LIST.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {!isPrivileged && mode === 'IN' && (
            <div className="animate-fade-in-down">
              <label className="block text-[10px] font-black text-[#8C7A6B] mb-2 uppercase tracking-widest">Shift</label>
              <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)} className="w-full border border-[#EBE5D9] p-4 rounded-2xl text-[#3A2A1A] bg-[#FAF8F5] outline-none font-bold text-sm">
                <option value="">-- Pilih Shift --</option>
                {SHIFTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          )}

          {isGM && (
            <div className="animate-fade-in-down">
              <label className="block text-[10px] font-black text-[#8C7A6B] mb-2 uppercase tracking-widest text-[#2D5A2D]">Progress / Task GM</label>
              <textarea rows={3} placeholder="Apa progress Anda hari ini?" value={progress} onChange={(e) => setProgress(e.target.value)} className="w-full border border-[#EBE5D9] p-4 rounded-2xl text-[#3A2A1A] bg-[#FAF8F5] outline-none font-bold text-sm resize-none" />
            </div>
          )}

          {((mode === 'OUT' && !isGM) || (mode === 'OUT' && isOwner)) && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in-down">
              <div>
                <label className="block text-[10px] font-black text-[#8C7A6B] mb-2 uppercase tracking-widest">Item</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={itemsSold} 
                  onChange={(e) => setItemsSold(e.target.value)} 
                  className="w-full border border-[#EBE5D9] p-4 rounded-2xl bg-[#FAF8F5] font-bold text-sm text-[#3A2A1A] placeholder-gray-400 outline-none focus:border-[#C69C6D]" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[#8C7A6B] mb-2 uppercase tracking-widest">Revenue</label>
                <input 
                  type="number" 
                  placeholder="Rp" 
                  value={revenue} 
                  onChange={(e) => setRevenue(e.target.value)} 
                  className="w-full border border-[#EBE5D9] p-4 rounded-2xl bg-[#FAF8F5] font-bold text-sm text-[#3A2A1A] placeholder-gray-400 outline-none focus:border-[#C69C6D]" 
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-[#8C7A6B] mb-2 uppercase tracking-widest">Foto Bukti</label>
            <input type="file" accept="image/*" capture="user" onChange={(e) => e.target.files && setFile(e.target.files[0])} className="w-full text-xs text-[#8C7A6B] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-[#3A2A1A] file:text-white border border-[#EBE5D9] rounded-2xl p-2 bg-[#FAF8F5]" />
          </div>

          <div className="min-h-[48px] flex items-end">
            {message && <div className={`w-full p-4 rounded-2xl text-[11px] font-bold text-center border transition-all ${msgType === 'success' ? 'bg-[#F2F7F2] text-[#2D5A2D]' : 'bg-[#FDF2F2] text-[#8A2E2E]'}`}>{message}</div>}
          </div>

          <button onClick={handleAction} disabled={loading} className={`w-full text-white font-black py-5 rounded-2xl shadow-sm text-xs tracking-widest ${loading ? 'bg-[#D2C5B8]' : 'bg-[#3A2A1A] hover:bg-[#C69C6D]'}`}>
            {loading ? 'MEMPROSES...' : (isGM ? 'KIRIM LAPORAN GM' : 'KONFIRMASI')}
          </button>
        </div>
      </div>
    </div>
  );
}
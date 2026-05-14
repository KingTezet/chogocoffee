'use client';
import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingBag, Plus, Minus, X, CheckCircle, Upload, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const menuData = [
  { id:1, category:"White Coffee", name:"Latte", price:18000, img: "/latte.jpg", bestseller:false },
  { id:2, category:"White Coffee", name:"Cappuccino", price:18000, img: "/cappuccino.jpg", bestseller:false },
  { id:3, category:"White Coffee", name:"Chogo Classic Creamy", price:20000, img: "/icedchogoclassiccreamy.jpg", bestseller:false },
  { id:4, category:"White Coffee", name:"Aren Latte", price:20000, img: "/icedarenlatte.jpg", bestseller:true },
  { id:5, category:"White Coffee", name:"Butterscotch Latte", price:20000, img: "/icedbutterscotchlatte.jpg", bestseller:true },
  { id:6, category:"White Coffee", name:"Caramel Latte", price:22000, img: "/icedcaramellatte.jpg", bestseller:true },
  { id:7, category:"White Coffee", name:"Hazelnut Latte", price:22000, img: "/icedhazelnutlatte.jpg", bestseller:false },
  { id:8, category:"Black Coffee", name:"Americano", price:15000, img: "/icedamericano.jpg", bestseller:false },
  { id:9, category:"Black Coffee", name:"Lemon Americano", price:18000, img: "/icedlemonamericano.jpg", bestseller:false },
  { id:10, category:"Black Coffee", name:"Peachberrycano", price:18000, img: "/icedpeachberrycano.jpg", bestseller:true },
  { id:11, category:"Black Coffee", name:"V60", price:22000, img: "", bestseller:false },
  { id:12, category:"Non Coffee", name:"Lemon Tea", price:16000, img: "/lemontea.jpg", bestseller:false },
  { id:13, category:"Non Coffee", name:"Choco Classic", price:16000, img: "/chococlassic.jpg", bestseller:false },
  { id:14, category:"Non Coffee", name:"Choco Caramel", price:18000, img: "/chochocaramel.jpg", bestseller:false },
  { id:15, category:"Non Coffee", name:"Choco Hazelnut", price:18000, img: "/chocohazelnut.jpg", bestseller:false },
  { id:16, category:"Non Coffee", name:"Lychee Butterfly", price:18000, img: "/lycheebutterfly.jpg", bestseller:false },
  { id:17, category:"Non Coffee", name:"Cookies & Cream", price:20000, img: "/cookies&cream.jpg", bestseller:false },
  { id:18, category:"Non Coffee", name:"Red Velvet", price:20000, img: "/redvelvet.jpg", bestseller:false },
  { id:19, category:"Non Coffee", name:"Strawberry Milk", price:20000, img: "/strawberrymilk.jpg", bestseller:false },
  { id:20, category:"Non Coffee", name:"Oreo Choco Milk", price:22000, img: "/oreochocolatemilk.jpg", bestseller:false },
  { id:21, category:"Non Coffee", name:"Matcha Latte", price:22000, img: "/matchalatte.jpg", bestseller:true },
  { id:22, category:"Non Coffee", name:"Strawberry Matcha", price:24000, img: "/strawberrymatcha.jpg", bestseller:false },
  { id:23, category:"Food", name:"Sosis", price:16000, img: "", bestseller:false },
  { id:24, category:"Food", name:"French Fries", price:16000, img: "", bestseller:false },
  { id:25, category:"Food", name:"Chicken Popcorn", price:18000, img: "", bestseller:true },
  { id:26, category:"Food", name:"Dimsum Kuah Keju", price:18000, img: "", bestseller:true },
  { id:27, category:"Food", name:"Cireng Kuah Keju", price:18000, img: "", bestseller:false },
];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<any[]>([]);
  
  // Modals & States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  
  // Note Modal
  const [noteModalItem, setNoteModalItem] = useState<any>(null);
  const [tempNote, setTempNote] = useState("");

  // Post-Checkout Status
  const [orderId, setOrderId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>("");

  // Form Data
  const [customerInfo, setCustomerInfo] = useState({ name: '', wa: '', email: '' });
  const [orderType, setOrderType] = useState('Dine In');
  const [paymentMethod, setPaymentMethod] = useState('QRIS');
  const [paymentProof, setPaymentProof] = useState<string | null>(null);

  const categories = ["All", "White Coffee", "Black Coffee", "Non Coffee", "Food"];
  const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  const filteredMenu = useMemo(() => {
    let items = activeCategory === "All" ? menuData : menuData.filter(m => m.category === activeCategory);
    return items.sort((a, b) => (b.bestseller === a.bestseller) ? 0 : b.bestseller ? 1 : -1);
  }, [activeCategory]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  };

  const handleOpenNote = (item: any) => {
    setNoteModalItem(item);
    setTempNote("");
  };

  const addToCart = (item: any, note: string = "") => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id && c.note === note);
      if (existing) return prev.map(c => (c.id === item.id && c.note === note) ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1, note }];
    });
    setNoteModalItem(null);
    showToast(`${item.name} masuk keranjang!`);
  };

  const addAddon = (name: string, price: number) => {
    const addonId = name === "Mineral Water" ? 991 : 992;
    addToCart({ id: addonId, name, price, category: "Addon", img: "" }, "");
  };

  const updateQty = (id: number, note: string, delta: number) => {
    setCart(prev => prev.map(c => (c.id === id && c.note === note) ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  };

  const totalCart = cart.reduce((sum, c) => sum + (c.price * c.qty), 0);
  const itemCount = cart.reduce((sum, c) => sum + c.qty, 0);

  // Kompresi Gambar agar Super Cepat
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Resize maksimal lebar 800px
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPaymentProof(canvas.toDataURL('image/jpeg', 0.6)); // Kualitas 60% (Super Ringan)
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const processOrder = async () => {
    if (!customerInfo.name || !customerInfo.wa) return showToast("Nama dan WhatsApp wajib diisi!");
    if (paymentMethod === 'QRIS' && !paymentProof) return showToast("Mohon upload bukti transfer QRIS!");
    
    setLoading(true);
    const initialStatus = paymentMethod === 'QRIS' ? 'Menunggu Verifikasi (QRIS)' : 'Menunggu Pembayaran (CASH)';
    
    const { data, error } = await supabase.from('orders').insert({
      customer_name: customerInfo.name,
      customer_whatsapp: customerInfo.wa,
      customer_email: customerInfo.email,
      order_type: orderType,
      payment_method: paymentMethod,
      total_price: totalCart,
      items: cart,
      status: initialStatus,
      payment_proof_url: paymentProof
    }).select('id').single();

    setLoading(false);
    if (error) {
      alert("Gagal memproses pesanan. Pastikan koneksi aman.");
      return;
    }

    setOrderId(data.id);
    setLiveStatus(initialStatus);
    setIsCheckoutOpen(false);
  };

  // Live Tracking Kasir
  useEffect(() => {
    if (!orderId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
      if (data && data.status !== liveStatus) {
        setLiveStatus(data.status);
      }
    }, 3000); // Cek tiap 3 detik
    return () => clearInterval(interval);
  }, [orderId, liveStatus]);

  // HALAMAN STRUK (LIVE STATUS)
  if (orderId) {
    const isSuccess = liveStatus === 'Selesai';
    const isRejected = liveStatus === 'Ditolak';

    return (
      <div className="min-h-screen bg-[#FDF6F0] p-6 flex items-center justify-center font-sans text-[#3E2723]">
        <div className="bg-white rounded-[2rem] p-10 shadow-lg max-w-md w-full text-center">
          <h2 className="text-4xl font-bold mb-2">Chōgō Cafe</h2>
          <p className="text-sm mb-6 text-[#8D7B68] font-medium uppercase tracking-widest">Detail Pesanan</p>
          
          {/* BANNER STATUS REAL-TIME */}
          <div className={`p-4 rounded-2xl mb-8 font-black uppercase tracking-widest text-sm transition-colors duration-500 flex flex-col items-center justify-center gap-2
            ${isSuccess ? 'bg-[#2D5A2D] text-white shadow-lg' : 
              isRejected ? 'bg-[#8A2E2E] text-white shadow-lg' : 
              'bg-[#FDF6F0] border border-[#D9A05B] text-[#D9A05B] animate-pulse'}`}>
            {isSuccess && <CheckCircle size={28} />}
            {isRejected && <AlertCircle size={28} />}
            <span>
              {isSuccess ? 'Lunas & Sedang Dibuat!' : 
               isRejected ? 'Pesanan Ditolak Kasir' : 
               liveStatus}
            </span>
          </div>

          <div className="text-left space-y-4 mb-8 bg-[#FDF6F0] p-6 rounded-2xl border border-[#EBE5D9]">
            <p className="flex justify-between border-b border-[#EBE5D9] pb-2"><strong>Nama:</strong> <span>{customerInfo.name}</span></p>
            <p className="flex justify-between border-b border-[#EBE5D9] pb-2"><strong>Tipe:</strong> <span>{orderType}</span></p>
            <p className="flex justify-between border-b border-[#EBE5D9] pb-2"><strong>Payment:</strong> <span>{paymentMethod}</span></p>
            <p className="flex justify-between text-xl font-black text-[#D9A05B] pt-2"><span>Total:</span> <span>{formatRp(totalCart)}</span></p>
          </div>
          
          <button onClick={() => window.location.reload()} className="mt-2 font-bold text-[#8D7B68] hover:text-[#3E2723] underline">Buat Pesanan Baru</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0] text-[#3E2723] font-sans pb-28 relative">
      
      {/* MICRO-INTERACTION TOAST */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#2D5A2D] text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* HEADER WEB */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#3E2723]"></div>
            <h1 className="text-2xl font-black tracking-tighter">CHŌGŌ COFFEE.</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-10">
        <div className="text-center mb-10">
          <h2 className="text-5xl font-black tracking-tight mb-6 uppercase">Explore Our Menu</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)} 
                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${activeCategory === cat ? 'bg-[#3E2723] text-white border-[#3E2723]' : 'bg-transparent text-[#3E2723] border-[#EBE5D9] hover:border-[#3E2723]'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMenu.map(item => (
            <div key={item.id} className="bg-white rounded-[1.5rem] p-3 flex flex-col shadow-sm border border-[#EBE5D9] transition-transform hover:-translate-y-1">
              <div className="aspect-square bg-[#FDF6F0] rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center">
                {item.bestseller && (
                  <div className="absolute top-2 left-2 bg-[#3E2723] text-white text-[9px] font-black px-2 py-1 rounded-full z-10 uppercase tracking-widest">Best Seller</div>
                )}
                {item.img ? (
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#8D7B68] font-bold opacity-50 text-xs">Chōgō</span>
                )}
              </div>
              <h3 className="font-black text-sm text-center uppercase tracking-wide leading-tight px-1">{item.name}</h3>
              <p className="font-black text-[#D9A05B] text-center mt-1 mb-3 text-xs">{formatRp(item.price)}</p>
              
              <button onClick={() => handleOpenNote(item)} className="mt-auto w-full py-2.5 rounded-xl border border-[#3E2723] text-[#3E2723] font-black text-[10px] uppercase tracking-widest hover:bg-[#3E2723] hover:text-white transition-colors">
                Order
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* FLOATING CART BUTTON (Dengan Efek Muncul & Bergetar saat nambah barang) */}
      {itemCount > 0 && (
        <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 right-1/2 translate-x-1/2 z-30 flex items-center justify-between gap-4 px-6 py-4 rounded-full shadow-2xl font-bold text-sm text-white bg-[#3E2723] border-[3px] border-white transition-all hover:scale-105 w-[90%] max-w-sm">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} />
            <span>{itemCount} Items</span>
          </div>
          <span className="text-[#D9A05B] font-black">{formatRp(totalCart)}</span>
        </button>
      )}

      {/* MODAL CATATAN SEBELUM MASUK KERANJANG */}
      {noteModalItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#3E2723]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl animation-fade-in">
            <h3 className="font-black text-xl uppercase mb-1">{noteModalItem.name}</h3>
            <p className="text-[#D9A05B] font-bold text-sm mb-4">{formatRp(noteModalItem.price)}</p>
            
            <input 
              type="text" 
              placeholder="Catatan: (Opsional) Cth: Less ice, No sugar" 
              className="w-full bg-[#FDF6F0] border border-[#EBE5D9] p-4 rounded-xl text-sm font-medium mb-6 outline-none focus:border-[#D9A05B]"
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
            />
            
            <div className="flex gap-3">
              <button onClick={() => setNoteModalItem(null)} className="flex-1 py-3 rounded-xl bg-[#FDF6F0] text-[#8D7B68] font-bold text-xs uppercase tracking-widest">Batal</button>
              <button onClick={() => addToCart(noteModalItem, tempNote)} className="flex-[2] py-3 rounded-xl bg-[#3E2723] text-white font-bold text-xs uppercase tracking-widest shadow-lg">Tambah ke Keranjang</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KERANJANG (DENGAN ADD-ONS) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#3E2723]/40 backdrop-blur-sm sm:p-4 sm:items-center">
          <div className="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-xl uppercase">Keranjang</h2>
              <button onClick={() => setIsCartOpen(false)} className="bg-[#FDF6F0] p-2 rounded-full text-[#3E2723]"><X size={20}/></button>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-3 pr-1 mb-4">
              {cart.map(c => (
                <div key={`${c.id}-${c.note}`} className="flex items-center justify-between bg-[#FDF6F0] p-4 rounded-2xl border border-[#EBE5D9]">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-sm uppercase leading-tight">{c.name}</p>
                    {c.note && <p className="text-[10px] text-[#8D7B68] font-bold mt-1 bg-white px-2 py-0.5 rounded-md inline-block border border-[#EBE5D9]">📝 {c.note}</p>}
                    <p className="text-[#D9A05B] font-black text-xs mt-1">{formatRp(c.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-[#EBE5D9]">
                    <button onClick={() => updateQty(c.id, c.note, -1)} className="p-1 text-[#3E2723]"><Minus size={14}/></button>
                    <span className="font-black text-xs w-4 text-center">{c.qty}</span>
                    <button onClick={() => updateQty(c.id, c.note, 1)} className="p-1 text-[#3E2723]"><Plus size={14}/></button>
                  </div>
                </div>
              ))}
            </div>

            {/* SEKSI ADD-ONS */}
            <div className="border-t border-[#EBE5D9] pt-4 mb-4">
              <p className="text-[10px] font-black text-[#8D7B68] uppercase tracking-widest mb-3">Sempurnakan Pesanan (Add-on)</p>
              <div className="flex gap-2">
                <button onClick={() => addAddon("Mineral Water", 4000)} className="flex-1 bg-white border border-[#EBE5D9] py-2 px-2 rounded-xl flex items-center justify-center gap-1 text-[10px] font-bold text-[#3E2723] hover:border-[#D9A05B] shadow-sm"><Plus size={12} className="text-[#D9A05B]"/> Mineral Water (4k)</button>
                <button onClick={() => addAddon("Extra Shot", 5000)} className="flex-1 bg-white border border-[#EBE5D9] py-2 px-2 rounded-xl flex items-center justify-center gap-1 text-[10px] font-bold text-[#3E2723] hover:border-[#D9A05B] shadow-sm"><Plus size={12} className="text-[#D9A05B]"/> Extra Shot (5k)</button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-[#3E2723]/10">
              <div className="flex justify-between font-black text-xl mb-4">
                <span>TOTAL:</span>
                <span>{formatRp(totalCart)}</span>
              </div>
              <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full py-4 rounded-xl bg-[#3E2723] text-white font-black uppercase tracking-widest hover:bg-[#D9A05B] transition-colors shadow-lg">
                Lanjut Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHECKOUT & QRIS */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3E2723]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] border border-[#EBE5D9]">
            <div className="flex justify-between items-center mb-6 border-b border-[#FDF6F0] pb-4">
              <h3 className="font-black text-xl uppercase">Selesaikan Pesanan</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="bg-[#FDF6F0] p-2 rounded-full text-[#3E2723]"><X size={20}/></button>
            </div>
            
            <div className="space-y-3 mb-6">
              <input type="text" placeholder="Nama Anda *" className="w-full bg-[#FDF6F0] text-[#3E2723] p-4 rounded-xl font-bold text-sm outline-none border border-[#EBE5D9] focus:border-[#D9A05B]" onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
              <input type="number" placeholder="Nomor WhatsApp *" className="w-full bg-[#FDF6F0] text-[#3E2723] p-4 rounded-xl font-bold text-sm outline-none border border-[#EBE5D9] focus:border-[#D9A05B]" onChange={e => setCustomerInfo({...customerInfo, wa: e.target.value})} />
            </div>
              
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={() => setOrderType('Dine In')} className={`py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border ${orderType === 'Dine In' ? 'bg-[#3E2723] text-white border-[#3E2723]' : 'bg-white text-[#8D7B68] border-[#EBE5D9]'}`}>Dine In</button>
              <button onClick={() => setOrderType('Take Away')} className={`py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border ${orderType === 'Take Away' ? 'bg-[#3E2723] text-white border-[#3E2723]' : 'bg-white text-[#8D7B68] border-[#EBE5D9]'}`}>Take Away</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => setPaymentMethod('QRIS')} className={`py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-all ${paymentMethod === 'QRIS' ? 'bg-[#2952E3] text-white border-[#2952E3] shadow-md' : 'bg-white text-[#8D7B68] border-[#EBE5D9]'}`}>QRIS</button>
              <button onClick={() => setPaymentMethod('CASH')} className={`py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-all ${paymentMethod === 'CASH' ? 'bg-[#2D5A2D] text-white border-[#2D5A2D] shadow-md' : 'bg-white text-[#8D7B68] border-[#EBE5D9]'}`}>CASH (Tunai)</button>
            </div>

            {/* QRIS ASLI CHOGO */}
            {paymentMethod === 'QRIS' && (
              <div className="mb-6 p-5 bg-[#FDF6F0] rounded-2xl border border-[#EBE5D9] text-center">
                <p className="font-bold text-xs mb-3 text-[#8D7B68]">Scan QRIS di bawah ini senilai <br/><span className="text-[#3E2723] text-xl font-black">{formatRp(totalCart)}</span></p>
                
                {/* PASTIKAN FOTO qris.jpg ADA DI FOLDER public/ */}
                <div className="w-48 h-48 bg-white mx-auto rounded-xl shadow-sm border border-[#EBE5D9] mb-4 flex items-center justify-center overflow-hidden p-2">
                  <img src="/qris.jpg" alt="QRIS Chogo" className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"} />
                </div>

                <label className="relative flex flex-col items-center justify-center w-full py-4 border-2 border-dashed border-[#D9A05B] rounded-xl cursor-pointer bg-white hover:bg-[#FDF6F0] transition-colors">
                  {paymentProof ? (
                    <div className="text-center text-[#2D5A2D] flex flex-col items-center">
                      <CheckCircle className="mb-1" size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Bukti Ter-upload!</span>
                    </div>
                  ) : (
                    <div className="text-center text-[#D9A05B] flex flex-col items-center">
                      <Upload className="mb-1" size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Upload Bukti (Wajib)</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}
            
            <button onClick={processOrder} disabled={loading} className="w-full py-4 rounded-xl bg-[#3E2723] text-white font-black uppercase tracking-widest shadow-xl flex justify-center items-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Buat Pesanan Sekarang'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
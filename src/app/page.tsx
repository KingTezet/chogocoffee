'use client';
import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import InstallPWAButton from '../components/InstallPWAButton';

// --- KOMPONEN ANIMASI SCROLL ---
const FadeUp = ({ children, delay = 0 }: { children: ReactNode, delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- DATA MENU ASLI CHOGO COFFEE (DENGAN RATING & BADGE CUSTOM) ---
const MENU_CATEGORIES = ['ALL', 'WHITE COFFEE', 'BLACK COFFEE', 'NON COFFEE', 'FOOD'];

const MENU_ITEMS = [
  // WHITE COFFEE
  { name: 'Latte', price: 'Rp 18.000', category: 'WHITE COFFEE', img: '/icedlatte.jpg', rating: '4.9', badge: '' },
  { name: 'Cappuccino', price: 'Rp 18.000', category: 'WHITE COFFEE', img: '/icedcappuccino.jpeg', rating: '4.9', badge: '' },
  { name: 'Chogo Classic Creamy', price: 'Rp 20.000', category: 'WHITE COFFEE', img: '/icedchogoclassiccreamy.jpg', rating: '4.9', badge: '' },
  { name: 'Aren Latte', price: 'Rp 20.000', category: 'WHITE COFFEE', img: '/icedarenlatte.jpg', rating: '5.0', badge: 'BEST SELLER' },
  { name: 'Butterscotch Latte', price: 'Rp 20.000', category: 'WHITE COFFEE', img: '/icedbutterscotchlatte.jpg', rating: '5.0', badge: 'BEST SELLER' },
  { name: 'Caramel Latte', price: 'Rp 22.000', category: 'WHITE COFFEE', img: '/icedcaramellatte.jpg', rating: '5.0', badge: 'BEST SELLER' },
  { name: 'Hazelnut Latte', price: 'Rp 22.000', category: 'WHITE COFFEE', img: '/icedhazelnutlatte.jpg', rating: '4.9', badge: '' },

  // BLACK COFFEE
  { name: 'Americano', price: 'Rp 15.000', category: 'BLACK COFFEE', img: '/icedamericano.jpg', rating: '4.9', badge: '' },
  { name: 'Lemon Americano', price: 'Rp 18.000', category: 'BLACK COFFEE', img: '/icedlemonamericano.jpg', rating: '4.9', badge: '' },
  { name: 'Peachberrycano', price: 'Rp 18.000', category: 'BLACK COFFEE', img: '/icedpeachberrycano.jpg', rating: '5.0', badge: 'BEST SELLER' },
  { name: 'V60', price: 'Rp 22.000', category: 'BLACK COFFEE', img: '/v60.jpg', rating: '4.9', badge: '' }, 

  // NON COFFEE
  { name: 'Lemon Tea', price: 'Rp 16.000', category: 'NON COFFEE', img: '/lemontea.jpg', rating: '4.9', badge: '' },
  { name: 'Choco Classic', price: 'Rp 16.000', category: 'NON COFFEE', img: '/chococlassic.jpg', rating: '4.9', badge: '' },
  { name: 'Choco Caramel', price: 'Rp 18.000', category: 'NON COFFEE', img: '/chococaramel.jpg', rating: '4.9', badge: '' },
  { name: 'Choco Hazelnut', price: 'Rp 18.000', category: 'NON COFFEE', img: '/chocohazelnut.jpg', rating: '5.0', badge: 'BEST SELLER' },
  { name: 'Lychee Butterfly', price: 'Rp 18.000', category: 'NON COFFEE', img: '/lycheebutterfly.jpg', rating: '5.0', badge: 'BEST SELLER' },
  { name: 'Cookies & Cream', price: 'Rp 20.000', category: 'NON COFFEE', img: '/cookies&cream.jpg', rating: '4.9', badge: '' },
  { name: 'Red Velvet', price: 'Rp 20.000', category: 'NON COFFEE', img: '/redvelvet.jpg', rating: '4.9', badge: '' },
  { name: 'Strawberry Milk', price: 'Rp 20.000', category: 'NON COFFEE', img: '/strawberrymilk.jpg', rating: '4.9', badge: '' },
  { name: 'Oreo Choco Milk', price: 'Rp 22.000', category: 'NON COFFEE', img: '/oreochocolatemilk.jpg', rating: '4.9', badge: '' },
  { name: 'Matcha Latte', price: 'Rp 22.000', category: 'NON COFFEE', img: '/matchalatte.jpg', rating: '5.0', badge: 'BEST SELLER' },
  { name: 'Strawberry Matcha', price: 'Rp 24.000', category: 'NON COFFEE', img: '/strawberrymatcha.jpg', rating: '4.9', badge: '' },

  // FOOD
  { name: 'Sosis', price: 'Rp 16.000', category: 'FOOD', img: '/food1.jpg', rating: '4.9', badge: '' },
  { name: 'French Fries', price: 'Rp 16.000', category: 'FOOD', img: '/food2.jpg', rating: '4.9', badge: '' },
  { name: 'Chicken Popcorn', price: 'Rp 18.000', category: 'FOOD', img: '/food3.jpg', rating: '5.0', badge: 'BEST SELLER' },
  { name: 'Dimsum Kuah Keju', price: 'Rp 18.000', category: 'FOOD', img: '/food4.jpg', rating: '5.0', badge: 'BEST SELLER' },
  { name: 'Cireng Kuah Keju', price: 'Rp 18.000', category: 'FOOD', img: '/food5.jpg', rating: '4.9', badge: '' },
];

const BEST_SELLERS = [
  {
    id: '01',
    title: 'Butterscotch Latte',
    subtitle: 'Creamy & Caramelized',
    desc: 'Perpaduan sempurna espresso pekat dengan manisnya sirup butterscotch yang creamy dan karamel yang lembut. Favorit para pecinta kopi susu kekinian.',
    img: '/icedbutterscotchlatte.jpg',
    badge: 'BEST WHITE COFFEE'
  },
  {
    id: '02',
    title: 'Peachberrycano',
    subtitle: 'Fruity & Refreshing',
    desc: 'Sensasi kopi hitam Americano yang menyegarkan dipadukan dengan manis dan asamnya buah peach serta berry. Sangat cocok untuk cuaca panas.',
    img: '/icedpeachberrycano.jpg',
    badge: 'BEST BLACK COFFEE'
  },
  {
    id: '03',
    title: 'Lychee Butterfly',
    subtitle: 'Sweet & Magical',
    desc: 'Kesegaran sirup leci berpadu dengan cantiknya warna alami teh bunga telang (butterfly pea). Minuman non-kopi yang cantik nan menyegarkan.',
    img: '/lycheebutterfly.jpg',
    badge: 'BEST NON COFFEE'
  },
  {
    id: '04',
    title: 'Strawberry Matcha',
    subtitle: 'Earthy Meets Fruity',
    desc: 'Harmoni rasa matcha premium Jepang yang earthy dengan manis asamnya selai stroberi asli. Kombinasi rasa dan warna yang sempurna.',
    img: '/strawberrymatcha.jpg',
    badge: 'BEST NON COFFEE'
  }
];

const FAQS = [
  { q: "APA YANG MEMBUAT CHŌGŌ COFFEE SPESIAL?", a: "Kami menggunakan biji kopi pilihan yang dipanggang sempurna dan diracik dengan takaran signature kami untuk menghasilkan rasa yang balance dan creamy." },
  { q: "APAKAH ADA PILIHAN NON-COFFEE?", a: "Tentu! Kami memiliki banyak varian Non-Coffee favorit seperti Matcha Latte, Red Velvet, dan aneka racikan Cokelat." },
  { q: "BISA PESAN UNTUK ACARA/CATERING?", a: "Sangat bisa! Silakan hubungi manajemen kami melalui Instagram @chogocoffee untuk pemesanan dalam jumlah besar." },
];

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [showAllMenu, setShowAllMenu] = useState(false);

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    setShowAllMenu(false); 
  };

  const filteredItems = MENU_ITEMS.filter(item => activeCategory === 'ALL' || item.category === activeCategory);
  
  const displayedItems = (activeCategory === 'ALL' && !showAllMenu) 
    ? filteredItems.slice(0, 8) 
    : filteredItems;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] font-sans text-[#3A2A1A] overflow-x-hidden selection:bg-[#C69C6D] selection:text-white" id="home">
      
      {/* 1. NAVBAR */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto animate-fade-in-down">
        <div className="text-2xl font-black tracking-tighter flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('home')}>
          <span className="w-6 h-6 rounded-full bg-[#3A2A1A] inline-block"></span>
          CHŌGŌ COFFEE.
        </div>
        <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest text-[#8C7A6B]">
          <button onClick={() => scrollToSection('home')} className="hover:text-[#3A2A1A] transition-colors">Home</button>
          <button onClick={() => scrollToSection('menu')} className="hover:text-[#3A2A1A] transition-colors">Menu</button>
          <button onClick={() => scrollToSection('story')} className="hover:text-[#3A2A1A] transition-colors">Story</button>
        </div>
        <div className="flex items-center gap-3">
          <InstallPWAButton />
          <button onClick={() => scrollToSection('menu')} className="bg-[#3A2A1A] text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#C69C6D] transition-all">
            Order Now
          </button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <div className="max-w-[95%] mx-auto mb-24">
        <div className="bg-[#3A2A1A] rounded-[48px] relative overflow-hidden px-8 pt-16 pb-20 md:p-20 flex flex-col items-center justify-center min-h-[85vh]">
          <h1 className="text-[18vw] leading-none font-black text-[#4A3623] absolute top-10 text-center uppercase tracking-tighter select-none z-0 opacity-50">
            CHŌGŌ
          </h1>
          <div className="absolute left-10 md:left-24 top-1/2 -translate-y-1/2 z-10 max-w-xl">
            <h2 className="text-white text-5xl md:text-[85px] font-black uppercase tracking-tighter leading-[0.85] mb-8 drop-shadow-lg">
              WHERE EVERY<br />BREW BEGINS
            </h2>
            <button onClick={() => scrollToSection('menu')} className="bg-white text-[#3A2A1A] px-10 py-5 rounded-full font-bold uppercase tracking-widest text-sm flex items-center gap-3 hover:bg-[#C69C6D] hover:text-white transition-all shadow-xl">
              Get Started <span className="text-xl">↗</span>
            </button>
          </div>
          {/* C. SOSOK BARISTA (FIX LAPTOP BESAR, HP PAS) */}
<div className="absolute bottom-0 left-0 w-full flex justify-center items-end z-20 pointer-events-none">
  <img 
    src="/hero.png" 
    alt="Barista" 
    className="w-[90%] max-w-[380px] md:max-w-[750px] h-auto max-h-[60vh] md:max-h-none object-contain object-bottom" 
  />
</div>
          <div className="absolute right-10 md:right-20 bottom-10 md:bottom-20 z-30 flex flex-col items-end bg-[#3A2A1A]/30 backdrop-blur-md p-4 rounded-3xl border border-white/10">
            <div className="flex gap-1 mb-2">
              {[1,2,3,4,5].map(star => <span key={star} className="text-[#C69C6D] text-2xl">★</span>)}
            </div>
            <p className="text-white font-bold text-xs tracking-widest uppercase opacity-80">5k+ Happy Customers</p>
          </div>
        </div>
      </div>

      {/* 3. MENU SECTION */}
      <div id="menu" className="max-w-7xl mx-auto px-6 mb-32 pt-10">
        <FadeUp>
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-center mb-8">
            Explore Our Menu
          </h2>
          
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {MENU_CATEGORIES.map((cat) => (
              <button 
                key={cat} 
                onClick={() => handleCategoryClick(cat)}
                className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300
                  ${activeCategory === cat 
                    ? 'bg-[#3A2A1A] text-white border-[#3A2A1A] shadow-lg' 
                    : 'bg-transparent text-[#8C7A6B] border-[#EBE5D9] hover:border-[#3A2A1A]'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </FadeUp>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {displayedItems.map((item, i) => (
            <FadeUp key={item.name} delay={(i % 8) * 50}>
              <div className="bg-white p-4 md:p-6 rounded-[32px] border border-[#EBE5D9] group hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  {/* Badge Best Seller muncul otomatis jika ada */}
                  {item.badge ? (
                    <span className="text-[9px] font-black tracking-widest uppercase bg-[#3A2A1A] px-2 py-1 rounded-full text-white">
                      {item.badge}
                    </span>
                  ) : (
                    <span className="text-[9px] font-black tracking-widest uppercase bg-[#F9F6F0] px-2 py-1 rounded-full text-[#C69C6D] invisible">
                      -
                    </span>
                  )}
                  <span className="text-[10px] font-bold flex items-center gap-1 text-[#3A2A1A]">★ {item.rating}</span>
                </div>
                <div className="w-full aspect-square bg-[#F9F6F0] rounded-[24px] mb-4 overflow-hidden shadow-inner relative">
                   <img 
                    src={item.img} 
                    alt={item.name} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    onError={(e) => { e.currentTarget.src = "https://placehold.co/400x400/E8DCC8/3A2A1A?text=Chogo+Coffee"; }}
                   />
                </div>
                <div className="text-center mt-auto">
                  <h3 className="text-sm md:text-md font-black uppercase tracking-tight mb-1 line-clamp-1">{item.name}</h3>
                  <p className="text-[#C69C6D] font-black text-sm mb-4">{item.price}</p>
                  <button className="w-full bg-[#FAF8F5] border border-[#EBE5D9] text-[#3A2A1A] py-3 rounded-xl font-black uppercase tracking-widest text-[10px] group-hover:bg-[#3A2A1A] group-hover:text-white transition-all">
                    Order Now
                  </button>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        {activeCategory === 'ALL' && filteredItems.length > 8 && (
          <FadeUp delay={100}>
            <div className="flex justify-center mt-12">
              <button 
                onClick={() => setShowAllMenu(!showAllMenu)}
                className="px-10 py-4 rounded-full border-2 border-[#3A2A1A] text-[#3A2A1A] font-black uppercase tracking-widest text-xs hover:bg-[#3A2A1A] hover:text-white transition-all duration-300"
              >
                {showAllMenu ? 'Show Less ↑' : 'View All Menu ↓'}
              </button>
            </div>
          </FadeUp>
        )}
      </div>

      {/* 4. STORY SECTION (FEATURE SPLIT) */}
      <div id="story" className="max-w-7xl mx-auto px-6 mb-32 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <FadeUp>
            <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
              Your Perfect Cup<br />Starts Here
            </h2>
            <p className="text-[#8C7A6B] font-medium text-lg mb-12 max-w-md">
              Dibuat dengan bahan baku berkualitas, diracik setiap hari untuk memastikan kesempurnaan di setiap tegukan.
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="w-12 h-12 rounded-full bg-[#EBE5D9] mb-4"></div>
                <h4 className="font-black uppercase tracking-tight mb-2">Premium Blend</h4>
                <p className="text-sm text-[#8C7A6B]">Biji kopi pilihan untuk rasa yang bold dan smooth.</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full bg-[#EBE5D9] mb-4"></div>
                <h4 className="font-black uppercase tracking-tight mb-2">Made by Order</h4>
                <p className="text-sm text-[#8C7A6B]">Diracik langsung saat dipesan agar selalu segar.</p>
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={300}>
            <div className="w-full aspect-square bg-[#E8DCC8] rounded-[48px] flex items-center justify-center border border-[#EBE5D9] overflow-hidden relative">
               <img src="/icedarenlatte.jpg" alt="Splash" className="w-full h-full object-cover scale-110" />
            </div>
          </FadeUp>
        </div>
      </div>

      {/* 5. HIGHLIGHT FEATURE CARDS (BEST SELLERS MULTIPLE) */}
      <div className="max-w-7xl mx-auto px-6 mb-32">
        <FadeUp>
          <div className="text-center mb-16">
            <p className="text-[#C69C6D] font-bold text-sm mb-3 uppercase tracking-[0.3em]">Signature Series</p>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
              Meet Our Heroes
            </h2>
          </div>
        </FadeUp>

        <div className="space-y-8">
          {BEST_SELLERS.map((item, index) => (
            <FadeUp key={item.id} delay={index * 100}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 md:p-10 rounded-[48px] border border-[#EBE5D9]">
                <div className={`rounded-[32px] aspect-square relative overflow-hidden group ${index % 2 !== 0 ? 'md:order-last' : ''}`}>
                  <img 
                    src={item.img} 
                    alt={item.title} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    onError={(e) => { e.currentTarget.src = "https://placehold.co/600x600/E8DCC8/3A2A1A?text=Best+Seller"; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80"></div>
                  <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                    <span className="font-black uppercase text-white tracking-widest text-xs bg-[#C69C6D] w-max px-3 py-1.5 rounded-full drop-shadow-md">
                      {item.badge}
                    </span>
                    <h3 className="text-3xl md:text-4xl font-black uppercase text-white tracking-tighter drop-shadow-lg w-3/4">
                      {item.subtitle}
                    </h3>
                  </div>
                </div>
                <div className="flex flex-col justify-center px-4 md:px-12 py-8">
                  <p className="text-[#C69C6D] font-black uppercase tracking-widest text-sm mb-4">No. {item.id}</p>
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-6">
                    {item.title}
                  </h2>
                  <p className="text-[#8C7A6B] font-medium text-lg mb-8 leading-relaxed">
                    {item.desc}
                  </p>
                  <button className="bg-[#3A2A1A] text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs w-max hover:bg-[#C69C6D] transition-colors">
                    Order Now ↗
                  </button>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>

      {/* 6. FAQ ACCORDION */}
      <div className="max-w-4xl mx-auto px-6 mb-32">
        <FadeUp>
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-center mb-16">
            Your Common Questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} onClick={() => setActiveFaq(activeFaq === i ? null : i)} className="bg-white border border-[#EBE5D9] p-6 rounded-[24px] cursor-pointer hover:border-[#C69C6D] transition-colors">
                <div className="flex justify-between items-center">
                  <h4 className="font-black uppercase tracking-tight text-lg">{faq.q}</h4>
                  <button className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${activeFaq === i ? 'bg-[#3A2A1A] text-white' : 'bg-[#F9F6F0] text-[#3A2A1A]'}`}>
                    {activeFaq === i ? '-' : '+'}
                  </button>
                </div>
                {activeFaq === i && (
                  <p className="mt-4 text-[#8C7A6B] font-medium">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </FadeUp>
      </div>

      {/* 7. FOOTER */}
      <div className="bg-[#3A2A1A] rounded-t-[48px] pt-20 px-8 md:px-20 overflow-hidden relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-white mb-20 relative z-10">
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tight mb-6 leading-none">
              Bring Fresh Natural<br/>Energy To Your Home
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-8 md:ml-auto">
            <div className="flex flex-col gap-4 text-xs font-bold uppercase tracking-widest text-white/70">
              <h4 className="text-white mb-2">Navigation</h4>
              <button onClick={() => scrollToSection('home')} className="hover:text-white text-left">Home</button>
              <button onClick={() => scrollToSection('menu')} className="hover:text-white text-left">Menu</button>
              <button onClick={() => scrollToSection('story')} className="hover:text-white text-left">Story</button>
            </div>
          </div>
        </div>
        <h1 className="text-[25vw] leading-[0.75] font-black text-[#4A3623] text-center uppercase tracking-tighter select-none relative z-0 translate-y-[20%]">
          CHŌGŌ
        </h1>
      </div>

    </div>
  );
}
'use client'

import { useEffect, useState } from 'react'

const LOCKED_FEATURES = [
  { label: 'Command Center', desc: 'Dashboard ERP terpusat' },
  { label: 'Kasir / POS', desc: 'Transaksi & cetak struk' },
  { label: 'Online Order', desc: 'Pemesanan & pembayaran via web' },
  { label: 'Manajemen Menu', desc: 'Kelola produk & harga' },
  { label: 'Absensi HR', desc: 'Masuk, pulang & shift staf' },
  { label: 'Slip Gaji Otomatis', desc: 'Payroll & dividen owner' },
  { label: 'Laba & Rugi', desc: 'Laporan keuangan real-time' },
  { label: 'Top Performers', desc: 'Ranking kasir & produktivitas' },
  { label: 'Program Loyalty', desc: 'Poin & reward pelanggan' },
  { label: 'Data Pelanggan', desc: 'CRM & riwayat transaksi' },
  { label: 'Manajemen Staf', desc: 'Profil, akses & peran' },
  { label: 'Log Aktivitas', desc: 'Audit trail seluruh sistem' },
]

export default function SuspendedPage() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --red:    #ff1a1a;
          --red2:   #cc0000;
          --red3:   #ff4d4d;
          --gold:   #c9a84c;
        }

        html, body {
          min-height: 100vh;
          background: #050505;
          font-family: 'DM Sans', sans-serif;
          color: #f0eef0;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        /* ── ANIMATED BG GRID ── */
        .bg-grid {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,26,26,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,26,26,0.05) 1px, transparent 1px);
          background-size: 44px 44px;
          animation: gridMove 12s linear infinite;
          pointer-events: none;
          z-index: 0;
        }
        @keyframes gridMove {
          0%   { background-position: 0 0; }
          100% { background-position: 44px 44px; }
        }

        /* ── TOP RED CORONA ── */
        .bg-corona {
          position: fixed;
          top: -350px; left: 50%;
          transform: translateX(-50%);
          width: 1000px; height: 700px;
          background: radial-gradient(ellipse at center, rgba(255,26,26,0.18) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
          animation: coronaPulse 5s ease-in-out infinite;
        }
        @keyframes coronaPulse {
          0%, 100% { opacity: 0.8; transform: translateX(-50%) scaleX(1); }
          50%       { opacity: 1;   transform: translateX(-50%) scaleX(1.08); }
        }

        /* ── PAGE WRAPPER ── */
        .page-wrapper {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 1.5rem;
          z-index: 1;
        }

        /* ── CARD OUTER (the glowing border container) ── */
        .card-outer {
          position: relative;
          width: 100%;
          max-width: 600px;
          border-radius: 16px;
          padding: 2px;
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.22,1,0.36,1);
        }
        .card-outer.show {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── LIQUID BORDER ANIMATION ── */
        /* Rotating conic gradient that simulates flowing red liquid */
        .card-outer::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 60deg,
            #ff0000 80deg,
            #ff4444 90deg,
            #ff0000 100deg,
            transparent 120deg,
            transparent 180deg,
            #cc0000 200deg,
            #ff2222 210deg,
            #cc0000 220deg,
            transparent 240deg,
            transparent 360deg
          );
          animation: liquidSpin 3s linear infinite;
          border-radius: 18px;
        }
        @keyframes liquidSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Second layer — offset for depth */
        .card-outer::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 19px;
          background: conic-gradient(
            from 180deg,
            transparent 0deg,
            transparent 40deg,
            rgba(255,0,0,0.4) 60deg,
            rgba(255,60,60,0.5) 70deg,
            rgba(255,0,0,0.4) 80deg,
            transparent 100deg,
            transparent 220deg,
            rgba(180,0,0,0.3) 240deg,
            rgba(255,20,20,0.4) 250deg,
            rgba(180,0,0,0.3) 260deg,
            transparent 280deg,
            transparent 360deg
          );
          animation: liquidSpin2 4.5s linear infinite;
          filter: blur(4px);
          z-index: -1;
        }
        @keyframes liquidSpin2 {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }

        /* ── CARD INNER ── */
        .card {
          position: relative;
          background: rgba(10, 6, 10, 0.97);
          border-radius: 14px;
          padding: 2.5rem 2.75rem 2.25rem;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
          border: 1px solid rgba(255,26,26,0.08);
        }

        /* Glass inner shimmer */
        .card-shimmer {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,100,100,0.6) 30%,
            rgba(255,255,255,0.15) 50%,
            rgba(255,100,100,0.6) 70%,
            transparent 100%
          );
        }

        /* ── HEADER BAR ── */
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255,26,26,0.12);
        }
        .sys-id {
          font-family: 'DM Mono', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.14em;
          color: rgba(180,100,100,0.7);
          text-transform: uppercase;
        }
        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,26,26,0.1);
          border: 1px solid rgba(255,26,26,0.4);
          border-radius: 4px;
          padding: 3px 10px;
          font-family: 'DM Mono', monospace;
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: #ff4d4d;
          text-transform: uppercase;
        }
        .status-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #ff1a1a;
          box-shadow: 0 0 8px #ff1a1a, 0 0 16px rgba(255,26,26,0.5);
          animation: blink 1.2s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }

        /* ── ICON ── */
        .icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px; height: 80px;
          background: rgba(255,26,26,0.07);
          border: 1px solid rgba(255,26,26,0.25);
          border-radius: 50%;
          margin: 0 auto 1.75rem;
          position: relative;
        }
        .icon-ring {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 1px solid rgba(255,26,26,0.15);
          animation: ringExpand 2.5s ease-out infinite;
        }
        .icon-ring2 {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 1px solid rgba(255,26,26,0.08);
          animation: ringExpand 2.5s ease-out infinite 1.25s;
        }
        @keyframes ringExpand {
          0%   { inset: -4px;  opacity: 0.8; }
          100% { inset: -28px; opacity: 0; }
        }
        .icon-wrap svg {
          color: #ff1a1a;
          filter: drop-shadow(0 0 10px #ff1a1a) drop-shadow(0 0 24px rgba(255,26,26,0.5));
        }

        /* ── HEADING ── */
        .heading {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(1.8rem, 4.5vw, 2.35rem);
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: #f0eef0;
          margin-bottom: 0.85rem;
          text-align: center;
        }
        .heading em {
          font-style: italic;
          color: #ff1a1a;
          text-shadow: 0 0 40px rgba(255,26,26,0.5);
        }

        .desc {
          font-size: 0.875rem;
          line-height: 1.75;
          color: #7a6a7a;
          text-align: center;
          margin-bottom: 1.5rem;
          font-weight: 300;
        }
        .desc strong { color: #b8aab8; font-weight: 500; }

        /* ── ALERT ── */
        .alert {
          background: rgba(255,26,26,0.07);
          border: 1px solid rgba(255,26,26,0.22);
          border-left: 2px solid #ff1a1a;
          border-radius: 6px;
          padding: 0.85rem 1rem;
          margin-bottom: 1.5rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.68rem;
          color: rgba(255,100,100,0.85);
          letter-spacing: 0.03em;
          line-height: 1.6;
        }

        /* ── DIVIDER ── */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,26,26,0.2), transparent);
          margin: 0 0 1.25rem;
        }

        /* ── FEATURE LABEL ── */
        .features-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.6rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(140,80,80,0.7);
          margin-bottom: 0.65rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .features-label::before, .features-label::after {
          content: ''; flex: 1;
          height: 1px; background: rgba(255,26,26,0.1);
        }

        /* ── FEATURES GRID ── */
        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          margin-bottom: 1.5rem;
        }
        .feature-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,26,26,0.1);
          border-radius: 6px;
          padding: 8px 28px 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }
        .feature-item::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 2px;
          background: rgba(255,26,26,0.35);
        }
        .feature-item::after {
          content: 'LOCKED';
          position: absolute;
          right: 5px; top: 50%;
          transform: translateY(-50%);
          font-family: 'DM Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.08em;
          color: rgba(255,26,26,0.3);
        }
        .feature-name {
          font-size: 0.73rem;
          font-weight: 500;
          color: #6a5a6a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .feature-desc {
          font-size: 0.62rem;
          color: #3a2a3a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 1px;
        }

        /* ── INFO BOX ── */
        .info-box {
          background: rgba(201,168,76,0.05);
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 8px;
          padding: 1rem 1.2rem;
          display: flex;
          gap: 0.85rem;
          align-items: flex-start;
        }
        .info-box-icon { color: var(--gold); flex-shrink: 0; margin-top: 2px; }
        .info-box-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(180,148,70,0.8);
          margin-bottom: 0.3rem;
        }
        .info-box-body {
          font-size: 0.82rem;
          color: #6a5a6a;
          font-weight: 300;
          line-height: 1.6;
        }
        .dev-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #c9a84c;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          border-bottom: 1px solid rgba(201,168,76,0.3);
          padding-bottom: 1px;
          transition: all 0.2s;
        }
        .dev-link:hover {
          color: #f0c860;
          border-bottom-color: rgba(240,200,96,0.7);
          text-shadow: 0 0 16px rgba(201,168,76,0.5);
        }

        /* ── FOOTER ── */
        .footer {
          margin-top: 2.25rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          color: rgba(100,60,60,0.5);
          text-align: center;
          text-transform: uppercase;
          opacity: 0;
          transition: opacity 0.8s ease 0.6s;
          z-index: 1;
        }
        .footer.show { opacity: 1; }
        .footer-sep { color: rgba(180,40,40,0.3); margin: 0 8px; }
      `}</style>

      {/* Background layers */}
      <div className="bg-grid" />
      <div className="bg-corona" />

      <div className="page-wrapper">
        <div className={`card-outer ${visible ? 'show' : ''}`}>
          <div className="card">
            <div className="card-shimmer" />

            {/* Header */}
            <div className="header-bar">
              <div className="sys-id">CHOGO-COFFEE / SYS · REF#CC-2024-001</div>
              <div className="status-pill">
                <span className="status-dot" />
                ACCESS REVOKED
              </div>
            </div>

            {/* Icon */}
            <div className="icon-wrap">
              <div className="icon-ring" />
              <div className="icon-ring2" />
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <line x1="12" y1="15" x2="12" y2="17"/>
              </svg>
            </div>

            {/* Heading */}
            <h1 className="heading">
              Akses Sistem<br />
              <em>Ditangguhkan</em>
            </h1>

            {/* Desc */}
            <p className="desc">
              Seluruh fitur operasional telah <strong>dikunci secara permanen</strong> karena
              tagihan lisensi SaaS belum diselesaikan. Sistem ini adalah
              <strong> properti intelektual eksklusif</strong> developer.
            </p>

            {/* Alert */}
            <div className="alert">
              PERINGATAN — Akses tidak sah ke sistem yang terkunci dapat dikenakan tindakan hukum sesuai ketentuan perjanjian lisensi perangkat lunak yang berlaku.
            </div>

            <div className="divider" />

            {/* Features */}
            <div className="features-label">12 Modul Terkunci</div>
            <div className="features-grid">
              {LOCKED_FEATURES.map((f) => (
                <div className="feature-item" key={f.label}>
                  <div style={{minWidth:0}}>
                    <div className="feature-name">{f.label}</div>
                    <div className="feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="divider" />

            {/* Info box */}
            <div className="info-box">
              <div className="info-box-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <div className="info-box-label">Pemilik & Developer Sistem</div>
                <div className="info-box-body">
                  Hubungi langsung untuk penyelesaian tagihan lisensi:&nbsp;
                  <a
                    href="https://instagram.com/sugihnugrahaa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dev-link"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                      <circle cx="12" cy="12" r="4"/>
                      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                    </svg>
                    Moch Sugih Nugraha
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`footer ${visible ? 'show' : ''}`}>
          CHOGO COFFEE SUPERAPP
          <span className="footer-sep">·</span>
          LICENSED SOFTWARE
          <span className="footer-sep">·</span>
          ALL RIGHTS RESERVED
          <span className="footer-sep">·</span>
          2024
        </div>
      </div>
    </>
  )
}
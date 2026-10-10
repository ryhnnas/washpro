import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Monitor,
  PackageCheck,
  ReceiptText,
  Search,
  Settings2,
  Shirt,
  Smartphone,
  Store,
  Users,
  Wallet,
  WashingMachine,
  X,
} from "lucide-react";
import "./LandingPage.css";

const previewTabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "cashier", label: "Kasir digital", icon: ReceiptText },
  { id: "tracking", label: "Tracking pesanan", icon: PackageCheck },
];
const orders = [
  {
    name: "Nadia Putri",
    initials: "NP",
    service: "Cuci + setrika",
    weight: "4 kg",
    price: "Rp32.000",
    status: "Dicuci",
    tone: "blue",
  },
  {
    name: "Rizky Pratama",
    initials: "RP",
    service: "Cuci express",
    weight: "3 kg",
    price: "Rp45.000",
    status: "Disetrika",
    tone: "gold",
  },
  {
    name: "Dewi Anggraini",
    initials: "DA",
    service: "Cuci + setrika",
    weight: "5 kg",
    price: "Rp40.000",
    status: "Siap diambil",
    tone: "green",
  },
];
const questions = [
  {
    question: "WashPro cocok untuk laundry seperti apa?",
    answer:
      "WashPro mendukung layanan kiloan dan satuan. Anda bisa mengatur layanan, harga, pelanggan, dan akses staf sesuai kebutuhan operasional laundry Anda.",
  },
  {
    question: "Apakah perlu memasang aplikasi?",
    answer:
      "Tidak. WashPro bisa dibuka langsung melalui browser di laptop, tablet, atau HP dengan koneksi internet. Anda tidak perlu memasang aplikasi tambahan.",
  },
  {
    question: "Apa yang terjadi setelah trial 7 hari?",
    answer:
      "Setelah masa trial berakhir, pilih paket langganan di aplikasi untuk melanjutkan penggunaan. Pembayaran dilakukan melalui QRIS, lalu bukti pembayaran diverifikasi oleh admin.",
  },
  {
    question: "Bagaimana cara kerja notifikasi WhatsApp?",
    answer:
      "Hubungkan gateway WhatsApp melalui pengaturan toko. Setelah terhubung, Anda dapat mengirim nota digital dan notifikasi status pesanan kepada pelanggan.",
  },
];

function Brand({ footer = false }) {
  return (
    <Link
      to="/"
      className={`wp-brand${footer ? " wp-brand-footer" : ""}`}
      aria-label="WashPro beranda"
    >
      <img
        className="wp-brand-icon"
        src="/logo.png"
        width="37"
        height="37"
        alt=""
      />
      <span>
        Wash<span className="wp-brand-pro">Pro</span>
        <span className="wp-brand-dot">.</span>
      </span>
    </Link>
  );
}

function ProductPreview({ activeTab, onTabChange }) {
  const tab = previewTabs.find((item) => item.id === activeTab);
  return (
    <div className="wp-preview-wrap" id="preview">
      <div className="wp-preview-label">
        <span /> Lebih rapi di belakang layar.
      </div>
      <div className="wp-product-window">
        <div className="wp-window-bar">
          <span className="wp-window-dots">
            <i />
            <i />
            <i />
          </span>
          <span>
            <Store size={11} /> Toko laundry Anda
          </span>
          <span className="wp-window-demo">Contoh tampilan</span>
        </div>
        <div className="wp-product-body">
          <aside className="wp-demo-sidebar" aria-label="Preview fitur">
            <div className="wp-demo-logo">
              <WashingMachine size={19} /> WashPro<span>.</span>
            </div>
            <span className="wp-demo-section">RUANG KERJA</span>
            {previewTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                aria-pressed={activeTab === id}
                className={activeTab === id ? "is-active" : ""}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
            <span className="wp-demo-nav">
              <Users size={15} /> Pelanggan
            </span>
            <span className="wp-demo-nav">
              <BarChart3 size={15} /> Laporan
            </span>
            <div className="wp-demo-sidebar-bottom">
              <Settings2 size={15} /> Pengaturan toko
            </div>
            <div className="wp-demo-owner">
              <span>AL</span>
              <div>
                Anda Laundry<small>Akun pemilik</small>
              </div>
            </div>
          </aside>
          <div className="wp-demo-main" aria-live="polite">
            <div className="wp-demo-topbar">
              <span>{tab.label}</span>
              <div>
                <Bell size={14} />
                <span>AL</span>
              </div>
            </div>
            <div className="wp-demo-content" key={activeTab}>
              {activeTab === "dashboard" && <DashboardPreview />}
              {activeTab === "cashier" && <CashierPreview />}
              {activeTab === "tracking" && <TrackingPreview />}
            </div>
          </div>
        </div>
      </div>
      <div className="wp-floating-receipt">
        <span className="wp-floating-icon">
          <Check size={17} />
        </span>
        <div>
          Semua tercatat.<small>Dari cucian masuk, sampai beres.</small>
        </div>
        <ReceiptText size={22} />
      </div>
      <div className="wp-preview-tabs" aria-label="Pilih preview fitur">
        {previewTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={activeTab === id}
            onClick={() => onTabChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="wp-preview-caption">
        <span>Ilustrasi produk · Data contoh</span>
        <span>
          Klik untuk menjelajahi fitur <ArrowRight size={12} />
        </span>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <>
      <div className="wp-demo-heading">
        <div>
          <h3>
            Selamat pagi, pemilik toko <span>☀</span>
          </h3>
          <p>Yuk, lihat kabar laundry Anda hari ini.</p>
        </div>
        <span className="wp-demo-date">
          Hari ini <ChevronDown size={11} />
        </span>
      </div>
      <div className="wp-demo-stats">
        <div className="wp-demo-stat wp-demo-stat-primary">
          <span>
            Pendapatan <Wallet size={14} />
          </span>
          <strong>Rp1.280.000</strong>
          <small>Ringkasan hari ini</small>
          <div className="wp-stat-bars">
            {[20, 36, 28, 46, 39, 58, 68].map((height, index) => (
              <i key={index} style={{ "--bar-height": `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="wp-demo-stat">
          <span>
            Pesanan masuk <ReceiptText size={14} />
          </span>
          <strong>
            32<span>pesanan</span>
          </strong>
          <small>Semua tercatat rapi</small>
        </div>
        <div className="wp-demo-stat">
          <span>
            Dalam proses <Clock3 size={14} />
          </span>
          <strong>
            18<span>pesanan</span>
          </strong>
          <small>Pantau setiap tahap</small>
        </div>
      </div>
      <div className="wp-demo-chart">
        <div className="wp-demo-card-title">
          <strong>Tren pendapatan</strong>
          <span>7 hari terakhir</span>
        </div>
        <div className="wp-chart-plot">
          <div className="wp-chart-labels">
            <span>1,5 jt</span>
            <span>1 jt</span>
            <span>500 rb</span>
          </div>
          <svg
            viewBox="0 0 440 104"
            preserveAspectRatio="none"
            role="img"
            aria-label="Ilustrasi grafik pendapatan selama tujuh hari"
          >
            <defs>
              <linearGradient id="wp-chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a365d" stopOpacity=".14" />
                <stop offset="100%" stopColor="#1a365d" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 17H440 M0 50H440 M0 83H440"
              fill="none"
              stroke="#edf0f4"
              strokeDasharray="4 4"
            />
            <path
              d="M0 85C24 85 37 54 64 54S103 71 130 68S169 28 200 34S246 61 273 49S315 27 338 34S373 10 400 15S427 14 440 4V104H0Z"
              fill="url(#wp-chart-fill)"
            />
            <path
              d="M0 85C24 85 37 54 64 54S103 71 130 68S169 28 200 34S246 61 273 49S315 27 338 34S373 10 400 15S427 14 440 4"
              fill="none"
              stroke="#1a365d"
              strokeWidth="2.7"
            />
            <circle
              cx="338"
              cy="34"
              r="4.5"
              fill="#eac85e"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div className="wp-chart-days">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      </div>
      <div className="wp-demo-orders">
        <div className="wp-demo-card-title">
          <strong>Pesanan terbaru</strong>
          <span>Ringkasan pesanan</span>
        </div>
        <div className="wp-order-table">
          <div className="wp-order-table-head">
            <span>Pelanggan</span>
            <span>Layanan</span>
            <span>Status</span>
            <span>Total</span>
          </div>
          {orders.map((order) => (
            <div className="wp-order-row" key={order.name}>
              <span>
                <i>{order.initials}</i>
                {order.name}
              </span>
              <span>{order.service}</span>
              <span>
                <b className={`wp-status wp-status-${order.tone}`}>
                  {order.status}
                </b>
              </span>
              <span>{order.price}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CashierPreview() {
  return (
    <>
      <div className="wp-demo-heading">
        <div>
          <h3>Pesanan baru, tinggal catat.</h3>
          <p>Layanan, berat, dan pembayaran dalam satu layar.</p>
        </div>
        <ReceiptText size={20} />
      </div>
      <div className="wp-cashier-customer">
        <span className="wp-demo-field-label">Pelanggan</span>
        <div>
          <Users size={16} />
          <span>
            Nadia Putri<small>Contoh pelanggan</small>
          </span>
          <Search size={14} />
        </div>
      </div>
      <div className="wp-service-options">
        <div className="is-selected">
          <Shirt size={23} />
          <strong>Cuci + setrika</strong>
          <span>Rp8.000 / kg</span>
          <CircleCheck size={14} />
        </div>
        <div>
          <WashingMachine size={23} />
          <strong>Cuci express</strong>
          <span>Rp15.000 / kg</span>
        </div>
      </div>
      <div className="wp-demo-summary">
        <div>
          <span>Cuci + setrika</span>
          <span>4 kg × Rp8.000</span>
        </div>
        <div>
          <strong>Total pesanan</strong>
          <strong>Rp32.000</strong>
        </div>
        <p>
          <CreditCard size={14} /> Tunai atau QRIS, sesuai pilihan pelanggan.
        </p>
      </div>
      <div className="wp-demo-note">
        <Check size={15} /> Nota digital siap dikirim lewat WhatsApp.
      </div>
    </>
  );
}

function TrackingPreview() {
  return (
    <>
      <div className="wp-demo-heading">
        <div>
          <h3>Setiap cucian, jelas statusnya.</h3>
          <p>Pantau pesanan tanpa mencari catatan satu per satu.</p>
        </div>
        <PackageCheck size={20} />
      </div>
      <div className="wp-tracking-summary">
        <span>
          <i className="wp-status-dot blue" /> Dicuci <strong>8</strong>
        </span>
        <span>
          <i className="wp-status-dot gold" /> Disetrika <strong>6</strong>
        </span>
        <span>
          <i className="wp-status-dot green" /> Siap diambil <strong>4</strong>
        </span>
      </div>
      <div className="wp-tracking-orders">
        {orders.map((order, index) => (
          <div key={order.name}>
            <div>
              <span className="wp-tracking-id">WP-00{index + 1}</span>
              <b className={`wp-status wp-status-${order.tone}`}>
                {order.status}
              </b>
            </div>
            <strong>{order.name}</strong>
            <p>
              {order.service} · {order.weight}
            </p>
            <div className="wp-tracking-progress">
              {["Diterima", "Dicuci", "Disetrika", "Siap"].map(
                (step, stepIndex) => (
                  <span
                    key={step}
                    className={stepIndex <= index + 1 ? "is-done" : ""}
                  >
                    <i />
                    <small>{step}</small>
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const contactPhone = import.meta.env.VITE_CONTACT_PHONE
    ?.replace(/\D/g, "")
    .replace(/^0/, "62");
  const contactUrl = contactPhone
    ? `https://wa.me/${contactPhone}?text=${encodeURIComponent("Halo WashPro, saya ingin bertanya tentang sistem POS untuk bisnis laundry saya.")}`
    : null;

  return (
    <div className="wp-landing">
      <a className="wp-skip-link" href="#main-content">
        Langsung ke konten
      </a>
      <header className="wp-header">
        <div className="wp-container wp-nav">
          <Brand />
          <nav
            className={`wp-nav-links${menuOpen ? " is-open" : ""}`}
            id="wp-navigation"
            aria-label="Navigasi utama"
          >
            <a href="#fitur" onClick={() => setMenuOpen(false)}>
              Fitur
            </a>
            <a href="#cara-kerja" onClick={() => setMenuOpen(false)}>
              Cara kerja
            </a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>
              FAQ
            </a>
            <Link className="wp-mobile-login" to="/login">
              Masuk ke akun
            </Link>
          </nav>
          <div className="wp-nav-actions">
            <Link className="wp-login" to="/login">
              Masuk
            </Link>
            <Link className="wp-button wp-button-small" to="/register">
              Coba gratis <ArrowUpRight size={15} />
            </Link>
            <button
              className="wp-menu-toggle"
              type="button"
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={menuOpen}
              aria-controls="wp-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
      </header>
      <main id="main-content">
        <section className="wp-hero" aria-labelledby="hero-title">
          <div className="wp-container wp-hero-grid">
            <div className="wp-hero-copy">
              <span className="wp-eyebrow">
                <span className="wp-live-dot" /> Aplikasi kasir laundry online
              </span>
              <h1 id="hero-title">
                Laundry beres.
                <br />
                Bisnis jadi
                <br />
                <span>lebih ringan.</span>
              </h1>
              <p>
                WashPro membantu bisnis laundry kiloan dan satuan mengelola
                transaksi, status cucian, dan laporan pendapatan. Semua rapi
                dalam satu aplikasi, biar Anda fokus mengembangkan usaha.
              </p>
              <div className="wp-hero-actions">
                <Link className="wp-button" to="/register">
                  Coba gratis 7 hari <ArrowUpRight size={18} />
                </Link>
                <a className="wp-text-link" href="#preview">
                  Lihat cara kerjanya <ArrowRight size={16} />
                </a>
              </div>
              <div className="wp-hero-reassurance">
                <span>
                  <Check size={14} /> Tanpa kartu kredit
                </span>
                <span>
                  <Check size={14} /> Langsung dari browser
                </span>
              </div>
              <div className="wp-hero-footnote">
                <span className="wp-device-icons">
                  <Monitor size={17} />
                  <Smartphone size={15} />
                </span>
                <span>
                  Di toko atau di perjalanan.
                  <br />
                  <strong>Bisnis tetap dalam pantauan.</strong>
                </span>
              </div>
            </div>
            <ProductPreview activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <div className="wp-container wp-hero-bottom">
            <span>DIBUAT UNTUK RITME LAUNDRY ANDA</span>
            <div>
              <span>
                <Shirt size={17} /> Kiloan & satuan
              </span>
              <span>
                <Users size={17} /> Pemilik & staf
              </span>
              <span>
                <Monitor size={17} /> Laptop, tablet & HP
              </span>
            </div>
            <a href="#fitur" aria-label="Jelajahi fitur WashPro">
              <ArrowDown size={19} />
            </a>
          </div>
        </section>
        <section
          className="wp-features wp-container"
          id="fitur"
          aria-labelledby="features-title"
        >
          <div className="wp-section-heading">
            <div>
              <span className="wp-kicker">
                SEDIKIT REPOT. LEBIH BANYAK KONTROL.
              </span>
              <h2 id="features-title">
                Satu tempat untuk
                <br />
                semua urusan laundry.
              </h2>
            </div>
            <p>
              Catatan lebih rapi, kerja tim lebih terarah.
              <br />
              Dari pesanan pertama hingga rekap di akhir hari.
            </p>
          </div>
          <div className="wp-feature-grid">
            <article className="wp-feature wp-feature-pos">
              <div className="wp-feature-top">
                <span className="wp-feature-icon">
                  <ReceiptText size={23} />
                </span>
                <span className="wp-feature-number">01 / KASIR</span>
              </div>
              <h3>
                Catat cepat.
                <br />
                Layani lebih dekat.
              </h3>
              <p>
                Pilih layanan kiloan atau satuan, hitung total otomatis, lalu
                kirim nota digital. Antrean jalan, catatan aman.
              </p>
              <div className="wp-mini-receipt">
                <div>
                  <span>
                    <WashingMachine size={15} /> WashPro
                  </span>
                  <span>NOTA DIGITAL</span>
                </div>
                <div>
                  <span>
                    Cuci + setrika <small>4 kg × Rp8.000</small>
                  </span>
                  <strong>Rp32.000</strong>
                </div>
                <div>
                  <span>Total pembayaran</span>
                  <strong>
                    Rp32.000 <CircleCheck size={15} />
                  </strong>
                </div>
              </div>
            </article>
            <article className="wp-feature wp-feature-tracking">
              <div className="wp-feature-top">
                <span className="wp-feature-icon">
                  <PackageCheck size={23} />
                </span>
                <span className="wp-feature-number">02 / TRACKING</span>
              </div>
              <h3>
                “Cucian saya
                <br />
                sudah sampai mana?”
              </h3>
              <p>
                Jawab dengan pasti. Status pesanan tercatat dari diterima,
                dicuci, disetrika, hingga siap diambil.
              </p>
              <div className="wp-feature-timeline">
                {[
                  { label: "Diterima", icon: Check },
                  { label: "Dicuci", icon: WashingMachine },
                  { label: "Disetrika", icon: Shirt },
                  { label: "Siap diambil", icon: PackageCheck },
                ].map(({ label, icon: Icon }, index) => (
                  <div key={label} className={index < 3 ? "is-complete" : ""}>
                    <span>
                      <Icon size={17} />
                    </span>
                    <small>{label}</small>
                  </div>
                ))}
              </div>
            </article>
            <article className="wp-feature wp-feature-compact">
              <span className="wp-feature-icon">
                <BarChart3 size={23} />
              </span>
              <div>
                <span className="wp-feature-number">03 / LAPORAN</span>
                <h3>Angka jelas, keputusan lebih pas.</h3>
                <p>
                  Pantau pendapatan, lihat tren transaksi, dan ekspor laporan ke
                  PDF atau Excel saat dibutuhkan.
                </p>
              </div>
            </article>
            <article className="wp-feature wp-feature-compact">
              <span className="wp-feature-icon">
                <Users size={23} />
              </span>
              <div>
                <span className="wp-feature-number">04 / PELANGGAN & TIM</span>
                <h3>Kenal pelanggan. Kompak satu tim.</h3>
                <p>
                  Simpan riwayat pelanggan, kelola kuota membership, dan atur
                  akses staf sesuai perannya.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section
          className="wp-how wp-container"
          id="cara-kerja"
          aria-labelledby="how-title"
        >
          <div className="wp-section-heading">
            <div>
              <span className="wp-kicker">MULAI DARI LANGKAH KECIL</span>
              <h2 id="how-title">
                Siap dipakai.
                <br />
                Tanpa ribet.
              </h2>
            </div>
            <Link className="wp-text-link" to="/register">
              Buka akun WashPro <ArrowUpRight size={18} />
            </Link>
          </div>
          <ol className="wp-steps">
            <li>
              <span className="wp-step-number">01</span>
              <Store size={27} />
              <h3>Daftarkan toko Anda</h3>
              <p>
                Buat akun pemilik dan lengkapi profil laundry. Mulai masa coba
                gratis 7 hari.
              </p>
            </li>
            <li>
              <span className="wp-step-number">02</span>
              <Settings2 size={27} />
              <h3>Atur sesuai cara kerja toko</h3>
              <p>
                Tambahkan layanan dan harga, lalu undang staf dengan akses yang
                sesuai.
              </p>
            </li>
            <li>
              <span className="wp-step-number">03</span>
              <ReceiptText size={27} />
              <h3>Terima pesanan pertama</h3>
              <p>
                Catat transaksi, pantau proses cucian, dan lihat pendapatan
                dalam dashboard.
              </p>
            </li>
          </ol>
        </section>
        <section
          className="wp-faq wp-container"
          id="faq"
          aria-labelledby="faq-title"
        >
          <div className="wp-faq-intro">
            <span className="wp-kicker">MASIH PENASARAN?</span>
            <h2 id="faq-title">
              Tanya dulu,
              <br />
              boleh banget.
            </h2>
            <p>Beberapa hal yang mungkin ingin Anda tahu sebelum mulai.</p>
            {contactUrl && (
              <a
                className="wp-text-link"
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ngobrol lewat WhatsApp <ArrowUpRight size={17} />
              </a>
            )}
          </div>
          <div className="wp-faq-list">
            {questions.map(({ question, answer }) => (
              <details key={question}>
                <summary>
                  {question}
                  <span>
                    <ChevronDown size={19} />
                  </span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="wp-cta wp-container" aria-labelledby="cta-title">
          <div className="wp-cta-inner">
            <div>
              <span className="wp-kicker">
                CUCIAN BOLEH NUMPUK. URUSAN BISNIS JANGAN.
              </span>
              <h2 id="cta-title">
                Bikin hari di laundry
                <br />
                terasa lebih ringan.
              </h2>
              <p>Mulai rapikan operasional toko Anda bersama WashPro.</p>
            </div>
            <div className="wp-cta-actions">
              <Link className="wp-button" to="/register">
                Mulai gratis 7 hari <ArrowUpRight size={19} />
              </Link>
              <span>
                <Check size={14} /> Tanpa kartu kredit
              </span>
            </div>
            <WashingMachine
              className="wp-cta-decoration"
              size={240}
              strokeWidth={0.7}
              aria-hidden="true"
            />
          </div>
        </section>
      </main>
      <footer className="wp-footer wp-container">
        <div className="wp-footer-main">
          <div>
            <Brand footer />
            <p>
              Urus laundry lebih rapi.
              <br />
              Punya waktu untuk hal yang berarti.
            </p>
          </div>
          <nav aria-label="Navigasi footer">
            <a href="#fitur">Fitur</a>
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#faq">FAQ</a>
            <Link to="/login">
              Masuk <ArrowUpRight size={14} />
            </Link>
          </nav>
        </div>
        <div className="wp-footer-bottom">
          <span>
            © {new Date().getFullYear()} WashPro. Semua hak dilindungi.
          </span>
          <span>Dibuat untuk bisnis laundry Indonesia.</span>
        </div>
      </footer>
      {contactUrl && (
        <a
          className="wp-contact"
          href={contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Hubungi WashPro di WhatsApp"
        >
          <MessageCircle size={23} />
          <span>Tanya WashPro</span>
        </a>
      )}
    </div>
  );
}

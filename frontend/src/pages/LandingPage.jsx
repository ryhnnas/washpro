import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LayoutDashboard, Users, PieChart, Truck, ShieldCheck, Zap } from 'lucide-react';
import heroMockup from '../assets/images/hero-mockup.png';
import featureMockup from '../assets/images/feature-mockup.png';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-secondary selection:bg-tertiary/30 selection:text-primary font-sans text-primary overflow-x-hidden">
      
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-secondary/80 backdrop-blur-md border-b border-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="WashPro Logo" className="w-10 h-10 object-contain" />
              <span className="text-2xl font-black tracking-tight text-primary">Wash<span className="text-tertiary">Pro</span></span>
            </div>

            {/* Nav Actions */}
            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="text-primary font-bold hover:text-primary-light transition-colors hidden sm:block px-2"
              >
                Masuk
              </Link>
              <Link 
                to="/register" 
                className="py-2.5 px-6 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition-all duration-300 shadow-md hover:shadow-primary/30 active:scale-95"
              >
                Buka Toko Gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Ornaments */}
        <div className="absolute top-1/4 left-0 w-[40vw] h-[40vw] bg-tertiary/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[50vw] h-[50vw] bg-primary/5 rounded-full blur-[120px] pointer-events-none translate-x-1/4 translate-y-1/4"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary-light font-semibold text-sm mb-8 border border-primary/10">
              <Zap size={16} className="text-tertiary" />
              Sistem Point of Sale Laundry #1 di Indonesia
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6">
              Kelola Bisnis Laundry Anda Semakin <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light border-b-4 border-tertiary">Brilian</span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600 mb-6 sm:mb-10 max-w-2xl mx-auto font-medium">
              Tingkatkan margin, pantau kasir, catat transaksi secara digital, dan layani pelanggan lebih cepat dengan WashPro web POS eksklusif.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/register" 
                className="w-full sm:w-auto premium-button text-lg px-8 py-4"
              >
                Mulai Sekarang <ArrowRight size={20} />
              </Link>
              <Link 
                to="/login"
                className="w-full sm:w-auto px-8 py-4 font-bold text-primary bg-white rounded-2xl border-2 border-slate-200 hover:border-primary/20 hover:bg-slate-50 transition-all shadow-sm"
              >
                Masuk ke Dashboard
              </Link>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-6 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={18} className="text-emerald-500" /> Tanpa Kartu Kredit</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={18} className="text-emerald-500" /> Setup 5 Menit</span>
            </div>
          </div>

          {/* Hero Image Mockup */}
          <div className="mt-20 relative mx-auto max-w-5xl perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-secondary via-transparent to-transparent z-10 top-1/2"></div>
            <img 
              src={heroMockup} 
              alt="WashPro Dashboard" 
              className="rounded-[2rem] border-4 border-white shadow-2xl shadow-primary/20 transform hover:-translate-y-2 transition-transform duration-700 ease-out z-0 relative"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black mb-4">Fitur Premium Tanpa Kompromi</h2>
            <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
              WashPro dirancang secara spesifik untuk memecahkan segala masalah operasional bisnis laundry Anda dari hulu ke hilir.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Feature Text/List */}
            <div className="space-y-8">
              <FeatureCard 
                icon={<LayoutDashboard size={24} />}
                title="Sistem Kasir (POS) Intuitif"
                desc="Proses transaksi dalam hitungan detik. Hitung kiloan, satuan, deposit, dan cetak struk tanpa delay."
              />
              <FeatureCard 
                icon={<Users size={24} />}
                title="Manajemen Pelanggan Otomatis"
                desc="Kirim resi digital via WhatsApp. Ketahui frekuensi cuci pelanggan setia Anda dengan CRM terintegrasi."
              />
              <FeatureCard 
                icon={<PieChart size={24} />}
                title="Laporan Keuangan Cerdas"
                desc="Laporan harian, mingguan, bulanan real-time. Tidak perlu repot rekap manual buku besar."
              />
              <FeatureCard 
                icon={<Truck size={24} />}
                title="Pelacakan Proses Real-Time"
                desc="Beri pelanggan kemampuan melacak pesanan mulai dari diterima, dicuci, disetrika, hingga siap diambil."
              />
            </div>
            
            {/* Feature Image */}
            <div className="relative">
              <div className="absolute inset-0 bg-tertiary/20 rounded-3xl rotate-3 scale-105 transition-transform duration-500 hover:rotate-6"></div>
              <img 
                src={featureMockup} 
                alt="POS Interface" 
                className="relative z-10 rounded-2xl border-4 border-white shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer CTA */}
      <footer className="bg-primary text-white py-20 relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-[50vw] h-[50vw] bg-tertiary/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center px-4 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-6">Siap Mengubah Skala Bisnis Anda?</h2>
          <p className="text-primary-black text-lg mb-10 max-w-xl mx-auto">
            Bergabunglah dengan pengusaha laundry lainnya menggunakan software POS paling modern yang ada saat ini.
          </p>
          <Link 
            to="/register" 
            className="premium-button inline-flex text-lg px-10 py-5 bg-tertiary text-primary hover:bg-white"
          >
            Daftar Sekarang Secara Gratis
          </Link>
          
          <div className="mt-20 pt-8 border-t border-primary-light text-center text-primary-black text-sm font-medium">
            &copy; {new Date().getFullYear()} WashPro. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a 
        href={`https://wa.me/${import.meta.env.VITE_CONTACT_PHONE || '6281234567890'}?text=${encodeURIComponent('Halo WashPro, saya ingin bertanya tentang sistem POS untuk bisnis laundry saya...')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white p-3.5 sm:p-4 rounded-full shadow-2xl hover:bg-[#1ebd59] hover:scale-105 active:scale-95 transition-all duration-300 group"
        aria-label="Hubungi kami di WhatsApp"
      >
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-out whitespace-nowrap text-sm font-extrabold pr-0 group-hover:pr-1">
          Hubungi Kami
        </span>
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.847.002-2.63-1.023-5.101-2.887-6.968C16.579 1.971 14.113 1.05 11.49 1.05c-5.44 0-9.866 4.415-9.869 9.85-.001 1.77.464 3.497 1.348 5.022L1.93 21.03l5.35-1.403.003-.003-.636-.473z"/>
          <path d="M16.732 13.753c-.3-.15-1.771-.875-2.046-.975-.276-.1-.476-.15-.676.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.266-.467-2.41-1.485-.89-.795-1.49-1.77-1.665-2.07-.175-.3-.02-.463.13-.613.135-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.625-.925-2.225-.244-.589-.48-.51-.66-.52-.17-.01-.365-.01-.56-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.27.495 1.7.632.717.227 1.37.195 1.885.118.574-.086 1.771-.725 2.021-1.399.25-.675.25-1.25.175-1.399-.075-.15-.275-.225-.575-.375z"/>
        </svg>
      </a>

    </div>
  );
}

// Sub-component
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="flex gap-5 p-6 rounded-3xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group cursor-default">
      <div className="flex-shrink-0 w-14 h-14 bg-secondary flex items-center justify-center rounded-2xl text-primary group-hover:bg-primary group-hover:text-tertiary transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-slate-500 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}

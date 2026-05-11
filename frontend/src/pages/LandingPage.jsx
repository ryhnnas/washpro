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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-light flex items-center justify-center text-white shadow-md shadow-primary/20">
                <ShieldCheck size={24} />
              </div>
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
          <p className="text-primary-light text-lg mb-10 max-w-xl mx-auto">
            Bergabunglah dengan pengusaha laundry lainnya menggunakan software POS paling modern yang ada saat ini.
          </p>
          <Link 
            to="/register" 
            className="premium-button inline-flex text-lg px-10 py-5 bg-tertiary text-primary hover:bg-white"
          >
            Daftar Sekarang Secara Gratis
          </Link>
          
          <div className="mt-20 pt-8 border-t border-primary-light text-center text-primary-light text-sm font-medium">
            &copy; {new Date().getFullYear()} WashPro SaaS. All rights reserved.
          </div>
        </div>
      </footer>

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

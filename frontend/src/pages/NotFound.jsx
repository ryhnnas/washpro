import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-[120px] font-black text-primary/10 leading-none mb-4 select-none">
          404
        </div>
        <h1 className="text-2xl font-black text-primary mb-3">Halaman Tidak Ditemukan</h1>
        <p className="text-slate-500 mb-8 font-medium leading-relaxed">
          Halaman yang Anda cari tidak ada atau sudah dipindahkan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
          >
            <Home size={18} /> Ke Beranda
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-primary font-bold rounded-2xl hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} /> Kembali
          </button>
        </div>
      </div>
    </div>
  );
}

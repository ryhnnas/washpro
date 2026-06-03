import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ErrorBoundary — Menangkap error render dan menampilkan fallback UI.
 * Mencegah crash seluruh aplikasi ketika satu komponen gagal render.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-6">
              <AlertTriangle size={32} className="text-rose-600" />
            </div>
            <h1 className="text-xl font-bold text-primary mb-2">
              Terjadi Kesalahan
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed mb-8">
              Halaman mengalami masalah. Silakan muat ulang.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-5 py-3 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-sm transition-colors"
              >
                Muat Ulang Halaman
              </button>
              <Link
                to="/dashboard"
                className="w-full px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors inline-block"
              >
                Kembali ke Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

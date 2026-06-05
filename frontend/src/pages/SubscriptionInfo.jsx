import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Clock, CreditCard, ArrowRight, CheckCircle, AlertTriangle, HelpCircle, Phone, Calendar, RefreshCw } from 'lucide-react';
import api from '../lib/axios';

const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const STATUS_CONFIG = {
  TRIAL: {
    label: 'Uji Coba Gratis (Trial)',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock,
    color: 'text-blue-600',
    desc: 'Anda sedang dalam masa uji coba gratis. Nikmati seluruh fitur POS tanpa batas.',
  },
  ACTIVE: {
    label: 'Aktif Berlangganan',
    badge: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    color: 'text-green-600',
    desc: 'Paket berlangganan Anda aktif. Seluruh fitur operasional dan analitik dapat diakses.',
  },
  PENDING_PAYMENT: {
    label: 'Menunggu Verifikasi Pembayaran',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
    color: 'text-amber-600',
    desc: 'Bukti transfer Anda sedang diverifikasi oleh Tim Admin (maks. 1x24 jam).',
  },
  EXPIRED: {
    label: 'Masa Aktif Berakhir',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: AlertTriangle,
    color: 'text-rose-600',
    desc: 'Masa aktif toko telah berakhir. Fitur POS saat ini terkunci. Silakan perpanjang langganan.',
  },
  SUSPENDED: {
    label: 'Akun Ditangguhkan',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: AlertTriangle,
    color: 'text-slate-600',
    desc: 'Akses toko ditangguhkan oleh Admin. Silakan hubungi layanan dukungan kami.',
  },
};

export default function SubscriptionInfo() {
  const [status, setStatus] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      const [statusRes, paymentsRes] = await Promise.all([
        api.get('/subscriptions/status'),
        api.get('/subscriptions/payments'),
      ]);
      setStatus(statusRes.data);
      setPayments(paymentsRes.data);
    } catch (err) {
      console.error('Gagal memuat data subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-slate-400">
        <RefreshCw size={28} className="animate-spin mr-3 text-primary" />
        <span className="font-bold text-lg text-primary">Memuat Informasi Langganan...</span>
      </div>
    );
  }

  const currentConfig = STATUS_CONFIG[status?.subscriptionStatus] || STATUS_CONFIG.TRIAL;
  const StatusIcon = currentConfig.icon;
  const isExpired = status?.subscriptionStatus === 'EXPIRED';
  const isPending = status?.subscriptionStatus === 'PENDING_PAYMENT';

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-tertiary/20 to-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary rounded-full text-xs font-black uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Informasi Langganan Toko
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
            {status?.businessName || 'Toko Saya'}
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            Kelola paket berlangganan, pantau sisa masa aktif, dan perbarui bukti pembayaran Anda dengan mudah untuk memastikan operasional laundry berjalan tanpa henti.
          </p>
        </div>

        <div className="z-10 w-full md:w-auto">
          <button
            onClick={() => navigate('/paywall')}
            className="premium-button w-full md:w-auto flex items-center justify-center gap-2 group shadow-xl shadow-primary/20"
          >
            <CreditCard size={18} />
            <span>{isExpired ? 'Berlangganan Sekarang' : isPending ? 'Cek Status Bayar' : 'Perpanjang Langganan'}</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Grid Status & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card Kiri: Status Langganan Saat Ini (2 Kolom di LG) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-100 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status Langganan</p>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${currentConfig.badge.split(' ')[0]} bg-opacity-20`}>
                    <StatusIcon size={24} className={currentConfig.color} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-primary">{currentConfig.label}</h2>
                    <span className={`inline-block text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${currentConfig.badge} mt-1`}>
                      {status?.subscriptionStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sisa Masa Aktif</p>
                {status?.daysRemaining !== null && status?.daysRemaining !== undefined ? (
                  <p className="text-2xl sm:text-3xl font-black text-primary">
                    {status.daysRemaining > 0 ? `${status.daysRemaining} Hari` : 'Berakhir'}
                  </p>
                ) : (
                  <p className="text-sm font-bold text-slate-400">-</p>
                )}
                {status?.subscriptionEndAt && (
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    s/d {new Date(status.subscriptionEndAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {status?.subscriptionStatus === 'TRIAL' && status?.trialEndAt && (
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Trial s/d {new Date(status.trialEndAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-3">
              <p className="text-sm font-bold text-primary flex items-center gap-2">
                <HelpCircle size={18} className="text-tertiary" /> Catatan Status:
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {currentConfig.desc}
              </p>
              {isExpired && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium">
                  🚨 Akses menu operasional (Kasir, Tracking, Laporan, dll) tidak dapat dibuka sampai pembayaran perpanjangan berhasil dikonfirmasi.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                  <Phone size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">WhatsApp Notifikasi</p>
                  <p className="text-sm font-black text-primary truncate">{status?.businessPhone || 'Belum diatur'}</p>
                  <p className="text-[11px] text-slate-400">Dapat diperbarui dari halaman Pengaturan Akun</p>
                </div>
              </div>

              <div className="bg-tertiary/10 rounded-2xl p-4 border border-tertiary/20 flex items-center gap-3">
                <div className="p-2.5 bg-tertiary/20 rounded-xl text-primary flex-shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Siklus Tagihan</p>
                  <p className="text-sm font-black text-primary">Bulanan / Tahunan</p>
                  <p className="text-[11px] text-slate-400">Fleksibel sesuai pilihan paket</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">
              Butuh bantuan atau konfirmasi instan? Hubungi nomor WhatsApp dukungan kami.
            </p>
            <button
              onClick={fetchSubscriptionData}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-light transition-colors"
            >
              <RefreshCw size={14} /> Refresh Status
            </button>
          </div>
        </div>

        {/* Card Kanan: Riwayat Pembayaran Terakhir */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-100 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-black text-primary flex items-center gap-2">
                <CreditCard size={20} className="text-tertiary" /> Riwayat Pembayaran
              </h2>
              <span className="text-xs font-bold text-slate-400">{payments.length} Transaksi</span>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <CreditCard size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">Belum Ada Riwayat</p>
                <p className="text-xs text-slate-400 mt-1">Riwayat pembayaran paket Anda akan muncul di sini setelah Anda melakukan konfirmasi transfer.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
                {payments.map((payment) => (
                  <div key={payment.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between gap-3 hover:border-slate-200 transition-all">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-primary truncate">{payment.plan?.name || 'Paket Langganan'}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {new Date(payment.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {payment.status === 'REJECTED' && payment.rejectionReason && (
                        <p className="text-[11px] text-rose-600 mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-100 font-medium">
                          Alasan: {payment.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-primary">{formatIDR(payment.amount)}</p>
                      <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-1 ${
                        payment.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        payment.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {payment.status === 'APPROVED' ? 'Disetujui' : payment.status === 'PENDING' ? 'Menunggu' : 'Ditolak'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => navigate('/paywall')}
              className="w-full py-3 bg-primary/5 hover:bg-primary/10 text-primary font-bold rounded-2xl transition-colors text-xs flex items-center justify-center gap-1.5"
            >
              <span>Upload Bukti Bayar Baru</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

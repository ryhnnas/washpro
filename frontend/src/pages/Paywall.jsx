import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, X, Loader2, Clock, Star, Shield, Zap, AlertCircle, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/axios';
import { generateDynamicQRIS } from '../utils/qrisHelper';

const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

export default function Paywall() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [status, setStatus] = useState(null);
  const [payments, setPayments] = useState([]);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);
  const [phone, setPhone] = useState('');
  const fileInputRef = useRef();
  const navigate = useNavigate();

  // Raw Static QRIS Payload (DANA Bisnis)
  const STATIC_QRIS_PAYLOAD = '00020101021126570011ID.DANA.WWW011893600915300040105002090004010500303UMI51440014ID.CO.QRIS.WWW0215ID10264697174030303UMI5204581253033605802ID5925Seblak Mledak Sindangsari6015Kabupaten Kunin6105455736304D373';
  
  const OWNER_BANK_INFO = {
    nama: 'WashPro',
    bank: 'QRIS DANA Bisnis',
    nomor: 'Nominal Otomatis',
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [plansRes, statusRes, paymentsRes] = await Promise.all([
          api.get('/subscriptions/plans'),
          api.get('/subscriptions/status'),
          api.get('/subscriptions/payments'),
        ]);
        setPlans(plansRes.data);
        setStatus(statusRes.data);
        setPayments(paymentsRes.data);
        if (statusRes.data?.businessPhone) setPhone(statusRes.data.businessPhone);
        if (plansRes.data.length > 0) setSelectedPlan(plansRes.data[0]);
      } catch (err) {
        console.error('Gagal fetch data paywall:', err);
      }
    };
    fetchAll();
  }, []);

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar (JPG, PNG, dll)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran gambar maksimal 5MB');
      return;
    }
    setErrorMsg('');
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setProofPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return setErrorMsg('Pilih paket terlebih dahulu');
    if (!proofFile) return setErrorMsg('Harap unggah bukti pembayaran');
    setLoading(true);
    setErrorMsg('');
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        await api.post('/subscriptions/pay', {
          planId: selectedPlan.id,
          proofOfPayment: base64,
          paymentMethod: 'QRIS_DANA',
          phone,
        });
        setSuccessMsg('Bukti pembayaran berhasil dikirim! Admin akan memverifikasi dalam 1x24 jam. Anda akan menerima notifikasi WhatsApp setelah dikonfirmasi.');
        setProofFile(null);
        setProofPreview(null);
        // Refresh data
        const [statusRes, paymentsRes] = await Promise.all([
          api.get('/subscriptions/status'),
          api.get('/subscriptions/payments'),
        ]);
        setStatus(statusRes.data);
        setPayments(paymentsRes.data);
      };
      reader.readAsDataURL(proofFile);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengirim bukti pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const hasPendingPayment = payments.some((p) => p.status === 'PENDING');

  const planIcons = [Zap, Star, Shield];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 sm:p-8">
      {/* Top Bar / Back Button */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-start">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all text-sm font-bold shadow-lg"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Dashboard</span>
        </button>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
          <Clock size={14} /> Berlangganan WashPro
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
          {status?.subscriptionStatus === 'EXPIRED'
            ? '⏰ Masa Aktif Anda Telah Berakhir'
            : status?.subscriptionStatus === 'PENDING_PAYMENT'
            ? '⏳ Menunggu Konfirmasi Admin'
            : '🚀 Pilih Paket Berlangganan'}
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          {status?.subscriptionStatus === 'PENDING_PAYMENT'
            ? 'Bukti pembayaran Anda sedang diverifikasi. Mohon tunggu konfirmasi dari Admin.'
            : 'Lanjutkan menggunakan WashPro POS tanpa batas. Aktifkan dengan QRIS DANA Bisnis — bayar langsung, tanpa potongan.'}
        </p>
      </div>

      {/* Status PENDING */}
      {hasPendingPayment && (
        <div className="max-w-2xl mx-auto mb-8 bg-amber-500/10 border border-amber-400/30 rounded-2xl p-5 flex gap-3 items-start">
          <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-bold">Pembayaran Sedang Diproses</p>
            <p className="text-amber-200/70 text-sm mt-1">Anda sudah mengirim bukti pembayaran. Admin sedang memverifikasi. Biasanya selesai dalam 1x24 jam. Anda akan menerima notifikasi WhatsApp setelah dikonfirmasi.</p>
          </div>
        </div>
      )}

      {!hasPendingPayment && (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Kolom Kiri: Pilih Paket + QRIS */}
          <div className="space-y-6">
            {/* Paket */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-4">1. Pilih Paket</h2>
              <div className="space-y-3">
                {plans.map((plan, idx) => {
                  const Icon = planIcons[idx % planIcons.length];
                  const isSelected = selectedPlan?.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-400 bg-blue-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500' : 'bg-white/10'}`}>
                            <Icon size={16} className="text-white" />
                          </div>
                          <div>
                            <p className="text-white font-bold">{plan.name}</p>
                            <p className="text-slate-400 text-xs">{plan.durationDays} hari masa aktif</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-black text-lg">{formatIDR(plan.price)}</p>
                          {isSelected && <div className="w-3 h-3 rounded-full bg-blue-400 ml-auto mt-1"></div>}
                        </div>
                      </div>
                      {Array.isArray(plan.features) && (
                        <div className="mt-3 grid grid-cols-1 gap-1">
                          {plan.features.map((f, fi) => (
                            <div key={fi} className="flex items-center gap-2 text-xs text-slate-300">
                              <CheckCircle size={12} className="text-green-400 flex-shrink-0" /> {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QRIS */}
            {selectedPlan && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-4">2. Scan QRIS & Transfer</h2>
                <div className="bg-white rounded-xl p-4 flex flex-col items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center">
                    <QRCodeSVG
                      value={generateDynamicQRIS(STATIC_QRIS_PAYLOAD, selectedPlan.price)}
                      size={200}
                      level="H"
                      includeMargin={true}
                      imageSettings={{
                        src: '/logo.png',
                        x: undefined,
                        y: undefined,
                        height: 36,
                        width: 36,
                        excavate: true,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-700 font-bold text-sm">{OWNER_BANK_INFO.nama}</p>
                    <p className="text-slate-500 text-xs">{OWNER_BANK_INFO.bank} · {OWNER_BANK_INFO.nomor}</p>
                  </div>
                </div>
                <div className="mt-3 bg-blue-500/10 border border-blue-400/20 rounded-xl p-3 text-center">
                  <p className="text-blue-300 text-sm">Transfer tepat sebesar</p>
                  <p className="text-white font-black text-2xl">{formatIDR(selectedPlan.price)}</p>
                  <p className="text-blue-300/60 text-xs mt-1">Gunakan kode unik transfer untuk mempermudah verifikasi</p>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Upload Bukti */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit">
              <h2 className="text-white font-bold text-lg mb-4">3. Upload Bukti Transfer</h2>

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !proofPreview && fileInputRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer min-h-52 flex flex-col items-center justify-center gap-3 ${
                  dragging ? 'border-blue-400 bg-blue-500/10' : 'border-white/20 hover:border-white/40 bg-white/5'
                } ${proofPreview ? 'p-2' : 'p-8'}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
                {proofPreview ? (
                  <div className="relative w-full">
                    <img src={proofPreview} alt="Bukti bayar" className="w-full rounded-lg max-h-64 object-contain" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setProofFile(null); setProofPreview(null); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-white/10 rounded-full">
                      <Upload size={24} className="text-slate-400" />
                    </div>
                    <p className="text-slate-300 font-medium text-center">Seret & lepas foto bukti di sini</p>
                    <p className="text-slate-500 text-sm text-center">atau klik untuk memilih file</p>
                    <p className="text-slate-600 text-xs">JPG, PNG, WEBP — maks. 5MB</p>
                  </>
                )}
              </div>

              {/* Error / Success */}
              {errorMsg && (
                <div className="mt-3 bg-red-500/10 border border-red-400/30 rounded-xl p-3 flex gap-2 items-start">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{errorMsg}</p>
                </div>
              )}
              {successMsg && (
                <div className="mt-3 bg-green-500/10 border border-green-400/30 rounded-xl p-3 flex gap-2 items-start">
                  <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-green-300 text-sm">{successMsg}</p>
                </div>
              )}

              {/* Input Nomor WA & Summary */}
              {selectedPlan && (
                <div className="mt-4 bg-white/5 rounded-xl p-4 space-y-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-bold mb-1.5">Nomor WhatsApp (Penerima Notifikasi)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-400 text-sm transition-colors"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Kami akan mengirimkan notifikasi WA ke nomor ini setelah pembayaran disetujui.</p>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <div className="flex justify-between text-sm text-slate-400 mb-1">
                      <span>Paket dipilih</span>
                      <span className="text-white font-semibold">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400 mb-3">
                      <span>Nominal transfer</span>
                      <span className="text-white font-bold">{formatIDR(selectedPlan.price)}</span>
                    </div>
                    <button
                      id="submit-payment-btn"
                      onClick={handleSubmit}
                      disabled={loading || !proofFile || !phone}
                      className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                      {loading ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Riwayat Pembayaran */}
            {payments.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-bold mb-3">Riwayat Pembayaran</h3>
                <div className="space-y-2">
                  {payments.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-white text-sm font-medium">{p.plan?.name}</p>
                        <p className="text-slate-500 text-xs">{new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-bold">{formatIDR(p.amount)}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          p.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                          p.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {p.status === 'APPROVED' ? 'Disetujui' : p.status === 'PENDING' ? 'Menunggu' : 'Ditolak'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

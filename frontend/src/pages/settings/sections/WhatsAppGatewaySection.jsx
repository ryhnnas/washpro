import { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import api from '../../../lib/axios';

export default function WhatsAppGatewaySection() {
  const [waStatus, setWaStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [phoneToPair, setPhoneToPair] = useState('');
  const [loading, setLoading] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [testResult, setTestResult] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaStatus(res.data);
      if (res.data?.status === 'connected') {
        setQrCode(null);
        setPairingCode(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let active = true;
    const pollStatus = async () => {
      try {
        const res = await api.get('/whatsapp/status');
        if (!active) return;
        setWaStatus(res.data);
        if (res.data?.status === 'connected') {
          setQrCode(null);
          setPairingCode(null);
        }
      } catch (error) {
        console.error(error);
      }
    };
    const timer = setInterval(() => { void pollStatus(); }, 5000);
    void pollStatus();
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleQR = async () => {
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/connect/qr');
      setQrCode(res.data.qr_code);
      setPairingCode(null);
    } catch (e) {
      alert(e.response?.data?.error || 'Gagal request QR');
    }
    setLoading(false);
  };

  const handlePairing = async () => {
    if (!phoneToPair) return alert('Masukkan nomor HP');
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/connect/pairing', { phoneNumber: phoneToPair });
      setPairingCode(res.data.pairing_code);
      setQrCode(null);
    } catch (e) {
      alert(e.response?.data?.error || 'Gagal request Pairing');
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Yakin ingin memutuskan koneksi WhatsApp?')) return;
    setLoading(true);
    try {
      await api.post('/whatsapp/disconnect');
      setWaStatus((prev) => ({ ...prev, status: 'disconnected' }));
      await fetchStatus();
    } catch {
      alert('Gagal disconnect');
    }
    setLoading(false);
  };

  const handleTest = async () => {
    if (!waTestPhone) return alert('Nomor HP wajib diisi');
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/test-message', { phone: waTestPhone });
      setTestResult(res.data);
    } catch (e) {
      setTestResult({ ok: false, error: e.response?.data?.error || e.message });
    }
    setLoading(false);
  };

  return (
    <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-emerald-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow lg:col-span-2" aria-labelledby="wa-gateway-heading">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
        <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><MessageCircle size={24} aria-hidden="true" /></div>
        <div>
          <h2 id="wa-gateway-heading" className="text-xl font-black text-primary">WhatsApp Gateway</h2>
          <p className="text-xs text-slate-500 font-bold">Kirim nota digital otomatis ke pelanggan (Multi-Device)</p>
        </div>
      </div>

      <div className="relative z-10">
        <div className="mb-6 flex items-center gap-3" aria-live="polite">
          <span className="font-bold text-slate-600 text-sm">Status:</span>
          {waStatus?.status === 'connected' ? (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={14} aria-hidden="true" /> Terhubung</span>
          ) : waStatus?.status === 'connecting' ? (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={14} aria-hidden="true" /> Menunggu Scan/Pairing</span>
          ) : (
            <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={14} aria-hidden="true" /> Terputus</span>
          )}
        </div>

        {waStatus?.status === 'connected' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-600">Terhubung ke: <span className="font-bold text-primary">{waStatus.detail?.push_name || waStatus.detail?.device_id || 'WhatsApp Device'}</span></p>
              <button type="button" onClick={handleDisconnect} disabled={loading} className="px-4 py-2 bg-rose-100 text-rose-600 hover:bg-rose-200 text-sm font-bold rounded-xl transition-colors">
                Putuskan Koneksi
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Send size={12} aria-hidden="true" /> Uji Coba Pengiriman</p>
              <div className="flex gap-2">
                <label htmlFor="wa-test-phone" className="sr-only">Nomor HP uji coba</label>
                <input
                  id="wa-test-phone"
                  value={waTestPhone}
                  onChange={(e) => setWaTestPhone(e.target.value)}
                  placeholder="08xxx (kirim tes)"
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-primary text-primary"
                />
                <button type="button" onClick={handleTest} disabled={loading} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                  Kirim Tes
                </button>
              </div>
              {testResult && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-xs font-bold ${testResult.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`} role="status" aria-live="polite">
                  {testResult.ok ? <CheckCircle2 size={14} className="mt-0.5" aria-hidden="true" /> : <AlertTriangle size={14} className="mt-0.5" aria-hidden="true" />}
                  <span>{testResult.ok ? 'Pesan berhasil dikirim.' : `Gagal: ${testResult.error || testResult.reason || 'Unknown'}`}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-4 text-center">
              <h3 className="font-bold text-slate-700 text-sm">Hubungkan via QR Code</h3>
              <p className="text-xs text-slate-500 font-medium">Buka WhatsApp &gt; Perangkat Taut &gt; Tautkan Perangkat</p>
              {qrCode ? (
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                  <img src={qrCode.startsWith('http') || qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code WhatsApp" className="w-48 h-48" />
                </div>
              ) : (
                <button type="button" onClick={handleQR} disabled={loading} className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-colors">
                  Tampilkan QR Code
                </button>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-4 text-center">
              <h3 className="font-bold text-slate-700 text-sm">Hubungkan via Nomor HP</h3>
              <p className="text-xs text-slate-500 font-medium">Gunakan metode ini jika Anda tidak bisa scan QR</p>
              {pairingCode ? (
                <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 w-full">
                  <p className="text-xs font-bold text-slate-500 mb-2">Kode Tautan Anda:</p>
                  <p className="text-3xl font-black text-primary tracking-widest">{pairingCode}</p>
                </div>
              ) : (
                <div className="w-full space-y-3 mt-4">
                  <label htmlFor="wa-pair-phone" className="sr-only">Nomor HP untuk pairing</label>
                  <input
                    id="wa-pair-phone"
                    value={phoneToPair}
                    onChange={(e) => setPhoneToPair(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-primary text-primary text-center font-bold"
                  />
                  <button type="button" onClick={handlePairing} disabled={loading} className="w-full px-5 py-2.5 bg-tertiary text-primary text-sm font-bold rounded-xl hover:bg-tertiary-hover transition-colors">
                    Dapatkan Kode
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { useState, useEffect } from 'react';
import { Check, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import superAdminApi from '../../../lib/superAdminAxios';

export default function WhatsAppTab() {
  const [waStatus, setWaStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [phoneToPair, setPhoneToPair] = useState('');
  const [loading, setLoading] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [testResult, setTestResult] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await superAdminApi.get('/superadmin/whatsapp/status');
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
        const res = await superAdminApi.get('/superadmin/whatsapp/status');
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
      const res = await superAdminApi.post('/superadmin/whatsapp/connect/qr');
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
      const res = await superAdminApi.post('/superadmin/whatsapp/connect/pairing', { phoneNumber: phoneToPair });
      setPairingCode(res.data.pairing_code);
      setQrCode(null);
    } catch (e) {
      alert(e.response?.data?.error || 'Gagal request Pairing');
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Yakin ingin memutuskan koneksi WhatsApp Superadmin?')) return;
    setLoading(true);
    try {
      await superAdminApi.post('/superadmin/whatsapp/disconnect');
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
      const res = await superAdminApi.post('/superadmin/whatsapp/test-message', { phone: waTestPhone });
      setTestResult(res.data);
    } catch (e) {
      setTestResult({ ok: false, error: e.response?.data?.error || e.message });
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-2">WhatsApp Gateway SuperAdmin</h1>
      <p className="text-slate-400 mb-8">Hubungkan nomor WhatsApp pusat platform untuk mengirimkan notifikasi penagihan/konfirmasi langganan ke Tenant.</p>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
        <div className="mb-6 flex items-center gap-3" aria-live="polite">
          <span className="font-bold text-slate-400 text-sm">Status:</span>
          {waStatus?.status === 'connected' ? (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold flex items-center gap-1"><Check size={14} aria-hidden="true" /> Terhubung</span>
          ) : waStatus?.status === 'connecting' ? (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={14} aria-hidden="true" /> Menunggu Scan/Pairing</span>
          ) : (
            <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-400/30 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={14} aria-hidden="true" /> Terputus</span>
          )}
        </div>

        {waStatus?.status === 'connected' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-300">Terhubung ke: <span className="font-bold text-white">{waStatus.detail?.push_name || waStatus.detail?.device_id || 'WhatsApp Device'}</span></p>
              <button type="button" onClick={handleDisconnect} disabled={loading} className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-sm font-bold rounded-xl transition-colors">
                Putuskan Koneksi
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><RefreshCw size={12} aria-hidden="true" /> Uji Coba Pengiriman</p>
              <div className="flex gap-2">
                <label htmlFor="sa-wa-test-phone" className="sr-only">Nomor HP uji coba</label>
                <input
                  id="sa-wa-test-phone"
                  value={waTestPhone}
                  onChange={(e) => setWaTestPhone(e.target.value)}
                  placeholder="08xxx (kirim tes)"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-indigo-500 text-white"
                />
                <button type="button" onClick={handleTest} disabled={loading} className="px-3 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-400 disabled:opacity-50 transition-colors whitespace-nowrap">
                  Kirim Tes
                </button>
              </div>
              {testResult && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-xs font-bold ${testResult.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`} role="status" aria-live="polite">
                  {testResult.ok ? <Check size={14} className="mt-0.5" aria-hidden="true" /> : <XCircle size={14} className="mt-0.5" aria-hidden="true" />}
                  <span>{testResult.ok ? 'Pesan berhasil dikirim.' : `Gagal: ${testResult.error || testResult.reason || 'Unknown'}`}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-4 text-center">
              <h3 className="font-bold text-white text-sm">Hubungkan via QR Code</h3>
              <p className="text-xs text-slate-400 font-medium">Buka WhatsApp &gt; Perangkat Taut &gt; Tautkan Perangkat</p>
              {qrCode ? (
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                  <img src={qrCode.startsWith('http') || qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code WhatsApp" className="w-48 h-48" />
                </div>
              ) : (
                <button type="button" onClick={handleQR} disabled={loading} className="mt-4 px-5 py-2.5 bg-indigo-500 text-white text-sm font-bold rounded-xl hover:bg-indigo-400 transition-colors">
                  Tampilkan QR Code
                </button>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-4 text-center">
              <h3 className="font-bold text-white text-sm">Hubungkan via Nomor HP</h3>
              <p className="text-xs text-slate-400 font-medium">Gunakan metode ini jika Anda tidak bisa scan QR</p>
              {pairingCode ? (
                <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 w-full text-slate-800">
                  <p className="text-xs font-bold text-slate-500 mb-2">Kode Tautan Anda:</p>
                  <p className="text-3xl font-black text-indigo-600 tracking-widest">{pairingCode}</p>
                </div>
              ) : (
                <div className="w-full space-y-3 mt-4">
                  <label htmlFor="sa-wa-pair-phone" className="sr-only">Nomor HP untuk pairing</label>
                  <input
                    id="sa-wa-pair-phone"
                    value={phoneToPair}
                    onChange={(e) => setPhoneToPair(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-indigo-500 text-white text-center font-bold"
                  />
                  <button type="button" onClick={handlePairing} disabled={loading} className="w-full px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold rounded-xl transition-colors">
                    Dapatkan Kode
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

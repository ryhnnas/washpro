import { useState, useEffect, useRef } from 'react';
import { Send, Save, User, Package, Calendar, Search, MessageCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../lib/axios';

export default function Cashier() {
  const [services, setServices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ serviceId: '', qty: '' }],
    paymentMethod: 'CASH'
  });
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'warning', message: string }
  const [membershipPreview, setMembershipPreview] = useState(null);

  const suggestionRef = useRef(null);

  const [showManualWA, setShowManualWA] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/services').catch(() => ({ data: [] })),
      api.get('/settings').catch(() => ({ data: null })),
      api.get('/customers?limit=100').catch(() => ({ data: { data: [] } }))
    ]).then(([resSvc, resSet, resCust]) => {
      setServices(resSvc.data);
      if(resSet.data) setSettings(resSet.data);
      setCustomers(resCust.data.data || []);
    });
    
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(formData.customerName.toLowerCase()) || 
    (c.phone && c.phone.includes(formData.customerName))
  );

  const handleSelectCustomer = (c) => {
     setFormData({
       ...formData,
       customerName: c.name,
       customerPhone: c.phone || '',
       customerAddress: c.address || ''
     });
     setShowSuggestions(false);
  };

  const itemRows = formData.items || [];
  const selectedItems = itemRows
    .map((row) => {
      const service = services.find((s) => s.id === row.serviceId);
      const qty = parseFloat(row.qty);
      return service && qty > 0 ? { service, qty } : null;
    })
    .filter(Boolean);
  const matchedCustomer = customers.find(
    (c) =>
      (formData.customerPhone && c.phone === formData.customerPhone) ||
      (!formData.customerPhone && c.name?.toLowerCase() === formData.customerName?.toLowerCase())
  );

  useEffect(() => {
    if (selectedItems.length > 0) {
      setTotalPrice(selectedItems.reduce((sum, item) => sum + item.qty * item.service.price, 0));

      const firstName = selectedItems[0].service.name.toLowerCase();
      let d = new Date();
      if (firstName.includes('hari')) {
        const days = parseInt(firstName.match(/(\d+)\s*hari/)?.[1] || 0);
        d.setDate(d.getDate() + days);
      } else if (firstName.includes('jam')) {
        const hours = parseInt(firstName.match(/(\d+)\s*jam/)?.[1] || 0);
        d.setHours(d.getHours() + hours);
      } else {
        d.setDate(d.getDate() + 1); // default 1 hari
      }
      setEndDate(d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB');
    } else {
      setTotalPrice(0);
      setEndDate('');
    }
  }, [JSON.stringify(formData.items), JSON.stringify(services)]);

  useEffect(() => {
    if (!selectedItems.length || !matchedCustomer?.membership?.isActive) {
      setMembershipPreview(null);
      return;
    }
    const itemPreview = selectedItems.map(({ service, qty }) => {
      const fullPrice = Math.round(qty * service.price);
      const balance = matchedCustomer.membership.balances?.find((b) => b.serviceId === service.id);
      const pkgItem = settings?.membershipPackage?.items?.find((i) => i.serviceId === service.id);
      const rate = Number(pkgItem?.deductionRate || 1);
      if (!balance || rate <= 0) {
        return {
          serviceName: service.name,
          unit: service.unit,
          eligible: false,
          reason: 'Tidak termasuk paket',
          coveredAmount: 0,
          payableAmount: fullPrice,
          consumedQuota: 0,
          remainingBefore: Number(balance?.remainingQty || 0),
        };
      }
      const requiredQuota = qty * rate;
      const consumedQuota = Math.min(requiredQuota, Number(balance.remainingQty || 0));
      const ratio = requiredQuota > 0 ? consumedQuota / requiredQuota : 0;
      const coveredAmount = Math.round(fullPrice * ratio);
      return {
        serviceName: service.name,
        unit: service.unit,
        eligible: consumedQuota > 0,
        reason: consumedQuota > 0 ? '' : 'Kuota habis',
        coveredAmount,
        payableAmount: Math.max(0, fullPrice - coveredAmount),
        consumedQuota,
        remainingBefore: Number(balance.remainingQty || 0),
      };
    });
    const coveredAmount = itemPreview.reduce((sum, item) => sum + item.coveredAmount, 0);
    const payableAmount = itemPreview.reduce((sum, item) => sum + item.payableAmount, 0);
    setMembershipPreview({
      hasMembership: true,
      eligible: itemPreview.some((i) => i.eligible),
      reason: itemPreview.some((i) => i.eligible) ? '' : 'Semua item tidak tercakup membership.',
      coveredAmount,
      payableAmount,
      items: itemPreview,
    });
  }, [JSON.stringify(selectedItems), matchedCustomer, settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItems.length || totalPrice <= 0) return alert("Tambah minimal 1 layanan dengan jumlah valid.");
    setLoading(true);
    setFeedback(null);
    setShowManualWA(false);
    try {
      const payload = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        paymentMethod: formData.paymentMethod,
        items: selectedItems.map(({ service, qty }) => ({
          serviceId: service.id,
          serviceName: service.name,
          qty,
        })),
        totalPrice,
      };
      const res = await api.post('/transactions', payload);
      const wa = res.data?.whatsapp;
      const bill = res.data?.membershipBreakdown;

      if (wa?.ok) {
        setFeedback({ type: 'success', message: 'Transaksi tersimpan & nota digital telah dikirim otomatis ke WhatsApp pelanggan.' });
      } else if (wa?.skipped) {
        const reasonMap = {
          NO_PHONE: 'Pelanggan tidak memiliki nomor HP.',
          WA_DISABLED: 'WhatsApp Gateway dinonaktifkan di Pengaturan.',
          WA_DISABLED_GLOBALLY: 'WhatsApp Gateway sedang dalam pemeliharaan.',
          NO_API_URL: 'URL Gateway belum dikonfigurasi.',
        };
        setFeedback({ type: 'warning', message: `Transaksi tersimpan. Auto-kirim WA dilewati: ${reasonMap[wa.reason] || wa.reason}.` });
        if (wa.reason !== 'NO_PHONE') {
          setShowManualWA(true);
          setLastTransaction({ ...payload, totalPrice, endDate });
        }
      } else if (wa?.error) {
        setFeedback({ type: 'error', message: `Transaksi tersimpan tapi WA gagal terkirim: ${wa.error}` });
        setShowManualWA(true);
        setLastTransaction({ ...payload, totalPrice, endDate });
      } else {
        setFeedback({ type: 'success', message: 'Transaksi berhasil disimpan.' });
      }
      if (bill?.activeMembershipId) {
        setFeedback({
          type: 'success',
          message: `Transaksi tersimpan. Membership digunakan (cover Rp ${Number(bill.coveredAmount || 0).toLocaleString('id-ID')}) dan dibayar Rp ${Number(bill.payableAmount || 0).toLocaleString('id-ID')}.`,
        });
      }

      setFormData({
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        items: [{ serviceId: '', qty: '' }],
        paymentMethod: 'CASH'
      });
      const resCust = await api.get('/customers?limit=100');
      setCustomers(resCust.data.data || []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Gagal menyimpan transaksi' });
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    const data = lastTransaction || formData;
    if (!data.customerPhone || data.totalPrice <= 0) return alert("Nomor HP dan total harga harus ada");
    let phone = data.customerPhone;
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    const lines = (data.items || [])
      .map((item, i) => `${i + 1}. ${item.serviceName} - ${item.qty}`)
      .join('\n');
    const msg = `Halo *Kak ${data.customerName || 'Pelanggan'}*,\n\nTerima kasih telah mempercayakan cucian Anda di WashPro.\n\n*Detail Order:*\n${lines}\n*Total Biaya: Rp ${data.totalPrice.toLocaleString('id-ID')}*\nEstimasi Selesai: ${data.endDate || 'Segera'}\n\nTerima kasih!`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2 tracking-tight">Terminal Kasir</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Buat transaksi baru — nota dikirim otomatis ke WhatsApp pelanggan.</p>
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-2xl border text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          feedback.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5"/> : <AlertTriangle size={18} className="shrink-0 mt-0.5"/>}
          <div className="flex-1">
            <div className="font-bold mb-1">{feedback.message}</div>
            {showManualWA && (
              <button 
                onClick={openWhatsApp}
                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-[#25D366] text-white rounded-lg font-bold hover:bg-[#1ebd59] transition-colors"
              >
                <Send size={14}/> Kirim WA Manual
              </button>
            )}
          </div>
          <button onClick={() => setFeedback(null)} className="ml-auto text-current/60 hover:text-current flex-shrink-0"><span className="sr-only">Tutup</span>×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        {/* Kolom 1 Kiri: Form Input */}
        <form id="cashier-form" onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
          
          {/* Data Pelanggan */}
          <div className="glass-card p-4 sm:p-6 md:p-8 rounded-3xl border-t-[4px] sm:border-t-[6px] border-t-primary relative overflow-visible">
             <div className="flex items-center gap-3 mb-6">
               <div className="p-2.5 bg-primary/10 text-primary rounded-xl"><User size={18} className="sm:w-5 sm:h-5"/></div>
               <h2 className="text-lg sm:text-xl font-bold text-primary">Info Pelanggan</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
               {settings?.requireCustomerName !== false && (
                 <div className="relative" ref={suggestionRef}>
                   <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Nama Lengkap (Ketik untuk mencari)</label>
                   <input 
                     placeholder="Hafiz Reyhan" 
                     required 
                     className="premium-input bg-secondary p-2 sm:p-3" 
                     value={formData.customerName} 
                     onChange={e => {
                       setFormData({...formData, customerName: e.target.value});
                       setShowSuggestions(true);
                     }} 
                     onFocus={() => setShowSuggestions(true)}
                     autoComplete="off"
                   />
                   
                   {/* Autocomplete Dropdown */}
                   {showSuggestions && formData.customerName.length > 0 && (
                     <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                       {filteredCustomers.length > 0 ? (
                         filteredCustomers.map(c => (
                           <div 
                             key={c.id} 
                             className="px-4 py-3 hover:bg-secondary cursor-pointer border-b border-slate-100 last:border-0"
                             onClick={() => handleSelectCustomer(c)}
                           >
                             <div className="font-bold text-primary">{c.name}</div>
                             <div className="text-xs text-slate-500">{c.phone || 'Tanpa no HP'} {c.address ? `- ${c.address}` : ''}</div>
                           </div>
                         ))
                       ) : (
                         <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                           <Search size={16}/> Pelanggan baru akan ditambahkan
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               )}
               
               {settings?.requireCustomerPhone !== false && (
                 <div>
                   <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Nomor WhatsApp</label>
                   <input placeholder="0812xxxxxx" required type="number" className="premium-input bg-secondary p-2 sm:p-3" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                 </div>
               )}
               {settings?.requireCustomerAddress && (
                 <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Alamat Pengiriman</label>
                   <textarea rows={2} placeholder="Jl. Sudirman No 2..." required className="premium-input bg-secondary resize-none p-2 sm:p-3" value={formData.customerAddress} onChange={e => setFormData({...formData, customerAddress: e.target.value})} />
                 </div>
               )}
             </div>
          </div>

          {/* Detais Pesanan */}
          <div className="glass-card p-4 sm:p-6 md:p-8 rounded-3xl border-t-[4px] sm:border-t-[6px] border-t-tertiary relative overflow-hidden">
             <div className="flex items-center gap-3 mb-6">
               <div className="p-2.5 bg-tertiary/20 text-tertiary-hover rounded-xl"><Package size={18} className="sm:w-5 sm:h-5"/></div>
               <h2 className="text-lg sm:text-xl font-bold text-primary">Rincian Layanan</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
               <div className="md:col-span-3 space-y-3">
                 {itemRows.map((row, idx) => {
                   const svc = services.find((s) => s.id === row.serviceId);
                   return (
                     <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                       <div className="col-span-7">
                         <label className="block text-xs font-bold text-slate-500 mb-1">Layanan #{idx + 1}</label>
                         <select
                           required
                           className="premium-input bg-secondary appearance-none truncate pr-10 p-2 sm:p-3"
                           value={row.serviceId}
                           onChange={(e) => {
                             const next = [...itemRows];
                             next[idx] = { ...next[idx], serviceId: e.target.value };
                             setFormData({ ...formData, items: next });
                           }}
                         >
                           <option value="" disabled>Pilih Layanan Laundry</option>
                           {services.map((s) => (
                             <option key={s.id} value={s.id}>{s.name} - Rp{s.price.toLocaleString()}/{s.unit}</option>
                           ))}
                         </select>
                       </div>
                       <div className="col-span-3">
                         <label className="block text-xs font-bold text-slate-500 mb-1">{svc?.type === 'SATUAN' ? 'Qty' : 'Kg'}</label>
                         <input
                           placeholder="0"
                           required
                           type="number"
                           step="0.01"
                           min="0.1"
                           className="premium-input bg-secondary font-black p-2 sm:p-3"
                           value={row.qty}
                           onChange={(e) => {
                             const next = [...itemRows];
                             next[idx] = { ...next[idx], qty: e.target.value };
                             setFormData({ ...formData, items: next });
                           }}
                         />
                       </div>
                       <div className="col-span-2 flex gap-2">
                         <button
                           type="button"
                           className="w-full h-12 sm:h-14 md:h-[60px] rounded-xl border border-slate-300 bg-white text-slate-500 font-black"
                           onClick={() => {
                             if (itemRows.length === 1) return;
                             setFormData({ ...formData, items: itemRows.filter((_, i) => i !== idx) });
                           }}
                         >
                           -
                         </button>
                         {idx === itemRows.length - 1 && (
                           <button
                             type="button"
                             className="w-full h-12 sm:h-14 md:h-[60px] rounded-xl border border-primary bg-primary text-white font-black"
                             onClick={() => setFormData({ ...formData, items: [...itemRows, { serviceId: '', qty: '' }] })}
                           >
                             +
                           </button>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
          </div>
        </form>

        {/* Kolom 2 Kanan: Receipt & Aksi */}
        <div className="lg:col-span-1 space-y-6">
           <div className="glass-card p-4 sm:p-6 md:p-8 rounded-3xl border-b-8 border-b-primary shadow-xl flex flex-col min-h-[350px] sm:min-h-[400px]">
              <div className="text-center pb-6 border-b-2 border-dashed border-slate-200 mb-6">
                 <h3 className="text-lg sm:text-xl md:text-2xl font-black text-primary tracking-widest">NOTA KASIR</h3>
                 <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">{new Date().toLocaleDateString('id-ID')}</p>
              </div>

              <div className="flex-1 space-y-4">
                 <div className="flex justify-between items-start">
                    <span className="text-xs sm:text-sm text-slate-500 font-bold">Pelanggan</span>
                    <span className="text-primary text-right font-black max-w-[150px] truncate text-xs sm:text-sm">{formData.customerName || '-'}</span>
                 </div>
                 <div className="flex justify-between items-start">
                    <span className="text-xs sm:text-sm text-slate-500 font-bold">Layanan</span>
                    <span className="text-primary text-right font-black text-xs sm:text-sm">{selectedItems.length} item</span>
                 </div>
                 {selectedItems.slice(0, 3).map(({ service, qty }, idx) => (
                   <div key={idx} className="flex justify-between items-start">
                      <span className="text-xs text-slate-500 font-bold">{service.name}</span>
                      <span className="text-primary text-right font-bold text-xs">{qty} {service.unit}</span>
                   </div>
                 ))}
                 {selectedItems.length > 3 && <div className="text-xs text-slate-400">+{selectedItems.length - 3} item lain</div>}
                 
                 {endDate && (
                  <div className="pt-4 mt-6 flex gap-3 text-primary-light items-start bg-blue-50 p-4 rounded-xl border-blue-100 border shadow-inner">
                      <Calendar size={24} className="shrink-0 mt-1" />
                      <div className="text-sm">
                        <span className="block font-bold mb-0.5 text-slate-500">Estimasi Selesai:</span>
                        <span className="font-bold text-lg tracking-wide">{endDate}</span>
                      </div>
                   </div>
                 )}
              </div>

              <div className="mt-8">
                 <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Metode Bayar</label>
                 <select className="w-full p-2 sm:p-3 bg-secondary border border-slate-200 rounded-xl outline-none text-primary font-bold shadow-inner" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                   <option value="CASH">Tunai (CASH)</option>
                   <option value="QRIS">Digital (QRIS)</option>
                 </select>
              </div>

              <div className="mt-6 pt-6 border-t-[3px] border-solid border-slate-200">
                 {membershipPreview?.hasMembership && (
                   <div className="mb-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800">
                     {membershipPreview.eligible ? (
                      <>
                        <div className="font-bold text-xs sm:text-sm">Membership aktif terdeteksi</div>
                        <div className="text-xs">Cover: <span className="font-bold">Rp {membershipPreview.coveredAmount.toLocaleString('id-ID')}</span> | Bayar: <span className="font-bold">Rp {membershipPreview.payableAmount.toLocaleString('id-ID')}</span></div>
                        {membershipPreview.items?.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="text-xs">{item.serviceName}: cover Rp {Number(item.coveredAmount || 0).toLocaleString('id-ID')} | bayar Rp {Number(item.payableAmount || 0).toLocaleString('id-ID')}</div>
                        ))}
                      </>
                     ) : (
                      <div className="font-bold text-xs sm:text-sm">{membershipPreview.reason}</div>
                     )}
                   </div>
                 )}
                 <div className="flex justify-between items-center whitespace-nowrap">
                    <span className="text-xs sm:text-sm text-slate-500 font-bold mb-1">Total Tagihan</span>
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary tracking-tighter">
                      Rp {totalPrice.toLocaleString('id-ID')}
                    </span>
                 </div>
              </div>
           </div>

           {/* Tombol Aksi */}
           <div className="w-full">
              <button 
                form="cashier-form"
                type="submit"
                disabled={loading || totalPrice <= 0}
                className="premium-button w-full text-sm md:text-lg disabled:opacity-50 disabled:cursor-not-allowed group h-14 md:h-16"
              >
                <Save size={24} className="group-hover:scale-110 transition-transform" /> {loading ? 'Menyimpan...' : 'Bayar Sekarang'}
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}

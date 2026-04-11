import { useState, useEffect, useRef } from 'react';
import { Send, Save, User, Package, Calendar, Search } from 'lucide-react';
import api from '../lib/axios';

export default function Cashier() {
  const [services, setServices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    serviceId: '',
    weight: '',
    paymentMethod: 'CASH'
  });
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  const suggestionRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/services').catch(() => ({ data: [] })),
      api.get('/settings').catch(() => ({ data: null })),
      api.get('/customers').catch(() => ({ data: [] }))
    ]).then(([resSvc, resSet, resCust]) => {
      setServices(resSvc.data);
      if(resSet.data) setSettings(resSet.data);
      setCustomers(resCust.data);
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

  const selectedService = services.find(s => s.id === formData.serviceId);

  useEffect(() => {
    if (selectedService && formData.weight) {
      const w = parseFloat(formData.weight);
      if (!isNaN(w)) setTotalPrice(w * selectedService.price);
      else setTotalPrice(0);

      const name = selectedService.name.toLowerCase();
      let d = new Date();
      if (name.includes('hari')) {
        const days = parseInt(name.match(/(\d+)\s*hari/)?.[1] || 0);
        d.setDate(d.getDate() + days);
      } else if (name.includes('jam')) {
        const hours = parseInt(name.match(/(\d+)\s*jam/)?.[1] || 0);
        d.setHours(d.getHours() + hours);
      } else {
        d.setDate(d.getDate() + 1); // default 1 hari
      }
      setEndDate(d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB');
    } else {
      setTotalPrice(0);
      setEndDate('');
    }
  }, [formData.serviceId, formData.weight, selectedService]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService || totalPrice <= 0) return alert("Pilih layanan dan masukkan jumlah!");
    setLoading(true);
    try {
      const payload = {
        ...formData,
        serviceName: selectedService.name,
        totalPrice
      };
      await api.post('/transactions', payload);
      alert("Transaksi Disimpan!");
      setFormData({
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        serviceId: '',
        weight: '',
        paymentMethod: 'CASH'
      });
      // Refresh customers to get new ones
      const resCust = await api.get('/customers');
      setCustomers(resCust.data);
    } catch (err) {
      alert("Gagal menyimpan transaksi");
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    if (!formData.customerPhone || totalPrice <= 0) return alert("Nomor HP dan total harga harus ada");
    let phone = formData.customerPhone;
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    const msg = `Halo *Kak ${formData.customerName || 'Pelanggan'}*,\n\nTerima kasih telah mempercayakan cucian Anda di WashPro.\n\n*Detail Order:*\nKet: ${selectedService?.name}\nQty: ${formData.weight} ${selectedService?.unit}\n*Total Biaya: Rp ${totalPrice.toLocaleString('id-ID')}*\nEstimasi Selesai: ${endDate || 'Segera'}\n\nTerima kasih!`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">Terminal Kasir</h1>
      <p className="text-slate-500 mb-8 font-medium">Buat transaksi baru dan cetak tagihan pelanggan.</p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Kolom 1 Kiri: Form Input */}
        <form id="cashier-form" onSubmit={handleSubmit} className="xl:col-span-2 space-y-8">
          
          {/* Data Pelanggan */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border-t-[6px] border-t-primary relative overflow-visible">
             <div className="flex items-center gap-3 mb-6">
               <div className="p-2.5 bg-primary/10 text-primary rounded-xl"><User size={20}/></div>
               <h2 className="text-xl font-bold text-primary">Info Pelanggan</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               {settings?.requireCustomerName !== false && (
                 <div className="relative" ref={suggestionRef}>
                   <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Nama Lengkap (Ketik untuk mencari)</label>
                   <input 
                     placeholder="Hafiz Reyhan" 
                     required 
                     className="premium-input bg-secondary" 
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
                   <input placeholder="0812xxxxxx" required type="number" className="premium-input bg-secondary" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                 </div>
               )}
               {settings?.requireCustomerAddress && (
                 <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Alamat Pengiriman</label>
                   <textarea rows={2} placeholder="Jl. Sudirman No 2..." required className="premium-input bg-secondary resize-none" value={formData.customerAddress} onChange={e => setFormData({...formData, customerAddress: e.target.value})} />
                 </div>
               )}
             </div>
          </div>

          {/* Detais Pesanan */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border-t-[6px] border-t-tertiary relative overflow-hidden">
             <div className="flex items-center gap-3 mb-6">
               <div className="p-2.5 bg-tertiary/20 text-tertiary-hover rounded-xl"><Package size={20}/></div>
               <h2 className="text-xl font-bold text-primary">Rincian Layanan</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
               <div className="md:col-span-2">
                 <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Pilih Paket</label>
                 <div className="relative">
                   <select required className="premium-input bg-secondary appearance-none truncate pr-10" value={formData.serviceId} onChange={e => setFormData({...formData, serviceId: e.target.value})}>
                     <option value="" disabled>Pilih Layanan Laundry</option>
                     {services.map(s => <option key={s.id} value={s.id}>{s.name} - Rp{s.price.toLocaleString()}/{s.unit}</option>)}
                   </select>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">
                   {selectedService?.type === 'SATUAN' ? 'Jumlah (Pcs)' : 'Berat (Kg)'}
                 </label>
                 <input placeholder="0" required type="number" step="0.01" min="0.1" className="premium-input bg-secondary text-2xl font-black font-mono h-[58px]" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
               </div>
               
             </div>
          </div>
        </form>

        {/* Kolom 2 Kanan: Receipt & Aksi */}
        <div className="xl:col-span-1 space-y-6">
           <div className="glass-card p-6 md:p-8 rounded-3xl border-b-8 border-b-primary shadow-xl flex flex-col min-h-[400px]">
              <div className="text-center pb-6 border-b-2 border-dashed border-slate-200 mb-6">
                 <h3 className="text-2xl font-black text-primary tracking-widest">NOTA KASIR</h3>
                 <p className="text-slate-500 text-sm mt-1 font-medium">{new Date().toLocaleDateString('id-ID')}</p>
              </div>

              <div className="flex-1 space-y-4">
                 <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-bold">Pelanggan</span>
                    <span className="text-primary text-right font-black max-w-[150px] truncate">{formData.customerName || '-'}</span>
                 </div>
                 <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-bold">Layanan</span>
                    <span className="text-primary text-right font-black">{selectedService?.name || '-'}</span>
                 </div>
                 <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-bold">Tarif Dasar</span>
                    <span className="text-primary text-right font-bold text-sm">Rp {selectedService?.price.toLocaleString() || '0'}</span>
                 </div>
                 <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-bold">Qty/Muatan</span>
                    <span className="text-primary text-right font-black text-lg bg-secondary px-2 rounded-md">{formData.weight ? `${formData.weight} ${selectedService?.unit || ''}` : '-'}</span>
                 </div>
                 
                 {endDate && (
                   <div className="pt-4 mt-6 border-t border-slate-200 flex gap-3 text-primary-light items-start bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-inner">
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
                 <select className="w-full p-3 bg-secondary border border-slate-200 rounded-xl outline-none text-primary font-bold shadow-inner" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                   <option value="CASH">Tunai (CASH)</option>
                   <option value="QRIS">Digital (QRIS)</option>
                 </select>
              </div>

              <div className="mt-6 pt-6 border-t-[3px] border-solid border-slate-200">
                 <div className="flex justify-between items-center whitespace-nowrap">
                    <span className="text-slate-500 font-bold mb-1">Total Tagihan</span>
                    <span className="text-3xl lg:text-4xl font-black text-primary tracking-tighter">
                      Rp {totalPrice.toLocaleString('id-ID')}
                    </span>
                 </div>
              </div>
           </div>

           {/* Tombol Aksi */}
           <div className="grid grid-cols-2 gap-4">
              <button 
                form="cashier-form"
                type="submit"
                disabled={loading || totalPrice <= 0}
                className="premium-button text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed group h-[60px]"
              >
                <Save size={20} className="group-hover:scale-110 transition-transform" /> {loading ? 'Menyimpan...' : 'Bayar'}
              </button>
              
              <button 
                type="button"
                onClick={openWhatsApp}
                disabled={totalPrice <= 0 || !formData.customerPhone}
                className="h-[60px] flex items-center justify-center gap-2 px-6 py-4 bg-[#25D366] hover:bg-[#1ebd59] shadow-lg shadow-[#25D366]/25 hover:shadow-[#25D366]/40 text-white font-extrabold rounded-2xl transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> WhatsApp
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}

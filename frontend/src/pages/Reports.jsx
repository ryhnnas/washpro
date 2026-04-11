import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Search } from 'lucide-react';
import api from '../lib/axios';

export default function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/transactions')
      .then(res => setTransactions(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter(t => 
    t.customerName?.toLowerCase().includes(search.toLowerCase()) || 
    t.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
    t.status.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = filtered.reduce((sum, t) => sum + t.totalPrice, 0);

  const downloadCSV = () => {
    let csv = "ID,Tanggal,Pelanggan,Layanan,Jumlah,Total Harga,Status,Metode Bayar\n";
    filtered.forEach(t => {
      csv += `${t.id},${new Date(t.startDate).toLocaleDateString('id-ID')},${t.customerName},${t.serviceName},${t.weight},${t.totalPrice},${t.status},${t.paymentMethod}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WashPro-Laporan-${new Date().getTime()}.csv`;
    a.click();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-tertiary" size={28}/> Laporan Kinerja
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Rekapitulasi komprehensif riwayat transaksi bisnis Anda.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
           {/* Pencarian */}
           <div className="relative w-full sm:w-64">
             <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
               <Search size={18} className="text-slate-400"/>
             </div>
             <input 
               type="text" 
               placeholder="Cari transaksi..."
               className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-primary outline-none text-primary transition-all text-sm font-bold shadow-sm"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
           </div>

           <button 
             onClick={downloadCSV}
             className="px-6 py-3 bg-primary hover:bg-primary-light text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-primary/20 whitespace-nowrap"
           >
             <Download size={18} /> Export Laporan (.CSV)
           </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden bg-white border border-slate-200">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-primary/5 text-primary font-black border-b border-slate-200">
              <tr>
                <th className="px-8 py-5">Tanggal Masuk</th>
                <th className="px-8 py-5">Identitas Pelanggan</th>
                <th className="px-8 py-5">Layanan</th>
                <th className="px-8 py-5 text-right">Nominal</th>
                <th className="px-8 py-5">Status Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-8 py-12 text-center text-slate-500 font-medium text-base">Tidak ada transaksi yang sesuai kriteria.</td>
                </tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-primary/[0.02] transition-colors group">
                  <td className="px-8 py-5 font-bold text-slate-600">{new Date(t.startDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</td>
                  <td className="px-8 py-5 font-black text-primary">{t.customerName || '-'}</td>
                  <td className="px-8 py-5">
                     <span className="font-bold text-primary">{t.serviceName}</span>
                     <span className="text-slate-400 font-semibold ml-2">({t.weight})</span>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-emerald-600">Rp {t.totalPrice.toLocaleString('id-ID')}</td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider ${t.status === 'SELESAI' || t.status === 'DIAMBIL' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {t.status}
                    </span>
                    <span className="ml-3 text-xs font-bold text-slate-500 px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200">{t.paymentMethod}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-8 bg-secondary border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div>
              <p className="text-primary font-black text-lg mb-1">Total Akumulasi Revenue</p>
              <p className="text-sm text-slate-500 font-medium">Berdasarkan hasil pencarian/filter di atas</p>
           </div>
           <div className="px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-2xl">
              <span className="text-2xl font-black text-primary tracking-tighter">Rp {totalRevenue.toLocaleString('id-ID')}</span>
           </div>
        </div>
      </div>
    </div>
  );
}

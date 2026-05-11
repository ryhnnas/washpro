import { useState, useEffect, useRef } from 'react';
import { Download, FileSpreadsheet, Search, ChevronLeft, ChevronRight, DollarSign, FileText } from 'lucide-react';
import api from '../lib/axios';
import DateFilter, { getDateRange } from '../components/DateFilter';

export default function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalTransactions: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(false);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Date Filter & Pagination
  const [dateFilter, setDateFilter] = useState('hari_ini');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Handle Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page strictly on date changes
  useEffect(() => {
    setPage(1);
  }, [dateFilter, customDate.start, customDate.end]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange(dateFilter, customDate);
        if (dateFilter === 'kustom' && (!customDate.start || !customDate.end)) {
          setLoading(false);
          return;
        }

        // Fetch Stats
        const statsRes = await api.get(`/dashboard/stats?startDate=${startDate}&endDate=${endDate}`);
        setStats(statsRes.data);

        // Fetch Paginated Transactions
        const txRes = await api.get(`/transactions?page=${page}&limit=50&search=${debouncedSearch}&startDate=${startDate}&endDate=${endDate}`);
        setTransactions(txRes.data.data || []);
        setTotalPages(txRes.data.pagination?.totalPages || 1);
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, debouncedSearch, dateFilter, customDate.start, customDate.end]);

  const downloadCSV = () => {
    import('lucide-react').then(() => {
      // Untuk MVP kita download daftar yang ada di layar. Idealnya panggil API getAll.
      let csv = "ID,Tanggal,Pelanggan,Layanan,Jumlah,Total Harga,Status,Metode Bayar\n";
      transactions.forEach(t => {
        csv += `${t.id},${new Date(t.startDate).toLocaleDateString('id-ID')},${t.customerName},${t.serviceName},${t.weight},${t.totalPrice},${t.status},${t.paymentMethod}\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WashPro-Laporan-${new Date().getTime()}.csv`;
      a.click();
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 lg:space-y-8">
      
      {/* Header & Filter */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-tertiary" size={28}/> Laporan Kinerja
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Rekapitulasi riwayat transaksi berdasarkan periode terpilih.</p>
        </div>
        
        <DateFilter 
          filter={dateFilter} 
          setFilter={setDateFilter} 
          customDate={customDate} 
          setCustomDate={setCustomDate} 
        />
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-5 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-20 sm:w-24 h-20 sm:h-24 bg-tertiary/10 rounded-full blur-2xl -mr-6 sm:-mr-8 -mt-6 sm:-mt-8 pointer-events-none"></div>
           <div className="w-12 sm:w-14 h-12 sm:h-14 shrink-0 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-primary">
             <DollarSign size={24} />
           </div>
           <div className="min-w-0">
             <p className="text-slate-500 font-bold text-[10px] sm:text-xs uppercase tracking-wider mb-0.5 sm:mb-1">Total Pendapatan Periode</p>
             <h2 className="text-lg sm:text-2xl font-black text-primary truncate">Rp {stats.totalRevenue.toLocaleString('id-ID')}</h2>
           </div>
        </div>
        <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-5 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-20 sm:w-24 h-20 sm:h-24 bg-primary/5 rounded-full blur-2xl -mr-6 sm:-mr-8 -mt-6 sm:-mt-8 pointer-events-none"></div>
           <div className="w-12 sm:w-14 h-12 sm:h-14 shrink-0 bg-tertiary/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-tertiary-hover">
             <FileText size={24} />
           </div>
           <div className="min-w-0">
             <p className="text-slate-500 font-bold text-[10px] sm:text-xs uppercase tracking-wider mb-0.5 sm:mb-1">Total Transaksi Selesai</p>
             <h2 className="text-lg sm:text-2xl font-black text-primary truncate">{stats.totalTransactions}</h2>
           </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3 sm:gap-4">
         {/* Pencarian */}
         <div className="relative w-full sm:w-auto flex-1 max-w-md">
           <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none">
             <Search size={16} className="text-slate-400"/>
           </div>
           <input 
             type="text" 
             placeholder="Cari nama pelanggan, resi..."
             className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl focus:border-primary outline-none text-primary transition-all text-xs sm:text-sm font-bold shadow-sm"
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
         </div>

         <button 
           onClick={downloadCSV}
           className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-primary hover:bg-primary-light text-white font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-primary/20 whitespace-nowrap text-xs sm:text-sm"
         >
           <Download size={16} /> Export Laporan Halaman
         </button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden bg-white border border-slate-200">
        <div className="overflow-x-auto no-scrollbar min-h-[300px] sm:min-h-[400px]">
          <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-primary/5 text-primary font-black border-b border-slate-200">
              <tr>
                <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-5">Tanggal Masuk</th>
                <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-5">Identitas Pelanggan</th>
                <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-5">Layanan</th>
                <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-5 text-right">Nominal</th>
                <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-5">Status Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-3 sm:px-6 md:px-8 py-8 sm:py-12 text-center text-slate-500 font-medium text-xs sm:text-base">Memuat transaksi...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-3 sm:px-6 md:px-8 py-8 sm:py-12 text-center text-slate-500 font-medium text-xs sm:text-base">Tidak ada transaksi yang sesuai kriteria.</td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-5 font-bold text-slate-600 text-xs sm:text-sm">{new Date(t.startDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</td>
                    <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-5 font-black text-primary truncate text-xs sm:text-sm">{t.customerName || '-'}</td>
                    <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-5 text-xs sm:text-sm">
                       <span className="font-bold text-primary">{t.serviceName}</span>
                       <span className="text-slate-400 font-semibold ml-1 sm:ml-2">({t.weight})</span>
                    </td>
                    <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-5 text-right font-black text-emerald-600 text-xs sm:text-sm">Rp {t.totalPrice.toLocaleString('id-ID')}</td>
                    <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-5">
                      <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-xs font-black uppercase tracking-wider ${t.status === 'SELESAI' || t.status === 'DIAMBIL' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t.status}
                      </span>
                      <span className="ml-1 sm:ml-3 text-[8px] sm:text-xs font-bold text-slate-500 px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-slate-100 rounded-md border border-slate-200">{t.paymentMethod}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Info */}
        <div className="p-3 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
           <span className="text-xs sm:text-sm font-bold text-slate-500">Halaman {page} dari {totalPages || 1}</span>
           <div className="flex items-center gap-2">
             <button 
               disabled={page <= 1}
               onClick={() => setPage(p => p - 1)}
               className="p-2 rounded-lg sm:rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-50 disabled:pointer-events-none transition-colors"
             >
               <ChevronLeft size={18} />
             </button>
             <button 
               disabled={page >= totalPages}
               onClick={() => setPage(p => p + 1)}
               className="p-2 rounded-lg sm:rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-50 disabled:pointer-events-none transition-colors"
             >
               <ChevronRight size={18} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}

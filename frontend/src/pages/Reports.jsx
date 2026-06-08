import { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, Search, ChevronLeft, ChevronRight, DollarSign, FileText, Loader2, TrendingUp } from 'lucide-react';
import api from '../lib/axios';
import DateFilter from '../components/DateFilter';
import { getDateRange } from '../utils/dateRange';
import toast, { Toaster } from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

export default function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalTransactions: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('hari_ini');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });
  const [page, setPage] = useState(1);

  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [topServices, setTopServices] = useState([]);

  const lineChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);

  // Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => { setPage(1); }, [dateFilter, customDate.start, customDate.end]);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange(dateFilter, customDate);
        if (dateFilter === 'kustom' && (!customDate.start || !customDate.end)) {
          setLoading(false);
          return;
        }

        const statsRes = await api.get(`/dashboard/stats?startDate=${startDate}&endDate=${endDate}`);
        setStats(statsRes.data);

        const txRes = await api.get(`/transactions?page=${page}&limit=50&search=${debouncedSearch}&startDate=${startDate}&endDate=${endDate}`);
        setTransactions(txRes.data.data || []);

        const chartRes = await api.get(`/reports/charts?startDate=${startDate}&endDate=${endDate}&search=${debouncedSearch}`);
        setDailyRevenue(chartRes.data.dailyRevenue || []);
        setStatusBreakdown(chartRes.data.statusBreakdown || []);
        setTopServices(chartRes.data.topServices || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, debouncedSearch, dateFilter, customDate]);

  // ==================== FUNGSI EXPORT PDF (SUDAH DIPERBAIKI) ====================
  const exportToPDF = async () => {
    setExportLoading(true);
    const toastId = toast.loading('Membuat Laporan PDF...');

    try {
      const [{ jsPDF }, , html2canvas] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        import('html2canvas'),
      ]);

      const { startDate, endDate } = getDateRange(dateFilter, customDate);
      const res = await api.get(`/transactions/export?search=${debouncedSearch}&startDate=${startDate}&endDate=${endDate}`);
      const { transactions, summary, serviceBreakdown, business } = res.data;

      const doc = new jsPDF();
      const businessName = business?.name || 'WashPro Laundry';

      doc.setFontSize(22);
      doc.setTextColor(26, 54, 93);
      doc.text(businessName, 14, 20);
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text('Laporan Transaksi Detail', 14, 30);
      doc.setFontSize(10);
      doc.text(`Periode: ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`, 14, 36);

      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text('RINGKASAN LAPORAN', 14, 50);

      doc.autoTable({
        startY: 55,
        head: [['Total Transaksi', 'Total Pendapatan', 'Rata-rata/Hari']],
        body: [[summary.totalTransactions, `Rp ${summary.totalRevenue.toLocaleString('id-ID')}`, `Rp ${summary.avgRevenuePerDay.toLocaleString('id-ID')}`]],
        theme: 'grid',
        headStyles: { fillColor: [26, 54, 93], textColor: 255 },
      });

      let currentY = doc.lastAutoTable.finalY + 15;

      const captureChart = async (ref) => {
        if (!ref?.current) return null;
        const canvas = await html2canvas.default(ref.current, { scale: 2, backgroundColor: '#ffffff' });
        return canvas.toDataURL('image/png', 1.0);
      };

      doc.setFont('helvetica', 'bold');
      doc.text('VISUALISASI PERFORMA', 14, currentY);
      currentY += 10;

      const [lineImg, pieImg, barImg] = await Promise.all([
        captureChart(lineChartRef),
        captureChart(pieChartRef),
        captureChart(barChartRef),
      ]);

      if (lineImg || pieImg) {
        if (lineImg) doc.addImage(lineImg, 'PNG', 14, currentY, 95, 55);
        if (pieImg) doc.addImage(pieImg, 'PNG', 115, currentY, 80, 55);
        currentY += 65;
      }

      if (barImg) {
        doc.addImage(barImg, 'PNG', 14, currentY, 182, 65);
        currentY += 75;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('TOP 5 LAYANAN TERLARIS', 14, currentY);
      doc.autoTable({
        startY: currentY + 5,
        head: [['Layanan', 'Qty', 'Pendapatan']],
        body: serviceBreakdown.slice(0, 5).map(s => [s.name, s.totalQty, `Rp ${s.totalRevenue.toLocaleString('id-ID')}`]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
      });

      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(26, 54, 93);
      doc.text('DAFTAR TRANSAKSI', 14, 22);

      doc.autoTable({
        startY: 30,
        head: [['Tanggal', 'Pelanggan', 'Layanan', 'Total', 'Status']],
        body: transactions.map(t => [
          new Date(t.startDate).toLocaleDateString('id-ID'),
          t.customerName || '-',
          t.serviceName,
          `Rp ${(t.payableAmount || t.totalPrice || 0).toLocaleString('id-ID')}`,
          t.status
        ]),
        headStyles: { fillColor: [26, 54, 93] },
        styles: { fontSize: 9 },
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')} | Halaman ${i}/${pageCount} | WashPro Reports`, 14, doc.internal.pageSize.height - 10);
      }

      doc.save(`Laporan_${businessName.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      toast.success('Laporan PDF berhasil diunduh!', { id: toastId });

    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat PDF', { id: toastId });
    } finally {
      setExportLoading(false);
    }
  };

  const exportToExcel = async () => {
    setExportLoading(true);
    const toastId = toast.loading('Membuat File Excel...');
    try {
      const XLSX = await import('xlsx');
      const { startDate, endDate } = getDateRange(dateFilter, customDate);
      const res = await api.get(`/transactions/export?search=${debouncedSearch}&startDate=${startDate}&endDate=${endDate}`);
      const { transactions, summary } = res.data;

      const wb = XLSX.utils.book_new();
      const summaryData = [
        ['RINGKASAN LAPORAN'],
        ['Periode', `${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`],
        [],
        ['Total Transaksi', summary.totalTransactions],
        ['Total Pendapatan', summary.totalRevenue],
        ['Rata-rata/Hari', summary.avgRevenuePerDay],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Ringkasan');

      const txData = transactions.map(t => ({
        Tanggal: new Date(t.startDate).toLocaleDateString('id-ID'),
        Pelanggan: t.customerName,
        Layanan: t.serviceName,
        Total: t.payableAmount ?? t.totalPrice,
        Status: t.status,
        Metode: t.paymentMethod
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txData), 'Transaksi');

      XLSX.writeFile(wb, `Laporan_${new Date().getTime()}.xlsx`);
      toast.success('Excel berhasil diunduh', { id: toastId });
    } catch {
      toast.error('Gagal export Excel', { id: toastId });
    } finally {
      setExportLoading(false);
    }
  };

  const COLORS = ['#1A365D', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileSpreadsheet className="text-tertiary" size={28} /> Laporan Kinerja
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Analisis mendalam performa bisnis</p>
        </div>
        <DateFilter filter={dateFilter} setFilter={setDateFilter} customDate={customDate} setCustomDate={setCustomDate} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-6 rounded-3xl flex items-center gap-5 bg-white border border-slate-200">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Pendapatan</p>
            <h2 className="text-3xl font-black text-primary">Rp {stats.totalRevenue.toLocaleString('id-ID')}</h2>
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl flex items-center gap-5 bg-white border border-slate-200">
          <div className="w-14 h-14 bg-tertiary/20 rounded-2xl flex items-center justify-center text-tertiary">
            <FileText size={28} />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Transaksi</p>
            <h2 className="text-3xl font-black text-primary">{stats.totalTransactions}</h2>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div ref={lineChartRef} className="glass-card p-6 rounded-3xl bg-white border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-primary" />
            <h3 className="font-bold text-lg text-primary">Pendapatan Harian</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#1A365D" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div ref={pieChartRef} className="glass-card p-6 rounded-3xl bg-white border border-slate-200">
          <h3 className="font-bold text-lg text-primary mb-4">Distribusi Status Transaksi</h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="count" nameKey="status">
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div ref={barChartRef} className="glass-card p-6 rounded-3xl bg-white border border-slate-200 lg:col-span-2">
          <h3 className="font-bold text-lg text-primary mb-4">Top 5 Layanan Terlaris</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={topServices}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalRevenue" fill="#10B981" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table + Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-md group">
          <input 
            type="text" 
            placeholder="Cari pelanggan..." 
            className="premium-input bg-white premium-input-icon py-3 text-sm" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={exportToPDF} disabled={exportLoading} className="flex-1 sm:flex-none px-6 py-3 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
            {exportLoading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />} Export PDF
          </button>
          <button onClick={exportToExcel} disabled={exportLoading} className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
            {exportLoading ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />} Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-3xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary/5 text-primary font-black">
              <tr>
                <th className="px-8 py-5 text-left">Tanggal</th>
                <th className="px-8 py-5 text-left">Pelanggan</th>
                <th className="px-8 py-5 text-left">Layanan</th>
                <th className="px-8 py-5 text-right">Nominal</th>
                <th className="px-8 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="5" className="px-8 py-12 text-center text-slate-500">Memuat data...</td></tr> :
                transactions.length === 0 ? <tr><td colSpan="5" className="px-8 py-12 text-center text-slate-500">Tidak ada data</td></tr> :
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-8 py-4 font-medium text-slate-600">{new Date(t.startDate).toLocaleDateString('id-ID')}</td>
                      <td className="px-8 py-4 font-bold text-primary">{t.customerName}</td>
                      <td className="px-8 py-4"><span className="font-bold">{t.serviceName}</span><span className="text-slate-400 ml-2">({t.weight})</span></td>
                      <td className="px-8 py-4 text-right font-black text-emerald-600">Rp {t.totalPrice.toLocaleString('id-ID')}</td>
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${['SELESAI', 'DIAMBIL'].includes(t.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}

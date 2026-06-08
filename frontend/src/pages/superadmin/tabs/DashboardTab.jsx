import { Store, CheckCircle, Clock, CreditCard, TrendingUp } from 'lucide-react';
import { formatIDR } from '../constants';

export default function DashboardTab({ stats }) {
  const cards = [
    { label: 'Total Toko', value: stats?.totalBusinesses, icon: Store, colorClass: 'bg-indigo-500/10 border-indigo-400/20 text-indigo-400' },
    { label: 'Toko Aktif', value: stats?.activeBusinesses, icon: CheckCircle, colorClass: 'bg-green-500/10 border-green-400/20 text-green-400' },
    { label: 'Masa Trial', value: stats?.trialBusinesses, icon: Clock, colorClass: 'bg-blue-500/10 border-blue-400/20 text-blue-400' },
    { label: 'Menunggu Konfirmasi', value: stats?.pendingPayments, icon: CreditCard, colorClass: 'bg-amber-500/10 border-amber-400/20 text-amber-400' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-2">Dashboard</h1>
      <p className="text-slate-400 mb-8">Ringkasan platform WashPro SaaS</p>
      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div key={item.label} className={`${item.colorClass} border rounded-2xl p-5`}>
                <ItemIcon size={20} className={`${item.colorClass.split(' ').pop()} mb-3`} aria-hidden="true" />
                <p className="text-3xl font-black text-white">{item.value}</p>
                <p className="text-slate-400 text-sm mt-1">{item.label}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-slate-500" role="status">Memuat statistik...</div>
      )}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp size={20} className="text-green-400" aria-hidden="true" />
          <h2 className="text-white font-bold">Pendapatan Bulan Ini</h2>
        </div>
        <p className="text-4xl font-black text-green-400">{formatIDR(stats?.monthlyRevenue || 0)}</p>
        <p className="text-slate-500 text-sm mt-1">Dari pembayaran yang telah disetujui</p>
      </div>
    </div>
  );
}

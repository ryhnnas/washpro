import {
  Store, CheckCircle, Clock, CreditCard, TrendingUp, TrendingDown, Hourglass, Ban,
  UserPlus, Percent, MessageSquare, Moon, AlertTriangle, AlertCircle, RefreshCw,
} from 'lucide-react';
import { formatIDR, STATUS_LABEL } from '../constants';

const TONES = {
  indigo: 'bg-indigo-500/10 border-indigo-400/20 text-indigo-400',
  green: 'bg-green-500/10 border-green-400/20 text-green-400',
  blue: 'bg-blue-500/10 border-blue-400/20 text-blue-400',
  red: 'bg-red-500/10 border-red-400/20 text-red-400',
  slate: 'bg-slate-500/10 border-slate-400/20 text-slate-300',
  amber: 'bg-amber-500/10 border-amber-400/20 text-amber-400',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFrom = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
const daysUntil = (iso) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS));
const monthLabel = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' });

function change(current, previous) {
  if (!previous) return current > 0 ? { text: 'Baru', up: true } : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { text: `${Math.abs(pct)}%`, up: pct >= 0 };
}

function Delta({ value, suffix }) {
  if (!value) return null;
  const Icon = value.up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${value.up ? 'text-green-400' : 'text-red-400'}`}>
      <Icon size={12} aria-hidden="true" /> {value.text} <span className="text-slate-500 font-medium">{suffix}</span>
    </span>
  );
}

function Panel({ title, icon, action, children }) {
  const PanelIcon = icon;
  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-white font-bold flex items-center gap-2">
          <PanelIcon size={18} className="text-slate-400" aria-hidden="true" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function DashboardTab({ stats, error, onRetry, onNavigate }) {
  const header = (
    <>
      <h1 className="text-2xl font-black text-white mb-2">Dashboard</h1>
      <p className="text-slate-400 mb-8">Ringkasan platform WashPro SaaS</p>
    </>
  );

  if (!stats) {
    return (
      <div>
        {header}
        {error ? (
          <div role="alert" className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-400/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
            <span className="flex items-center gap-2"><AlertCircle size={16} aria-hidden="true" /> {error}</span>
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 font-semibold underline">
              <RefreshCw size={14} aria-hidden="true" /> Coba lagi
            </button>
          </div>
        ) : (
          <div className="text-slate-500" role="status">Memuat statistik...</div>
        )}
      </div>
    );
  }

  const { statusCounts: sc, revenue, growth, conversion, expiringSoon, inactive, platform } = stats;
  const tiles = [
    { label: 'Total Toko', value: stats.totalBusinesses, icon: Store, tone: 'indigo' },
    { label: 'Aktif', value: sc.ACTIVE, icon: CheckCircle, tone: 'green' },
    { label: 'Trial', value: sc.TRIAL, icon: Clock, tone: 'blue' },
    { label: 'Kadaluarsa', value: sc.EXPIRED, icon: Hourglass, tone: 'red' },
    { label: 'Ditangguhkan', value: sc.SUSPENDED, icon: Ban, tone: 'slate' },
  ];
  const trendMax = Math.max(1, ...revenue.trend.map((m) => m.revenue));
  const sessions = platform.whatsappSessions;
  const oldestPendingDays = stats.oldestPendingPaymentAt ? daysFrom(stats.oldestPendingPaymentAt) : null;

  return (
    <div className="space-y-6">
      <div>{header}</div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-400/30 text-amber-300 rounded-2xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertCircle size={16} aria-hidden="true" /> {error}</span>
          <button type="button" onClick={onRetry} className="font-semibold underline">Muat ulang</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {tiles.map((item) => {
          const TileIcon = item.icon;
          return (
            <div key={item.label} className={`${TONES[item.tone]} border rounded-2xl p-5`}>
              <TileIcon size={20} className="mb-3" aria-hidden="true" />
              <p className="text-3xl font-black text-white">{item.value}</p>
              <p className="text-slate-400 text-sm mt-1">{item.label}</p>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => onNavigate('payments')}
          className={`${stats.pendingPayments > 0 ? TONES.amber : TONES.slate} border rounded-2xl p-5 text-left hover:brightness-125 transition`}
        >
          <CreditCard size={20} className="mb-3" aria-hidden="true" />
          <p className="text-3xl font-black text-white">{stats.pendingPayments}</p>
          <p className="text-slate-400 text-sm mt-1">Menunggu Konfirmasi</p>
          {oldestPendingDays !== null && (
            <p className="text-xs text-amber-300 mt-1">Tertua {oldestPendingDays} hari</p>
          )}
        </button>
      </div>

      <Panel title="Pendapatan Langganan" icon={TrendingUp}>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64 flex-shrink-0">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Bulan ini</p>
            <p className="text-4xl font-black text-green-400">{formatIDR(revenue.thisMonth)}</p>
            <div className="mt-2">
              <Delta value={change(revenue.thisMonth, revenue.previousMonth)} suffix="vs bulan lalu" />
            </div>
            <p className="text-slate-500 text-sm mt-3">Bulan lalu {formatIDR(revenue.previousMonth)}</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-end gap-3 h-40" role="img" aria-label="Grafik pendapatan 6 bulan terakhir">
              {revenue.trend.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${monthLabel(m.month)}: ${formatIDR(m.revenue)} (${m.count} pembayaran)`}>
                  <span className="text-[10px] text-slate-500 h-4">{m.revenue > 0 ? `${Math.round(m.revenue / 1000)}k` : ''}</span>
                  <div className="h-28 w-full flex items-end">
                    <div
                      className="w-full rounded-t-md bg-indigo-400/70"
                      style={{ height: `${Math.max(m.revenue > 0 ? 4 : 1, Math.round((m.revenue / trendMax) * 100))}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Pertumbuhan Toko" icon={UserPlus}>
          <p className="text-3xl font-black text-white">{growth.newThisMonth}</p>
          <p className="text-slate-400 text-sm">toko baru bulan ini</p>
          <div className="mt-2"><Delta value={change(growth.newThisMonth, growth.newPreviousMonth)} suffix="vs bulan lalu" /></div>
        </Panel>
        <Panel title="Konversi Trial → Berbayar" icon={Percent}>
          <p className="text-3xl font-black text-white">{conversion.rate}%</p>
          <p className="text-slate-400 text-sm">
            {conversion.converted} dari {conversion.total} toko baru ({conversion.cohortDays} hari terakhir)
          </p>
        </Panel>
        <Panel title="Kesehatan WhatsApp Tenant" icon={MessageSquare}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xl font-black text-green-400">{sessions.connected}</p><p className="text-xs text-slate-500">Terhubung</p></div>
            <div><p className="text-xl font-black text-slate-300">{sessions.disconnected}</p><p className="text-xs text-slate-500">Terputus</p></div>
            <div><p className="text-xl font-black text-red-400">{sessions.error}</p><p className="text-xs text-slate-500">Error</p></div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Antrian pesan: {platform.queue.pending} menunggu ·{' '}
            <span className={platform.queue.failed > 0 ? 'text-red-400 font-semibold' : ''}>{platform.queue.failed} gagal</span>
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title={`Segera Berakhir (≤ ${expiringSoon.days} hari)`}
          icon={AlertTriangle}
          action={expiringSoon.total > 0 && (
            <span className="text-xs text-amber-300 font-semibold">{expiringSoon.total} toko</span>
          )}
        >
          {expiringSoon.items.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">Tidak ada toko yang segera berakhir.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {expiringSoon.items.map((b) => (
                <li key={b.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{b.name}</p>
                    <p className="text-xs text-slate-500">{STATUS_LABEL[b.status]} · s/d {new Date(b.endsAt).toLocaleDateString('id-ID')}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-300 whitespace-nowrap">{daysUntil(b.endsAt)} hari lagi</span>
                </li>
              ))}
            </ul>
          )}
          {expiringSoon.total > expiringSoon.items.length && (
            <button type="button" onClick={() => onNavigate('businesses')} className="mt-3 text-sm text-indigo-300 hover:text-white font-semibold">
              Lihat semua toko →
            </button>
          )}
        </Panel>

        <Panel
          title={`Toko Aktif Tanpa Transaksi (${inactive.days}+ hari)`}
          icon={Moon}
          action={inactive.total > 0 && <span className="text-xs text-slate-400 font-semibold">{inactive.total} toko</span>}
        >
          {inactive.items.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">Semua toko aktif sedang bertransaksi.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {inactive.items.map((b) => (
                <li key={b.id} className="py-3 text-white text-sm font-semibold truncate">{b.name}</li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Pembayaran per Paket (Bulan Ini)" icon={CreditCard}>
        {stats.planBreakdown.length === 0 ? (
          <p className="text-slate-500 text-sm">Belum ada pembayaran yang disetujui bulan ini.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-2 font-semibold">Paket</th>
                <th className="pb-2 font-semibold text-right">Pembayaran</th>
                <th className="pb-2 font-semibold text-right">Pendapatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.planBreakdown.map((p) => (
                <tr key={p.name}>
                  <td className="py-2 text-white font-semibold">{p.name}</td>
                  <td className="py-2 text-right text-slate-300">{p.count}</td>
                  <td className="py-2 text-right text-green-400 font-bold">{formatIDR(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

import {
  Store, CheckCircle2, Clock, CreditCard, TrendingUp, TrendingDown,
  UserPlus, ArrowUpRight, ArrowRight, MessageSquare, AlertCircle, RefreshCw, Check,
} from 'lucide-react';
import { formatIDR, STATUS_LABEL } from '../constants';
import { formatWibDate } from '../../../utils/dateRange';

const DAY_MS = 86400000;
const daysFrom = iso => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS));
const daysUntil = iso => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS));
const monthLabel = key => new Date(key + '-01T00:00:00Z').toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' });
const compactIDR = value => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const number = value => Number(value).toLocaleString('id-ID');

function change(current, previous) {
  if (!previous) return current > 0 ? { text: 'Baru', direction: 'up' } : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { text: Math.abs(pct) + '%', direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

function Delta({ value }) {
  if (!value) return <span className="sa-comparison">Belum ada pembanding</span>;
  const Icon = value.direction === 'down' ? TrendingDown : value.direction === 'flat' ? ArrowRight : TrendingUp;
  return <span className={'sa-delta sa-delta--' + value.direction}><Icon size={13} aria-hidden="true" />{value.text}</span>;
}

function Panel({ title, description, action, className = '', children }) {
  return <section className={'sa-panel ' + className}>
    <div className="sa-panel-heading">
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action}
    </div>
    {children}
  </section>;
}

function EmptyState({ children }) {
  return <div className="sa-empty"><CheckCircle2 size={20} aria-hidden="true" /><p>{children}</p></div>;
}

function RevenueTrend({ trend }) {
  const max = Math.max(1, ...trend.map(month => month.revenue));
  if (!trend.length || !trend.some(month => month.revenue > 0)) {
    return <div className="sa-chart-empty"><TrendingUp size={24} aria-hidden="true" /><p>Belum ada pembayaran yang disetujui dalam periode ini.</p></div>;
  }
  return <div className="sa-chart" aria-label="Grafik pendapatan 6 bulan terakhir">
    <div className="sa-chart-grid" aria-hidden="true"><span /><span /><span /><span /></div>
    <ol className="sa-chart-bars">
      {trend.map((month, index) => <li key={month.month} className={'sa-chart-column' + (index === trend.length - 1 ? ' sa-chart-column--current' : '')}
        tabIndex={0} aria-label={monthLabel(month.month) + ': ' + formatIDR(month.revenue) + ', ' + month.count + ' pembayaran'}>
        <span className="sa-chart-amount">{compactIDR(month.revenue)}</span>
        <div className="sa-chart-track"><div className="sa-chart-bar" style={{ height: Math.max(month.revenue > 0 ? 3 : 0, month.revenue / max * 100) + '%' }} /></div>
        <span className="sa-chart-month">{monthLabel(month.month)}</span>
        <span className="sa-chart-tooltip" aria-hidden="true"><strong>{formatIDR(month.revenue)}</strong>{month.count} pembayaran disetujui</span>
      </li>)}
    </ol>
  </div>;
}

export default function DashboardTab({ stats, error, loading, updatedAt, onRetry, onNavigate }) {
  const month = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const header = <header className="sa-overview-heading">
    <div><p className="sa-eyebrow">RINGKASAN PLATFORM</p><h1>Dashboard</h1><p className="sa-page-description">Pantau pertumbuhan dan operasional WashPro.</p></div>
    <div className="sa-overview-tools">
      <span className="sa-period"><Clock size={14} aria-hidden="true" />{month}</span>
      <button type="button" className="sa-icon-button" onClick={onRetry} disabled={loading} aria-label="Muat ulang statistik">
        <RefreshCw size={17} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
      </button>
    </div>
  </header>;
  const warning = error && <div role="alert" className="sa-error">
    <span><AlertCircle size={18} aria-hidden="true" />{error}</span>
    <button type="button" onClick={onRetry} disabled={loading}>{stats ? 'Muat ulang' : 'Coba lagi'}<RefreshCw size={14} aria-hidden="true" /></button>
  </div>;

  if (!stats) return <div className="sa-overview">{header}{warning || <div role="status" aria-live="polite" className="sa-skeleton">
    <span className="sr-only">Memuat statistik platform...</span>
    <div className="sa-metrics">{[0, 1, 2, 3].map(id => <div className="sa-metric" key={id}><div className="sa-skeleton-line" /><div className="sa-skeleton-number" /></div>)}</div>
    <div className="sa-overview-grid"><div className="sa-panel sa-skeleton-chart" /><div className="sa-panel sa-skeleton-chart" /></div>
  </div>}</div>;

  const { statusCounts, revenue, growth, conversion, expiringSoon, inactive, platform } = stats;
  const sessions = platform.whatsappSessions;
  const sessionTotal = sessions.connected + sessions.disconnected + sessions.error;
  const activeShare = stats.totalBusinesses ? Math.round(statusCounts.ACTIVE / stats.totalBusinesses * 100) : 0;
  const metrics = [
    { label: 'Total Toko', value: number(stats.totalBusinesses), detail: 'Seluruh toko terdaftar', icon: Store },
    { label: 'Toko Aktif', value: number(statusCounts.ACTIVE), detail: activeShare + '% dari total toko', icon: CheckCircle2, dot: true },
    { label: 'Dalam Trial', value: number(statusCounts.TRIAL), detail: 'Mencoba layanan WashPro', icon: Clock },
    { label: 'Trial → Berbayar', value: number(conversion.rate) + '%', detail: conversion.converted + ' dari ' + conversion.total + ' toko · ' + conversion.cohortDays + ' hari', icon: ArrowUpRight },
  ];
  const statuses = [
    { id: 'ACTIVE', label: 'Aktif', color: 'green' },
    { id: 'TRIAL', label: 'Trial', color: 'blue' },
    { id: 'PENDING_PAYMENT', label: 'Menunggu pembayaran', color: 'amber' },
    { id: 'EXPIRED', label: 'Kadaluarsa', color: 'rose' },
    { id: 'SUSPENDED', label: 'Ditangguhkan', color: 'slate' },
  ];

  return <div className="sa-overview">
    {header}{warning}
    <div className="sa-metrics">
      {metrics.map(metric => <article key={metric.label} className="sa-metric">
        <div className="sa-metric-label"><span>{metric.label}</span><metric.icon size={17} aria-hidden="true" /></div>
        <p className="sa-metric-value">{metric.value}</p>
        <p className="sa-metric-detail">{metric.dot && <span className="sa-dot sa-dot--green" />}{metric.detail}</p>
      </article>)}
    </div>

    <div className="sa-overview-grid">
      <Panel title="Pendapatan langganan" description="Pembayaran yang telah disetujui" className="sa-revenue-panel" action={<span className="sa-label">6 bulan terakhir</span>}>
        <div className="sa-revenue-summary">
          <div><p className="sa-revenue-caption">Bulan ini</p><p className="sa-revenue-value">{formatIDR(revenue.thisMonth)}</p></div>
          <div className="sa-revenue-comparison"><Delta value={change(revenue.thisMonth, revenue.previousMonth)} /><span>vs bulan lalu</span></div>
        </div>
        <RevenueTrend trend={revenue.trend} />
        <div className="sa-revenue-footer">
          <div><p>Bulan lalu</p><strong>{formatIDR(revenue.previousMonth)}</strong></div>
          <div><p><UserPlus size={13} aria-hidden="true" />Toko baru bulan ini</p><span><strong>{number(growth.newThisMonth)}</strong><Delta value={change(growth.newThisMonth, growth.newPreviousMonth)} /></span></div>
        </div>
      </Panel>

      <Panel title="Perlu ditinjau" description="Prioritas operasional Anda" className="sa-priority-panel" action={<span className="sa-priority-mark" aria-hidden="true" />}>
        <div className={'sa-payment-priority' + (!stats.pendingPayments ? ' sa-payment-priority--clear' : '')}>
          <div className="sa-payment-caption"><CreditCard size={18} aria-hidden="true" /><span>Menunggu Konfirmasi</span></div>
          <div className="sa-payment-count"><strong>{number(stats.pendingPayments)}</strong><span>pembayaran</span></div>
          <p>{stats.oldestPendingPaymentAt ? 'Bukti tertua menunggu ' + daysFrom(stats.oldestPendingPaymentAt) + ' hari.' : 'Semua pembayaran sudah ditinjau.'}</p>
          <button type="button" className="sa-primary-button" onClick={() => onNavigate('payments')}>Tinjau pembayaran<ArrowRight size={16} aria-hidden="true" /></button>
        </div>
        <div className="sa-priority-row"><div><span className="sa-dot sa-dot--amber" /><span>Berakhir ≤ {expiringSoon.days} hari</span></div><strong>{number(expiringSoon.total)}<span>toko</span></strong></div>
        <div className="sa-priority-row"><div><span className="sa-dot sa-dot--slate" /><span>Tanpa transaksi {inactive.days}+ hari</span></div><strong>{number(inactive.total)}<span>toko</span></strong></div>
        <button type="button" className="sa-text-button" onClick={() => onNavigate('businesses')}>Kelola toko<ArrowUpRight size={16} aria-hidden="true" /></button>
      </Panel>
    </div>

    <section className="sa-status-strip" aria-label="Status seluruh toko">
      <div className="sa-status-title"><Store size={16} aria-hidden="true" /><span>Status toko</span></div>
      <div className="sa-status-items">{statuses.map(status => <div key={status.id}><span className={'sa-dot sa-dot--' + status.color} /><span>{status.label}</span><strong>{number(statusCounts[status.id] || 0)}</strong></div>)}</div>
    </section>

    <div className="sa-detail-grid">
      <Panel title="Segera berakhir" description={'Langganan dan trial dalam ' + expiringSoon.days + ' hari ke depan'}
        action={<span className="sa-count-badge">{expiringSoon.total}</span>}>
        {expiringSoon.items.length === 0 ? <EmptyState>Tidak ada toko yang segera berakhir.</EmptyState> : <ul className="sa-business-list">
          {expiringSoon.items.map(business => <li key={business.id}>
            <div className="sa-business-avatar" aria-hidden="true">{business.name.slice(0, 1)}</div>
            <div className="sa-business-info"><p>{business.name}</p><span>{STATUS_LABEL[business.status]} · {formatWibDate(business.endsAt)}</span></div>
            <span className="sa-days-badge">{daysUntil(business.endsAt)} hari</span>
          </li>)}
        </ul>}
        {expiringSoon.total > 0 && <button type="button" className="sa-panel-link" onClick={() => onNavigate('businesses')}>Lihat semua toko<ArrowUpRight size={14} aria-hidden="true" /></button>}
      </Panel>

      <Panel title="Toko tanpa transaksi" description={'Toko aktif yang tidak bertransaksi ' + inactive.days + '+ hari'}
        action={<span className="sa-count-badge">{inactive.total}</span>}>
        {inactive.items.length === 0 ? <EmptyState>Semua toko aktif sedang bertransaksi.</EmptyState> : <ul className="sa-business-list">
          {inactive.items.map(business => <li key={business.id}>
            <div className="sa-business-avatar sa-business-avatar--muted" aria-hidden="true">{business.name.slice(0, 1)}</div>
            <div className="sa-business-info"><p>{business.name}</p><span>Toko aktif · belum ada transaksi terbaru</span></div>
          </li>)}
        </ul>}
      </Panel>
    </div>

    <div className="sa-bottom-grid">
      <Panel title="Pembayaran per paket" description="Kontribusi pendapatan bulan ini" action={<CreditCard size={17} className="sa-muted" aria-hidden="true" />}>
        {stats.planBreakdown.length === 0 ? <EmptyState>Belum ada pembayaran yang disetujui bulan ini.</EmptyState> : <div className="sa-table-scroll">
          <table className="sa-plan-table"><thead><tr><th>Paket</th><th>Pembayaran</th><th>Pendapatan</th></tr></thead><tbody>
            {stats.planBreakdown.map(plan => <tr key={plan.name}><td><span className="sa-plan-marker" />{plan.name}</td><td>{number(plan.count)}</td><td>{formatIDR(plan.revenue)}</td></tr>)}
          </tbody></table>
        </div>}
      </Panel>

      <Panel title="WhatsApp tenant" description="Koneksi toko dan antrean pesan" action={<MessageSquare size={17} className="sa-muted" aria-hidden="true" />}>
        <div className="sa-connection-bar" role="img" aria-label={sessions.connected + ' terhubung, ' + sessions.disconnected + ' terputus, ' + sessions.error + ' error'}>
          {['connected', 'disconnected', 'error'].map(status => <span key={status} className={'sa-connection-segment sa-connection-segment--' + status}
            style={{ width: (sessionTotal ? sessions[status] / sessionTotal * 100 : 0) + '%' }} />)}
        </div>
        <div className="sa-connection-metrics">{[
          { label: 'Terhubung', value: sessions.connected, color: 'green' },
          { label: 'Terputus', value: sessions.disconnected, color: 'slate' },
          { label: 'Error', value: sessions.error, color: 'rose' },
        ].map(item => <div key={item.label}><strong>{number(item.value)}</strong><span><i className={'sa-dot sa-dot--' + item.color} />{item.label}</span></div>)}</div>
        <div className="sa-queue"><span><Clock size={14} aria-hidden="true" />{number(platform.queue.pending)} pesan menunggu</span><span className={platform.queue.failed > 0 ? 'sa-failure-count' : ''}>{number(platform.queue.failed)} gagal</span></div>
        {!sessionTotal && <p className="sa-muted sa-no-sessions">Belum ada sesi WhatsApp tenant.</p>}
      </Panel>
    </div>
    <footer className="sa-overview-footer"><span><Check size={13} aria-hidden="true" />{updatedAt ? 'Data diperbarui ' + new Date(updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB' : 'Data dari platform WashPro'}</span><span>WashPro · Super Admin</span></footer>
  </div>;
}

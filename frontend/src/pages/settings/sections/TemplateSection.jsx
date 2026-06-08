import { useState } from 'react';
import { Send } from 'lucide-react';
import { WA_TEMPLATE_TABS } from '../constants';
import PlaceholderBadge from '../components/PlaceholderBadge';

export default function TemplateSection({ settings, setSettings }) {
  const [activeWaTab, setActiveWaTab] = useState('RECEIPT');

  return (
    <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-emerald-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow lg:col-span-2" aria-labelledby="wa-template-heading">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
        <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><Send size={24} aria-hidden="true" /></div>
        <div>
          <h2 id="wa-template-heading" className="text-xl font-black text-primary">Template Resi WhatsApp</h2>
          <p className="text-xs text-slate-500 font-bold">Kustomisasi format pesan nota yang dikirim ke pelanggan</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-max" role="tablist" aria-label="Jenis template WhatsApp">
        {WA_TEMPLATE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeWaTab === tab}
            onClick={() => setActiveWaTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeWaTab === tab ? 'bg-white text-emerald-600 shadow-sm scale-105' : 'text-slate-500 hover:text-primary'}`}
          >
            {tab === 'RECEIPT' ? 'BARU / RESI' : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <label htmlFor="wa-template-content" className="block text-xs font-bold text-slate-500 mb-2 uppercase">Isi Pesan Template ({activeWaTab})</label>
          <textarea
            id="wa-template-content"
            rows={12}
            className="w-full p-4 bg-secondary border border-slate-200 rounded-2xl outline-none text-primary font-medium font-mono text-sm resize-none focus:border-emerald-400 transition-colors"
            placeholder={`Masukkan template untuk status ${activeWaTab}...`}
            value={settings.whatsappTemplates[activeWaTab] || ''}
            onChange={(e) => setSettings({
              ...settings,
              whatsappTemplates: { ...settings.whatsappTemplates, [activeWaTab]: e.target.value },
            })}
          />
          <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase italic">*Tag yang tersedia menyesuaikan konteks pesan.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h3 className="text-xs font-black text-primary mb-3 uppercase tracking-wider">Placeholder Tersedia</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 thin-scrollbar">
            <PlaceholderBadge tag="{{businessName}}" label="Nama Bisnis" />
            <PlaceholderBadge tag="{{customerName}}" label="Nama Pelanggan" />
            <PlaceholderBadge tag="{{orderId}}" label="ID Pesanan" />
            <PlaceholderBadge tag="{{separator}}" label="Garis Pemisah (---)" />
            {activeWaTab === 'RECEIPT' ? (
              <>
                <PlaceholderBadge tag="{{detailItems}}" label="Rincian Layanan" />
                <PlaceholderBadge tag="{{totalPrice}}" label="Total Harga" />
                <PlaceholderBadge tag="{{paymentMethod}}" label="Metode Bayar" />
                <PlaceholderBadge tag="{{status}}" label="Status Transaksi" />
                <PlaceholderBadge tag="{{date}}" label="Tanggal & Waktu" />
              </>
            ) : (
              <>
                <PlaceholderBadge tag="{{serviceName}}" label="Nama Layanan Utama" />
                <PlaceholderBadge tag="{{statusLabel}}" label="Label Status (Indo)" />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

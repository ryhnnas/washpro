import { Sliders } from 'lucide-react';
import ToggleOption from '../components/ToggleOption';

export default function CashierFormSection({ settings, setSettings }) {
  return (
    <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-tertiary relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow" aria-labelledby="cashier-form-heading">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
        <div className="p-3 bg-tertiary/20 rounded-xl text-tertiary-hover"><Sliders size={24} aria-hidden="true" /></div>
        <div>
          <h2 id="cashier-form-heading" className="text-xl font-black text-primary">Form Kasir</h2>
          <p className="text-xs text-slate-500 font-bold">Bongkar pasang identitas pelanggan</p>
        </div>
      </div>
      <div className="space-y-4 relative z-10">
        <ToggleOption id="toggle-customer-name" label="Nama Pelanggan" desc="Wajibkan kasir memasukkan nama" checked={settings.requireCustomerName} onChange={(val) => setSettings({ ...settings, requireCustomerName: val })} />
        <ToggleOption id="toggle-customer-phone" label="Nomor WhatsApp" desc="Penting untuk pengiriman nota digital" checked={settings.requireCustomerPhone} onChange={(val) => setSettings({ ...settings, requireCustomerPhone: val })} />
        <ToggleOption id="toggle-customer-address" label="Alamat Pengiriman" desc="Munculkan textarea domisili/alamat" checked={settings.requireCustomerAddress} onChange={(val) => setSettings({ ...settings, requireCustomerAddress: val })} />
      </div>
    </section>
  );
}

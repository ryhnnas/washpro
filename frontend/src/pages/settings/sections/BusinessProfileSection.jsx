import { Server } from 'lucide-react';

export default function BusinessProfileSection({ settings, setSettings }) {
  return (
    <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-primary relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow lg:col-span-2" aria-labelledby="business-profile-heading">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
        <div className="p-3 bg-primary/10 rounded-xl text-primary"><Server size={24} aria-hidden="true" /></div>
        <div>
          <h2 id="business-profile-heading" className="text-xl font-black text-primary">Profil Bisnis</h2>
          <p className="text-xs text-slate-500 font-bold">Informasi dasar yang tampil di struk dan header</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div>
          <label htmlFor="settings-business-name" className="block text-xs font-bold text-slate-500 mb-1">Nama Bisnis</label>
          <input
            id="settings-business-name"
            value={settings.businessName || ''}
            onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
            className="premium-input bg-secondary text-sm"
            placeholder="Contoh: WashPro / Nama Laundry Anda"
          />
        </div>
        <div>
          <label htmlFor="settings-business-phone" className="block text-xs font-bold text-slate-500 mb-1">Nomor Telepon Bisnis</label>
          <input
            id="settings-business-phone"
            value={settings.businessPhone || ''}
            onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
            className="premium-input bg-secondary text-sm"
            placeholder="0812xxxx"
          />
        </div>
        <div>
          <label htmlFor="settings-business-address" className="block text-xs font-bold text-slate-500 mb-1">Alamat Bisnis</label>
          <textarea
            id="settings-business-address"
            value={settings.businessAddress || ''}
            onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
            className="premium-input bg-secondary text-sm h-[42px] min-h-[42px] py-2"
            placeholder="Alamat lengkap gerai..."
          />
        </div>
      </div>
    </section>
  );
}

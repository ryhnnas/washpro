import { Crown, Plus, Trash2 } from 'lucide-react';

export default function MembershipSection({
  settings,
  services,
  addPackage,
  removePackage,
  updatePackage,
  addPackageItem,
  removePackageItem,
  updatePackageItem,
}) {
  return (
    <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-emerald-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow lg:col-span-2" aria-labelledby="membership-heading">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Crown size={24} aria-hidden="true" /></div>
          <div>
            <h2 id="membership-heading" className="text-xl font-black text-primary">Master Paket Membership</h2>
            <p className="text-xs text-slate-500 font-bold">Kelola berbagai pilihan paket berlangganan kuota.</p>
          </div>
        </div>
        <button type="button" onClick={addPackage} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors">
          <Plus size={18} aria-hidden="true" /> Tambah Paket Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settings.membershipPackages.map((pkg, pIdx) => (
          <div key={pIdx} className="p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 relative">
            <button type="button" onClick={() => removePackage(pIdx)} className="absolute top-4 right-4 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" aria-label={`Hapus paket ${pkg.name || pIdx + 1}`}>
              <Trash2 size={18} />
            </button>

            <div className="grid grid-cols-1 gap-4 mb-6">
              <div>
                <label htmlFor={`pkg-name-${pIdx}`} className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Nama Paket</label>
                <input
                  id={`pkg-name-${pIdx}`}
                  value={pkg.name}
                  onChange={(e) => updatePackage(pIdx, { name: e.target.value })}
                  className="premium-input bg-white text-sm py-2"
                  placeholder="Contoh: Paket Hemat 10Kg"
                />
              </div>
              <div>
                <label htmlFor={`pkg-days-${pIdx}`} className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Masa Aktif (Hari)</label>
                <input
                  id={`pkg-days-${pIdx}`}
                  type="number"
                  value={pkg.durationDays}
                  onChange={(e) => updatePackage(pIdx, { durationDays: e.target.value })}
                  className="premium-input bg-white text-sm py-2"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-600 uppercase">Item Kuota Layanan</span>
                <button type="button" onClick={() => addPackageItem(pIdx)} className="text-[10px] font-black text-white bg-emerald-500 px-2 py-1 rounded-md">
                  + Tambah
                </button>
              </div>

              {pkg.items.map((item, iIdx) => (
                <div key={iIdx} className="grid grid-cols-12 gap-2 items-end bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="col-span-12 md:col-span-5">
                    <label htmlFor={`pkg-${pIdx}-item-${iIdx}-service`} className="block text-[9px] font-bold text-slate-400 mb-1">Layanan</label>
                    <select
                      id={`pkg-${pIdx}-item-${iIdx}-service`}
                      value={item.serviceId}
                      onChange={(e) => updatePackageItem(pIdx, iIdx, { serviceId: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-400"
                    >
                      <option value="">Pilih Layanan</option>
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
                    </select>
                  </div>
                  <div className="col-span-5 md:col-span-3">
                    <label htmlFor={`pkg-${pIdx}-item-${iIdx}-quota`} className="block text-[9px] font-bold text-slate-400 mb-1">Jml Kuota</label>
                    <input
                      id={`pkg-${pIdx}-item-${iIdx}-quota`}
                      type="number"
                      value={item.quotaAmount}
                      onChange={(e) => updatePackageItem(pIdx, iIdx, { quotaAmount: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div className="col-span-5 md:col-span-3">
                    <label htmlFor={`pkg-${pIdx}-item-${iIdx}-rate`} className="block text-[9px] font-bold text-slate-400 mb-1">Rate Potong</label>
                    <input
                      id={`pkg-${pIdx}-item-${iIdx}-rate`}
                      type="number"
                      value={item.deductionRate}
                      onChange={(e) => updatePackageItem(pIdx, iIdx, { deductionRate: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <button type="button" onClick={() => removePackageItem(pIdx, iIdx)} className="w-full p-2 text-rose-500 hover:bg-rose-50 rounded-lg" aria-label="Hapus item kuota">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {settings.membershipPackages.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl mt-4">
          <p className="text-slate-400 font-bold mb-4">Belum ada paket membership yang dibuat.</p>
          <button type="button" onClick={addPackage} className="premium-button text-sm px-6">Mulai Buat Paket</button>
        </div>
      )}
    </section>
  );
}

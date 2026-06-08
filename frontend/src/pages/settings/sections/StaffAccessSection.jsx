import { STAFF_MENU_OPTIONS } from '../constants';
import ToggleSwitch from '../components/ToggleSwitch';

export default function StaffAccessSection({ settings, handleMenuToggle }) {
  return (
    <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-rose-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow" aria-labelledby="staff-access-heading">
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <h2 id="staff-access-heading" className="text-xl font-black text-primary mb-4">Akses Staf</h2>
      <div className="space-y-3">
        {STAFF_MENU_OPTIONS.map((menu) => (
          <label key={menu} htmlFor={`staff-menu-${menu}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <span className="font-bold text-slate-600">{menu}</span>
            <ToggleSwitch
              id={`staff-menu-${menu}`}
              checked={settings.staffAllowedMenus.includes(menu)}
              onChange={() => handleMenuToggle(menu)}
              label={`Izinkan akses ${menu}`}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

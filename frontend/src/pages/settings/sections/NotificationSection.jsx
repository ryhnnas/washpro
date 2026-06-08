import { Send } from 'lucide-react';
import { NOTIFICATION_STATE_OPTIONS } from '../constants';
import ToggleSwitch from '../components/ToggleSwitch';

export default function NotificationSection({ settings, setSettings }) {
  return (
    <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-emerald-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow" aria-labelledby="notification-heading">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
        <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><Send size={24} aria-hidden="true" /></div>
        <div>
          <h2 id="notification-heading" className="text-xl font-black text-primary">Notifikasi Otomatis</h2>
          <p className="text-xs text-slate-500 font-bold">Pilih kapan pesan WA dikirim ke pelanggan</p>
        </div>
      </div>
      <div className="space-y-3 relative z-10">
        {NOTIFICATION_STATE_OPTIONS.map((state) => (
          <label
            key={state.id}
            htmlFor={`notif-state-${state.id}`}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${settings.whatsappNotificationStates.includes(state.id) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
          >
            <div>
              <span className={`block text-sm font-black ${settings.whatsappNotificationStates.includes(state.id) ? 'text-emerald-700' : 'text-slate-600'}`}>{state.label}</span>
              <span className="block text-[10px] font-bold text-slate-400">{state.desc}</span>
            </div>
            <ToggleSwitch
              id={`notif-state-${state.id}`}
              checked={settings.whatsappNotificationStates.includes(state.id)}
              onChange={(val) => {
                setSettings((prev) => {
                  const states = [...prev.whatsappNotificationStates];
                  if (val) return { ...prev, whatsappNotificationStates: [...states, state.id] };
                  return { ...prev, whatsappNotificationStates: states.filter((s) => s !== state.id) };
                });
              }}
              label={state.label}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

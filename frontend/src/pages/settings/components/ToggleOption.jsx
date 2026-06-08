import ToggleSwitch from './ToggleSwitch';

export default function ToggleOption({ id, label, desc, checked, onChange }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked ? 'bg-tertiary/10 border-tertiary/40' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
    >
      <div>
        <span className={`block font-black mb-0.5 ${checked ? 'text-primary' : 'text-slate-500'}`}>{label}</span>
        <span className="block text-xs font-semibold text-slate-400">{desc}</span>
      </div>
      <ToggleSwitch id={id} checked={checked} onChange={onChange} label={label} />
    </label>
  );
}

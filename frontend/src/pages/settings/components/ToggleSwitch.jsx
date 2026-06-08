export default function ToggleSwitch({ id, checked, onChange, label }) {
  return (
    <div className="relative">
      <input
        id={id}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-checked={checked}
      />
      <div className="block bg-slate-300 w-14 h-8 rounded-full border border-slate-300 peer-checked:bg-tertiary transition-colors" aria-hidden="true"></div>
      <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6 shadow-md" aria-hidden="true"></div>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Info, Lock } from 'lucide-react';

const getStrength = (password) => {
  const p = password || '';
  let score = 0;
  if (p.length >= 8) score += 1;
  if (p.length >= 12) score += 1;
  if (/[A-Z]/.test(p)) score += 1;
  if (/[a-z]/.test(p)) score += 1;
  if (/[0-9]/.test(p)) score += 1;
  if (/[^A-Za-z0-9]/.test(p)) score += 1;

  if (score >= 5) return { label: 'Kuat', level: 3 };
  if (score >= 3) return { label: 'Sedang', level: 2 };
  return { label: 'Lemah', level: 1 };
};

export default function PasswordInput({
  label,
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  showStrength = true,
  disabled = false,
}) {
  const [showHint, setShowHint] = useState(false);
  const strength = useMemo(() => getStrength(value), [value]);

  const strengthClass =
    strength.level === 3 ? 'bg-green-500' : strength.level === 2 ? 'bg-amber-500' : 'bg-rose-500';
  const strengthWidth = strength.level === 3 ? 'w-full' : strength.level === 2 ? 'w-2/3' : 'w-1/3';

  return (
    <div>
      <div className="flex items-center justify-between mb-2 ml-1">
        <label className="block text-sm font-bold text-slate-500">{label}</label>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600"
          onMouseEnter={() => setShowHint(true)}
          onMouseLeave={() => setShowHint(false)}
          onFocus={() => setShowHint(true)}
          onBlur={() => setShowHint(false)}
        >
          <Info size={14} />
          Info
        </button>
      </div>

      <div className="relative group">
        <input
          type="password"
          placeholder={placeholder}
          className="premium-input bg-slate-50 premium-input-icon select-all"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
        />
        <Lock
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
        />

        {showHint && (
          <div className="absolute right-0 top-full mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-20">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Aturan Password</p>
            <ul className="text-xs text-slate-600 space-y-1 font-medium">
              <li>Minimal 8 karakter</li>
              <li>Mengandung huruf besar</li>
              <li>Mengandung huruf kecil</li>
              <li>Mengandung angka</li>
              <li>Mengandung simbol</li>
            </ul>
          </div>
        )}
      </div>

      {showStrength && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Kekuatan Password</span>
            <span className={strength.level === 3 ? 'text-green-600' : strength.level === 2 ? 'text-amber-600' : 'text-rose-600'}>
              {strength.label}
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className={`h-2 ${strengthClass} ${strengthWidth} transition-all`} />
          </div>
        </div>
      )}
    </div>
  );
}


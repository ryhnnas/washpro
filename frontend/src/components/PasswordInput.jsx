import { useMemo, useState } from 'react';
import { Info, Lock, Eye, EyeOff, Check } from 'lucide-react';

export const getPasswordPolicyErrors = (password) => {
  const p = String(password || '');
  const errors = [];
  if (p.length < 8) errors.push('Password minimal 8 karakter');
  if (!/[A-Z]/.test(p)) errors.push('Password harus mengandung huruf besar');
  if (!/[a-z]/.test(p)) errors.push('Password harus mengandung huruf kecil');
  if (!/[0-9]/.test(p)) errors.push('Password harus mengandung angka');
  if (!/[^A-Za-z0-9]/.test(p)) errors.push('Password harus mengandung simbol');
  return errors;
};

export const isPasswordPolicyValid = (password) => getPasswordPolicyErrors(password).length === 0;

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
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const strength = useMemo(() => getStrength(value), [value]);

  const strengthClass =
    strength.level === 3 ? 'bg-green-500' : strength.level === 2 ? 'bg-amber-500' : 'bg-rose-500';
  const strengthWidth = strength.level === 3 ? 'w-full' : strength.level === 2 ? 'w-2/3' : 'w-1/3';

  const rules = useMemo(() => {
    const p = value || '';
    return [
      { label: 'Minimal 8 karakter', valid: p.length >= 8 },
      { label: 'Mengandung huruf besar', valid: /[A-Z]/.test(p) },
      { label: 'Mengandung huruf kecil', valid: /[a-z]/.test(p) },
      { label: 'Mengandung angka', valid: /[0-9]/.test(p) },
      { label: 'Mengandung simbol', valid: /[^A-Za-z0-9]/.test(p) },
    ];
  }, [value]);

  const displayHint = showHint || isFocused;

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
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          className="premium-input bg-slate-50 premium-input-icon select-all pr-12"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <Lock
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          tabIndex="-1"
          aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        {displayHint && (
          <div className="absolute right-0 top-full mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-20">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Aturan Password</p>
            <ul className="text-xs space-y-1.5 font-medium">
              {rules.map((rule, index) => (
                <li
                  key={index}
                  className={`flex items-center gap-2 transition-colors ${
                    rule.valid ? 'text-green-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  {rule.valid ? (
                    <Check size={14} className="text-green-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] text-slate-300 shrink-0">•</span>
                  )}
                  <span>{rule.label}</span>
                </li>
              ))}
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

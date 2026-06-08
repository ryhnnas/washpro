import { Calendar } from 'lucide-react';

export default function DateFilter({ filter, setFilter, setCustomDate, customDate }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Calendar size={16} className="text-slate-400" />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-primary outline-none text-primary transition-all font-bold text-sm shadow-sm cursor-pointer appearance-none"
        >
          <option value="hari_ini">Hari Ini</option>
          <option value="kemarin">Kemarin</option>
          <option value="7_hari">7 Hari Terakhir</option>
          <option value="bulan_ini">Bulan Ini</option>
          <option value="kustom">Pilih Tanggal Kustom...</option>
        </select>
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>

      {filter === 'kustom' && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
          <input 
            type="date" 
            value={customDate.start}
            onChange={(e) => setCustomDate({...customDate, start: e.target.value})}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-primary text-sm shadow-sm focus:border-primary"
          />
          <span className="text-slate-400 font-bold">-</span>
          <input 
            type="date" 
            value={customDate.end}
            onChange={(e) => setCustomDate({...customDate, end: e.target.value})}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-primary text-sm shadow-sm focus:border-primary"
          />
        </div>
      )}
    </div>
  );
}

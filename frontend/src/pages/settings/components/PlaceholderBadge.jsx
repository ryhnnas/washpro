export default function PlaceholderBadge({ tag, label }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-max border border-emerald-100">{tag}</span>
      <span className="text-[10px] text-slate-400 font-bold ml-1">{label}</span>
    </div>
  );
}

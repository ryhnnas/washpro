/**
 * PageSkeleton — Full-page loading skeleton.
 * Menampilkan placeholder animasi saat halaman sedang dimuat.
 */
export default function PageSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-6">
      {/* Title bar */}
      <div className="h-8 bg-slate-200 rounded-full w-1/3" />

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-6 shadow-sm space-y-3"
          >
            <div className="h-4 bg-slate-200 rounded-full w-1/2" />
            <div className="h-8 bg-slate-200 rounded-full w-3/4" />
            <div className="h-3 bg-slate-200 rounded-full w-2/3" />
          </div>
        ))}
      </div>

      {/* Large content area */}
      <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
        <div className="h-5 bg-slate-200 rounded-full w-1/4" />
        <div className="h-4 bg-slate-200 rounded-full w-full" />
        <div className="h-4 bg-slate-200 rounded-full w-5/6" />
        <div className="h-4 bg-slate-200 rounded-full w-4/6" />
        <div className="h-32 bg-slate-200 rounded-2xl w-full" />
      </div>
    </div>
  );
}

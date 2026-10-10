export default function Pagination({ page, limit, total, onPageChange }) {
  if (!total || total <= limit) return null;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const buttonClass = 'px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

  return (
    <nav aria-label="Navigasi halaman" className="flex items-center justify-between mt-6 text-sm text-slate-400">
      <span>Halaman {page} dari {totalPages} · {total} data</span>
      <div className="flex gap-2">
        <button type="button" className={buttonClass} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Sebelumnya
        </button>
        <button type="button" className={buttonClass} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Berikutnya
        </button>
      </div>
    </nav>
  );
}

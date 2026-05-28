/**
 * TableSkeleton — Placeholder loading animasi untuk tabel.
 *
 * Props:
 * - rows: jumlah baris skeleton (default: 5)
 * - cols: jumlah kolom (default: 4)
 */
export default function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <tbody className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-6 py-4">
              <div
                className="h-4 bg-slate-200 rounded-full"
                style={{ width: j === 0 ? '60%' : j === cols - 1 ? '40%' : '80%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * EmptyState — Komponen reusable untuk menampilkan state kosong.
 *
 * Props:
 * - icon: React node (default: Inbox icon)
 * - title: string
 * - description: string
 * - action: { label: string, onClick?: () => void, href?: string }
 */
export default function EmptyState({
  icon,
  title = 'Tidak Ada Data',
  description = 'Belum ada data yang tersedia.',
  action,
}) {
  const IconElement = icon || <Inbox size={48} className="text-slate-300" />;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-full max-w-sm border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center">
        <div className="mb-4">{IconElement}</div>
        <h3 className="text-base font-bold text-primary mb-1">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          {description}
        </p>
        {action && (
          action.href ? (
            <Link
              to={action.href}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-sm transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-sm transition-colors"
            >
              {action.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

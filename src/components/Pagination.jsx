import { ChevronLeft, ChevronRight } from 'lucide-react';

// Simple, friendly pager: "Showing 1–50 of 320" + Prev / Next.
// Works for both server pagination (pass page/totalPages/total/limit) and
// client pagination (same shape, derived from usePaged).
export default function Pagination({ page, totalPages, total, limit, onPage, className = '' }) {
  if (!total) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className={`flex items-center justify-between gap-3 flex-wrap mt-4 ${className}`}>
      <p className="text-sm text-gray-400">
        Showing <b className="text-gray-600">{start.toLocaleString()}–{end.toLocaleString()}</b> of {total.toLocaleString()}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-sm text-gray-500 font-medium px-1">Page {page} of {totalPages}</span>
          <button className="btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

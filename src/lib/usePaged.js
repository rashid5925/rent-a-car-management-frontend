import { useState } from 'react';

// Client-side pagination for an already-loaded array. Used on detail pages
// where the full list arrives in one payload (per-vehicle / per-client tables).
export default function usePaged(items = [], pageSize = 50) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { page: safePage, setPage, total, totalPages, limit: pageSize, pageItems };
}

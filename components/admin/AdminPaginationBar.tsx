'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ADMIN_LIST_PAGE_SIZE, adminPaginationSummary } from '@/app/lib/admin-pagination';

type AdminPaginationBarProps = {
  totalItems: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Texto plural para el resumen (ej. "pedidos", "productos"). */
  entityPlural: string;
  pageSize?: number;
  className?: string;
};

export function AdminPaginationBar({
  totalItems,
  page,
  totalPages,
  onPageChange,
  entityPlural,
  pageSize = ADMIN_LIST_PAGE_SIZE,
  className = '',
}: AdminPaginationBarProps) {
  if (totalItems <= 0 || totalPages <= 1) return null;

  const summary = adminPaginationSummary(page, pageSize, totalItems, entityPlural);

  return (
    <div
      className={`mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto pt-4 border-t border-[#4a1d44]/10 ${className}`}
    >
      <p className="text-[11px] font-bold text-[#4a1d44]/50 uppercase tracking-widest">
        Mostrando {summary}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-[#4a1d44]/15 text-[#4a1d44] text-[11px] font-black uppercase tracking-widest hover:bg-[#4a1d44]/5 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft size={18} /> Anterior
        </button>
        <span className="text-xs font-black text-[#4a1d44] tabular-nums px-3 min-w-[5rem] text-center">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-[#4a1d44]/15 text-[#4a1d44] text-[11px] font-black uppercase tracking-widest hover:bg-[#4a1d44]/5 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          Siguiente <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

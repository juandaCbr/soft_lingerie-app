'use client';

import { useState, useEffect, useMemo } from 'react';
import { ADMIN_LIST_PAGE_SIZE, adminTotalPages } from '@/app/lib/admin-pagination';

/**
 * Estado de página para listados filtrados en admin: reinicia al cambiar filtros y acota si baja el total.
 * Pasar dependencias como argumentos sueltos (no como array nuevo cada render).
 */
export function useAdminListPagination(filteredCount: number, ...resetPageDeps: unknown[]) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, resetPageDeps);

  const totalPages = useMemo(
    () => adminTotalPages(filteredCount, ADMIN_LIST_PAGE_SIZE),
    [filteredCount],
  );

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return { page, setPage, totalPages, pageSize: ADMIN_LIST_PAGE_SIZE };
}

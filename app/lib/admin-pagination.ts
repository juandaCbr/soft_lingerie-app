/** Tamaño de página unificado en listados del panel admin (inventario, pedidos, etc.). */
export const ADMIN_LIST_PAGE_SIZE = 20;

export function adminTotalPages(itemCount: number, pageSize: number = ADMIN_LIST_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function adminSlicePage<T>(
  items: readonly T[],
  page: number,
  pageSize: number = ADMIN_LIST_PAGE_SIZE,
): T[] {
  const inicio = (page - 1) * pageSize;
  return items.slice(inicio, inicio + pageSize);
}

/**
 * Texto tras "Mostrando …" (ej. "1–20 de 45" o "0 productos").
 */
export function adminPaginationSummary(
  page: number,
  pageSize: number,
  total: number,
  entityPlural: string,
): string {
  if (total === 0) return `0 ${entityPlural}`;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return `${start}–${end} de ${total}`;
}

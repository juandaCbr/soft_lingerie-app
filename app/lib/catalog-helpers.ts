import type { ProductoColorJoin } from "./catalog-types";

/** Color mostrable desde el join (tolera tipos laxos que devuelve PostgREST). */
export function getColorInfo(pc: ProductoColorJoin): { nombre: string; hex?: string | null } | null {
  const c = pc.colores as
    | { nombre: string; hex?: string | null }
    | { nombre: string; hex?: string | null }[]
    | null
    | undefined;
  if (!c) return null;
  if (Array.isArray(c)) return c[0] ?? null;
  return c;
}

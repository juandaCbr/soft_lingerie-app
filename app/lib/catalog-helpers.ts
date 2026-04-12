import type { ProductoCatalogoVariante, ProductoColorJoin } from "./catalog-types";

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

/**
 * Primera fila de `producto_colores` con nombre útil (algunas filas vienen vacías o sin join a `colores`).
 */
export function firstColorFromVariante(v: ProductoCatalogoVariante): {
  nombre: string;
  hex?: string | null;
} | null {
  const filas = v.producto_colores;
  if (!filas?.length) return null;
  for (const pc of filas) {
    const info = getColorInfo(pc);
    if (info?.nombre?.trim()) return info;
  }
  return null;
}

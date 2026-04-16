import type { ProductoImagenes } from "./image-helper";

/** Categoría como texto o relación según la consulta PostgREST. */
export type CategoriaField = string | { nombre?: string | null } | null;

/** Fila `producto_colores` → `colores` (una tonalidad por fila en nuestro modelo). */
export type ProductoColorJoin = {
  colores?: { nombre: string; hex?: string | null } | null;
};

export type ProductoTallaJoin = {
  stock_talla?: number | null;
  tallas?: { nombre: string; id?: number; orden?: number | null } | null;
};

/**
 * Una fila de `productos` con joins del catálogo (CATALOGO_PRODUCTOS_SELECT
 * en `productos/page.tsx` y `CatalogoClient`).
 */
export type ProductoCatalogoVariante = ProductoImagenes & {
  id: number | string;
  nombre: string;
  descripcion?: string | null;
  precio: number | string;
  stock?: number | null;
  stock_disponible?: number | null;
  created_at: string;
  grupo_id?: string | number | null;
  categoria?: CategoriaField;
  producto_colores?: ProductoColorJoin[] | null;
  producto_tallas?: ProductoTallaJoin[] | null;
};

/** Variantes del mismo grupo agrupadas en cliente para el grid. */
export type ProductoCatalogoGrupo = ProductoCatalogoVariante & {
  variantes: ProductoCatalogoVariante[];
};

/**
 * Modelo que consume `ProductoCard`: variante sola o grupo con `variantes`
 * (misma forma base que `ProductoCatalogoVariante`).
 */
export type ProductoCardProducto = ProductoCatalogoVariante & {
  variantes?: ProductoCatalogoVariante[];
};

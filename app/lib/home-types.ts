import type { ProductoImagenes } from "./image-helper";
import type { CategoriaField } from "./catalog-types";

/**
 * Producto tal como lo pide la home (HOME_PRODUCTOS_SELECT en page.tsx).
 */
export type HomeProducto = ProductoImagenes & {
  id: number | string;
  nombre: string;
  precio: number | string;
  categoria?: CategoriaField;
  created_at: string;
  grupo_id?: string | null;
};

/** Línea típica dentro de `ventas_realizadas.detalle_compra` (JSON). */
export type DetalleCompraLine = {
  id?: string | number;
  quantity?: number | string;
  es_envio?: boolean;
};

/** Fila mínima de venta usada solo para contar unidades por producto en la home. */
export type VentaDetalleHome = {
  detalle_compra?: DetalleCompraLine[] | null;
};

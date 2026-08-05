import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizarDetalleCompra(raw: unknown): Record<string, unknown>[] {
  let detalle: unknown = raw;
  if (typeof detalle === "string") {
    try {
      detalle = JSON.parse(detalle);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(detalle)) return [];
  return detalle.filter((x): x is Record<string, unknown> => x != null && typeof x === "object");
}

/**Resultado por línea tras descontar stock vía RPC Postgres. */
export type ResultadoDescuento = {
  producto_id: number | null;
  talla_id: number | null;
  descontado: number;
  exito: boolean;
};

/**
 * Descuenta el stock de las líneas de un pedido (no líneas de envío).
 *
 * REGLA DE NEGOCIO: el stock SOLO se descuenta al pasar una venta a APROBADO.
 * No se devuelve stock al eliminar pedidos (pendientes o entregados).
 *
 * IMPLEMENTACIÓN: invoca el RPC `descontar_stock_pedido(JSONB)` de Postgres, que
 * descuenta atómicamente validando `stock >= qty` en cada UPDATE. Eso garantiza:
 *  - Atomicidad por línea (no hay lost-update entre ventas concurrentes).
 *  - No permite sobreventa: si `stock < qty`, la línea queda `exito:false`.
 *
 * Para líneas sin `talla_id`, descuenta solo `productos.stock`.
 * Para líneas con `talla_id`: descuenta `productos.stock` y `producto_tallas.stock_talla`
 * (si la fila de talla existe; si el admin la eliminó, solo descuenta el agregado).
 *
 * Idempotencia a nivel venta: el caller debe marcar `ventas_realizadas.stock_descontado=true`
 * tras un descuento completo exitoso, y solo扣 sar este descuento cuando esa flag sea `false`.
 * Reintentos seguros: el RPC con `stock >= qty` no duplica descuentos ya aplicados.
 */
export async function aplicarDescuentoStockDesdeDetalle(
  supabaseAdmin: SupabaseClient,
  detalleRaw: unknown,
): Promise<{ todoOk: boolean; resultados: ResultadoDescuento[] }> {
  const detalle = normalizarDetalleCompra(detalleRaw);

  if (detalle.length === 0) {
    return { todoOk: true, resultados: [] };
  }

  const { data, error } = await supabaseAdmin.rpc("descontar_stock_pedido", {
    p_detalle: detalle,
  });

  if (error) {
    throw new Error(`RPC descontar_stock_pedido: ${error.message}`);
  }

  const resultados: ResultadoDescuento[] = Array.isArray(data) ? (data as ResultadoDescuento[]) : [];

  const todoOk = resultados.every((r) => r.exito === true);

  return { todoOk, resultados };
}
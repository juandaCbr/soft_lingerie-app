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

function getTallaIdFromLine(line: Record<string, unknown>): string | number | null {
  const tallaIdDirect = line.talla_id as string | number | undefined;
  if (tallaIdDirect != null && tallaIdDirect !== "") return tallaIdDirect;
  const tallaObj = line.talla as { id?: string | number | null } | null | undefined;
  if (tallaObj?.id != null && tallaObj.id !== "") return tallaObj.id;
  return null;
}

/** Igual que al aprobar pago vía Wompi: descuenta `productos.stock` y `producto_tallas.stock_talla`. */
export async function aplicarDescuentoStockDesdeDetalle(
  supabaseAdmin: SupabaseClient,
  detalleRaw: unknown,
): Promise<void> {
  const detalle = normalizarDetalleCompra(detalleRaw);
  for (const line of detalle) {
    if (line.es_envio) continue;
    const productId = line.id as string | number | undefined;
    if (productId == null) continue;
    const qty = Number(line.quantity ?? 0);
    if (qty <= 0) continue;

    const { data: prod, error: errProd } = await supabaseAdmin
      .from("productos")
      .select("stock")
      .eq("id", productId)
      .maybeSingle();
    if (errProd) throw new Error(errProd.message);
    if (prod) {
      const { error: upProd } = await supabaseAdmin
        .from("productos")
        .update({ stock: Math.max(0, Number(prod.stock) - qty) })
        .eq("id", productId);
      if (upProd) throw new Error(upProd.message);
    }

    const tallaId = getTallaIdFromLine(line);
    if (tallaId != null) {
      const { data: relTalla, error: errTalla } = await supabaseAdmin
        .from("producto_tallas")
        .select("stock_talla")
        .eq("producto_id", productId)
        .eq("talla_id", tallaId)
        .maybeSingle();
      if (errTalla) throw new Error(errTalla.message);
      if (relTalla) {
        const { error: upTalla } = await supabaseAdmin
          .from("producto_tallas")
          .update({ stock_talla: Math.max(0, Number(relTalla.stock_talla) - qty) })
          .eq("producto_id", productId)
          .eq("talla_id", tallaId);
        if (upTalla) throw new Error(upTalla.message);
      }
    }
  }
}

/** Devuelve unidades al inventario (p. ej. al eliminar un pedido pendiente). */
export async function aplicarDevolucionStockDesdeDetalle(
  supabaseAdmin: SupabaseClient,
  detalleRaw: unknown,
): Promise<void> {
  const detalle = normalizarDetalleCompra(detalleRaw);
  for (const line of detalle) {
    if (line.es_envio) continue;
    const productId = line.id as string | number | undefined;
    if (productId == null) continue;
    const qty = Number(line.quantity ?? 0);
    if (qty <= 0) continue;

    const { data: prod, error: errProd } = await supabaseAdmin
      .from("productos")
      .select("stock")
      .eq("id", productId)
      .maybeSingle();
    if (errProd) throw new Error(errProd.message);
    if (prod) {
      const { error: upProd } = await supabaseAdmin
        .from("productos")
        .update({ stock: Number(prod.stock) + qty })
        .eq("id", productId);
      if (upProd) throw new Error(upProd.message);
    }

    const tallaId = getTallaIdFromLine(line);
    if (tallaId != null) {
      const { data: relTalla, error: errTalla } = await supabaseAdmin
        .from("producto_tallas")
        .select("stock_talla")
        .eq("producto_id", productId)
        .eq("talla_id", tallaId)
        .maybeSingle();
      if (errTalla) throw new Error(errTalla.message);
      if (relTalla) {
        const { error: upTalla } = await supabaseAdmin
          .from("producto_tallas")
          .update({ stock_talla: Number(relTalla.stock_talla) + qty })
          .eq("producto_id", productId)
          .eq("talla_id", tallaId);
        if (upTalla) throw new Error(upTalla.message);
      }
    }
  }
}

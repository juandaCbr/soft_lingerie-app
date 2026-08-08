import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  aplicarDescuentoStockDesdeDetalle,
  normalizarDetalleCompra,
} from "@/app/lib/ventas-detalle-stock";

/**
 * Stock — regla de negocio central:
 * El inventario SOLO se descuenta al pasar una venta a APROBADO (webhook Wompi,
 * confirmación cliente, o admin "marcar pagada"). No se devuelve stock al borrar
 * pedidos. Idempotencia vía `ventas_realizadas.stock_descontado`.
 */

function getAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Valida el checksum del webhook según documentación Wompi Colombia:
 * concatenar valores en signature.properties (sobre data), + timestamp + secreto; SHA256 hex.
 */
export function validarChecksumEventoWompi(
  data: unknown,
  signature: { properties?: string[]; checksum?: string } | undefined,
  timestamp: number | string | undefined,
  eventsSecret: string,
): boolean {
  if (!signature?.properties?.length || !signature.checksum) return false;
  let concat = "";
  for (const prop of signature.properties) {
    concat += String(getByPath(data, prop) ?? "");
  }
  concat += String(timestamp ?? "") + eventsSecret;
  const local = crypto.createHash("sha256").update(concat).digest("hex");
  return local.toLowerCase() === String(signature.checksum).toLowerCase();
}

async function enviarNotificacionPushover(mensaje: string) {
  const userKey = process.env.PUSHOVER_USER_KEY;
  const apiToken = process.env.PUSHOVER_API_TOKEN;

  if (!userKey || !apiToken) {
    console.warn("Pushover keys missing, skipping notification");
    return false;
  }

  try {
    const res = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: apiToken,
        user: userKey,
        message: mensaje,
        title: "¡NUEVA VENTA SOFT LINGERIE! 💖",
        sound: "cashregister",
        priority: 1,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.status !== 1) {
      console.error("Pushover rejected notification:", {
        statusCode: res.status,
        payload,
      });
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error enviando push:", err);
    return false;
  }
}

async function enviarNotificacionNtfy(mensaje: string) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return false;
  const server = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/+$/, "");
  const basicAuthUser = process.env.NTFY_USERNAME;
  const basicAuthPass = process.env.NTFY_PASSWORD;
  const token = process.env.NTFY_TOKEN;

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Title": "Nueva venta Soft Lingerie",
    "Priority": "urgent",
    "Tags": "moneybag,shopping_cart",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (basicAuthUser && basicAuthPass) {
    headers.Authorization = `Basic ${Buffer.from(`${basicAuthUser}:${basicAuthPass}`).toString("base64")}`;
  }

  try {
    const res = await fetch(`${server}/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers,
      body: mensaje,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("ntfy rejected notification:", { statusCode: res.status, body: txt });
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error enviando ntfy:", err);
    return false;
  }
}

async function enviarNotificacionAdmin(mensaje: string) {
  // Preferimos canal gratuito (ntfy) y dejamos Pushover como fallback legado.
  if (await enviarNotificacionNtfy(mensaje)) return true;
  return enviarNotificacionPushover(mensaje);
}

/**
 * Busca la fila por referencia Wompi exacta o por el sufijo que añadimos tras aprobar: "REF (ID: tx)".
 */
export async function buscarVentaPorReferenciaWompi(
  supabaseAdmin: SupabaseClient,
  reference: string,
): Promise<Record<string, unknown> | null> {
  const { data: exact } = await supabaseAdmin
    .from("ventas_realizadas")
    .select("*")
    .eq("referencia_wompi", reference)
    .maybeSingle();

  if (exact) return exact as Record<string, unknown>;

  const { data: rows } = await supabaseAdmin
    .from("ventas_realizadas")
    .select("*")
    .ilike("referencia_wompi", `${reference} (ID:%`)
    .order("fecha", { ascending: false })
    .limit(1);

  const byPrefix = rows?.[0];
  return (byPrefix as Record<string, unknown>) ?? null;
}

export type ProcesarPedidoResult = { ok: true; duplicado?: boolean } | { ok: false; reason: string };

/**
 * Marca venta APROBADO, descuenta stock, notifica. Idempotente: solo el primer ganador descuenta.
 */
export async function procesarPedidoWompiAprobado(
  reference: string,
  transactionId: string,
): Promise<ProcesarPedidoResult> {
  const supabaseAdmin = getAdmin();

  const pedido = await buscarVentaPorReferenciaWompi(supabaseAdmin, reference);
  if (!pedido) {
    return { ok: false, reason: "Pedido no encontrado" };
  }

  // Si ya está APROBADO pero el stock aún no se descontó (crash previo entre la
  // transición a APROBADO y el descuento), lo completamos ahora. Esto hace el
  // flujo idempotente: reintento seguro sin duplicar descuento.
  const yaAprobado = pedido.estado_pago === "APROBADO";
  const stockYaDescontado = pedido.stock_descontado === true;

  if (yaAprobado && stockYaDescontado) {
    // Duplicado real: ya aprobado y ya descontado.
    return { ok: true, duplicado: true };
  }

  // Si aún es PENDIENTE, hacemos la transición atómica a APROBADO.
  // Solo un consumidor (webhook / confirm / admin) gana esta carrera.
  let recienAprobado = false;
  if (!yaAprobado) {
    const nuevaRef = `${reference} (ID: ${transactionId})`;
    const { data: actualizados, error: updErr } = await supabaseAdmin
      .from("ventas_realizadas")
      .update({
        estado_pago: "APROBADO",
        referencia_wompi: nuevaRef,
      })
      .eq("id", pedido.id as string)
      .in("estado_pago", ["PENDIENTE", "Pendiente", "pendiente"])
      .select("id");

    if (updErr) {
      console.error("procesarPedidoWompiAprobado update:", updErr);
      return { ok: false, reason: updErr.message };
    }

    if (!actualizados?.length) {
      // Otro consumidor ganó la carrera o el estado cambió. Re-verificamos.
      const { data: estadoActual, error: estadoErr } = await supabaseAdmin
        .from("ventas_realizadas")
        .select("estado_pago, stock_descontado")
        .eq("id", pedido.id as string)
        .maybeSingle();

      if (estadoErr) {
        return { ok: false, reason: estadoErr.message };
      }

      if (estadoActual?.estado_pago === "APROBADO" && estadoActual?.stock_descontado === true) {
        return { ok: true, duplicado: true };
      }
      if (estadoActual?.estado_pago !== "APROBADO") {
        return {
          ok: false,
          reason: `No se pudo aprobar el pedido. Estado actual: ${String(estadoActual?.estado_pago ?? "desconocido")}`,
        };
      }
      // APROBADO pero stock_descontado=false: cae al flujo de descuento abajo.
    } else {
      recienAprobado = true;
    }
  }

  // --- Descuento de stock (solo si no se había hecho antes) ---
  const detalle = normalizarDetalleCompra(pedido.detalle_compra);

  let resumenArticulos = "";
  for (const line of detalle) {
    if (line.es_envio) continue;
    resumenArticulos += `• ${line.nombre} (Talla: ${(line.talla as { nombre?: string } | null)?.nombre || "Única"}) x${line.quantity}\n`;
  }

  // El RPC valida stock>=qty por línea. Si el descuento falla (RPC caído o talla
  // agotada), el pedido queda APROBADO + stock_descontado=false para reintento,
  // pero NO bloqueamos la notificación: la venta es real y el admin debe saberlo.
  let stockPendiente = false;
  try {
    await aplicarDescuentoStockDesdeDetalle(supabaseAdmin, pedido.detalle_compra);

    // Marcar stock_descontado=true atómicamente (condicional → idempotente).
    const { error: flagErr } = await supabaseAdmin
      .from("ventas_realizadas")
      .update({ stock_descontado: true })
      .eq("id", pedido.id as string)
      .eq("stock_descontado", false);

    if (flagErr) {
      console.warn("procesarPedidoWompiAprobado: estado APROBADO pero flag stock_descontado no actualizada:", flagErr.message, {
        referencia: reference,
        pedidoId: pedido.id,
      });
    }
  } catch (stockErr) {
    // El descuento falló (error RPC / stock insuficiente). No marcamos la flag para
    // permitir un reintento seguro, pero continuamos para notificar la venta de todos modos.
    console.error("procesarPedidoWompiAprobado descuento stock:", stockErr, {
      referencia: reference,
      pedidoId: pedido.id,
    });
    stockPendiente = true;
  }

  // Notificar solo en la primera aprobación (recienAprobado). En reintentos para
  // recuperar el descuento la venta ya fue notificada, así que se evita duplicar.
  if (recienAprobado) {
    const mensajePush = `¡Se ha realizado una venta por $${Number(pedido.monto_total as number).toLocaleString("es-CO")}!\n\nCliente: ${pedido.nombre_cliente}\nCiudad: ${pedido.ciudad}\n\nArtículos:\n${resumenArticulos}`;
    const notificado = await enviarNotificacionAdmin(mensajePush);
    if (!notificado) {
      console.warn("Venta aprobada pero la notificación push no pudo enviarse.", {
        referencia: reference,
        pedidoId: pedido.id,
      });
    }
  }

  if (stockPendiente) {
    return {
      ok: false,
      reason: "Pedido aprobado y notificado, pero el descuento de stock quedó pendiente (reintente)",
    };
  }

  return { ok: true };
}

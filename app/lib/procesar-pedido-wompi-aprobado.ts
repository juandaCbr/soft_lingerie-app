import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  aplicarDescuentoStockDesdeDetalle,
  normalizarDetalleCompra,
} from "@/app/lib/ventas-detalle-stock";

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
    console.log("Pushover keys missing, skipping notification");
    return;
  }

  try {
    await fetch("https://api.pushover.net/1/messages.json", {
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
  } catch (err) {
    console.error("Error enviando push:", err);
  }
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

  if (pedido.estado_pago === "APROBADO") {
    return { ok: true, duplicado: true };
  }

  const nuevaRef = `${reference} (ID: ${transactionId})`;

  const { data: actualizados, error: updErr } = await supabaseAdmin
    .from("ventas_realizadas")
    .update({
      estado_pago: "APROBADO",
      referencia_wompi: nuevaRef,
    })
    .eq("id", pedido.id as string)
    .eq("estado_pago", "PENDIENTE")
    .select("id");

  if (updErr) {
    console.error("procesarPedidoWompiAprobado update:", updErr);
    return { ok: false, reason: updErr.message };
  }

  if (!actualizados?.length) {
    return { ok: true, duplicado: true };
  }

  const detalle = normalizarDetalleCompra(pedido.detalle_compra);

  let resumenArticulos = "";
  for (const line of detalle) {
    if (line.es_envio) continue;
    resumenArticulos += `• ${line.nombre} (Talla: ${(line.talla as { nombre?: string } | null)?.nombre || "Única"}) x${line.quantity}\n`;
  }

  await aplicarDescuentoStockDesdeDetalle(supabaseAdmin, pedido.detalle_compra);

  const mensajePush = `¡Se ha realizado una venta por $${Number(pedido.monto_total as number).toLocaleString("es-CO")}!\n\nCliente: ${pedido.nombre_cliente}\nCiudad: ${pedido.ciudad}\n\nArtículos:\n${resumenArticulos}`;
  await enviarNotificacionPushover(mensajePush);

  return { ok: true };
}

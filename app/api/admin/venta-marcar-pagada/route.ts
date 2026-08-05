import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { aplicarDescuentoStockDesdeDetalle } from "@/app/lib/ventas-detalle-stock";

export const runtime = "nodejs";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function assertAdminSession(): Promise<{ ok: true } | { ok: false; status: number }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            /* ignore */
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };

  const { data: perfil } = await supabase.from("perfiles").select("es_admin").eq("id", user.id).single();
  if (!perfil?.es_admin) return { ok: false, status: 403 };

  return { ok: true };
}

/**
 * Marca un pedido PENDIENTE como APROBADO y descuenta stock (tras validar pago en Wompi u otro canal).
 */
export async function POST(request: Request) {
  const session = await assertAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: "No autorizado" }, { status: session.status });
  }

  const admin = getServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Servidor sin service role" }, { status: 500 });
  }

  let body: { ventaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const ventaId = body.ventaId?.trim();
  if (!ventaId) {
    return NextResponse.json({ error: "ventaId requerido" }, { status: 400 });
  }

  const { data: venta, error: fetchErr } = await admin.from("ventas_realizadas").select("*").eq("id", ventaId).maybeSingle();

  if (fetchErr || !venta) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (venta.estado_pago === "APROBADO" && venta.stock_descontado === true) {
    return NextResponse.json({ ok: true, duplicado: true });
  }

  if (venta.estado_pago !== "PENDIENTE" && !(venta.estado_pago === "APROBADO" && venta.stock_descontado === false)) {
    return NextResponse.json({ error: "Solo se pueden marcar pedidos en estado PENDIENTE (o APROBADO con stock pendiente)" }, { status: 400 });
  }

  // Transición atómica a APROBADO solo si era PENDIENTE.
  if (venta.estado_pago !== "APROBADO") {
    const refActual = String(venta.referencia_wompi ?? "").trim();
    const sufijoAdmin = " [pago confirmado admin]";
    const updateRow: { estado_pago: string; referencia_wompi?: string } = { estado_pago: "APROBADO" };
    if (refActual && !refActual.includes("[pago confirmado admin]")) {
      updateRow.referencia_wompi = refActual + sufijoAdmin;
    }

    const { data: actualizados, error: updErr } = await admin
      .from("ventas_realizadas")
      .update(updateRow)
      .eq("id", ventaId)
      .eq("estado_pago", "PENDIENTE")
      .select("id");

    if (updErr) {
      console.error("venta-marcar-pagada:", updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    if (!actualizados?.length) {
      // Otro consumidor ganó la carrera: re-leer para ver estado real.
      const { data: refrescada } = await admin
        .from("ventas_realizadas")
        .select("estado_pago, stock_descontado")
        .eq("id", ventaId)
        .maybeSingle();
      if (refrescada?.estado_pago === "APROBADO" && refrescada?.stock_descontado === true) {
        return NextResponse.json({ ok: true, duplicado: true });
      }
    }
  }

  // --- Descuento de stock (idempotente vía flag stock_descontado) ---
  if (!venta.stock_descontado) {
    try {
      const { todoOk } = await aplicarDescuentoStockDesdeDetalle(admin, venta.detalle_compra);

      const { error: flagErr } = await admin
        .from("ventas_realizadas")
        .update({ stock_descontado: true })
        .eq("id", ventaId)
        .eq("stock_descontado", false);

      if (flagErr) {
        console.error("venta-marcar-pagada flag:", flagErr);
        return NextResponse.json(
          { error: "Pedido marcado pagado pero la flag de stock no se actualizó; reintente para completar." },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, stockParcial: !todoOk ? true : undefined });
    } catch (e) {
      console.error("venta-marcar-pagada stock:", e);
      return NextResponse.json(
        { error: "Pedido marcado pagado pero el descuento de stock quedó pendiente. Vuelve a marcar para reintentar." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

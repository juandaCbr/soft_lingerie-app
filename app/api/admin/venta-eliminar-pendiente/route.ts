import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
 * Elimina un pedido PENDIENTE.
 *
 * REGLA DE STOCK: un pedido PENDIENTE NUNCA descontó stock (el descuento solo
 * ocurre al pasar a APROBADO). Por tanto, eliminar un pendiente solo borra la
 * fila → NO se toca el inventario. Esta acción es de limpieza visual para que
 * el panel no se llene de pedidos abandonados.
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

  if (venta.estado_pago !== "PENDIENTE") {
    return NextResponse.json({ error: "Solo se pueden eliminar pedidos pendientes de pago" }, { status: 400 });
  }

  // No se repone stock: el pedido PENDIENTE nunca descontó inventario.
  const { error: delErr } = await admin.from("ventas_realizadas").delete().eq("id", ventaId);

  if (delErr) {
    console.error("venta-eliminar-pendiente delete:", delErr);
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Eliminación de producto desde el panel admin.
 *
 * - Exige sesión + perfiles.es_admin (cookies, mismo criterio que /admin en proxy.ts).
 * - Usa service role para comprobar dependencias sin depender de RLS del cliente.
 * - Bloquea el borrado si hay registros que impiden integridad:
 *   - carrito (FK a productos)
 *   - ventas_realizadas (detalle_compra JSON con líneas de producto; no es FK pero hay que conservar historial)
 * - Si Postgres devuelve error en delete (otra FK futura), se informa al cliente.
 * - Tras borrar la fila, elimina la carpeta uploads/productos/{slug}-{id}/ (misma convención que /api/upload).
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { slugify } from '@/app/lib/utils';

export const runtime = 'nodejs';

/** Alineado con /api/upload y upload-cleanup (UPLOAD_DIR opcional). */
function uploadRootDir(): string {
  const raw = process.env.UPLOAD_DIR?.trim() || 'uploads';
  const normalized = raw.replace(/^\.\//, '');
  return path.join(process.cwd(), normalized);
}

/** Cliente con bypass RLS; solo usar después de validar que el caller es admin. */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Misma idea que proxy.ts en /admin: usuario logueado + perfiles.es_admin. */
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
            /* set desde route: puede ignorarse si el middleware refresca sesión */
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };

  const { data: perfil } = await supabase.from('perfiles').select('es_admin').eq('id', user.id).single();
  if (!perfil?.es_admin) return { ok: false, status: 403 };

  return { ok: true };
}

/** Línea de producto dentro de detalle_compra (excluye envío y entradas sin id). */
function lineaEsProductoConId(item: unknown, pid: number): boolean {
  if (!item || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  if (o.es_envio === true) return false;
  const rid = o.id;
  if (rid == null) return false;
  const n = typeof rid === 'number' ? rid : parseInt(String(rid), 10);
  if (Number.isNaN(n)) return false;
  return n === pid;
}

export async function POST(request: Request) {
  // --- Autenticación y cliente privilegiado ---
  const session = await assertAdminSession();
  if (!session.ok) {
    return NextResponse.json(
      { success: false, error: 'No autorizado' },
      { status: session.status },
    );
  }

  const admin = getServiceClient();
  if (!admin) {
    console.error('[api/admin/producto-delete] Falta SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json(
      { success: false, error: 'Configuración del servidor incompleta' },
      { status: 500 },
    );
  }

  let body: { producto_id?: string | number; nombre_producto?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 });
  }

  const rawId = body.producto_id;
  const nombre = String(body.nombre_producto ?? '').trim();
  const pid = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);

  if (!Number.isFinite(pid) || pid <= 0 || !nombre) {
    return NextResponse.json(
      { success: false, error: 'producto_id y nombre_producto son obligatorios' },
      { status: 400 },
    );
  }

  // --- Bloqueos de negocio (orden importa: fallar antes de tocar filas) ---

  const { count: carritoCount, error: carritoErr } = await admin
    .from('carrito')
    .select('*', { count: 'exact', head: true })
    .eq('producto_id', pid);

  if (carritoErr) {
    console.error('[api/admin/producto-delete] carrito', carritoErr);
    return NextResponse.json(
      { success: false, error: 'No se pudo comprobar el carrito' },
      { status: 500 },
    );
  }

  if (carritoCount && carritoCount > 0) {
    return NextResponse.json(
      {
        success: false,
        code: 'CARRITO',
        error:
          'Este producto está en el carrito de un cliente. Vacía esos carritos o espera a que compren antes de borrarlo.',
      },
      { status: 409 },
    );
  }

  // Carga todas las ventas para inspeccionar JSON; si crece mucho la tabla, valorar RPC en Postgres.
  const { data: ventas, error: ventasErr } = await admin.from('ventas_realizadas').select('id, detalle_compra');
  if (ventasErr) {
    console.error('[api/admin/producto-delete] ventas', ventasErr);
    return NextResponse.json(
      { success: false, error: 'No se pudo comprobar el historial de ventas' },
      { status: 500 },
    );
  }

  const tieneVenta = (ventas ?? []).some((v) => {
    const d = v.detalle_compra;
    if (!Array.isArray(d)) return false;
    return d.some((item) => lineaEsProductoConId(item, pid));
  });

  if (tieneVenta) {
    return NextResponse.json(
      {
        success: false,
        code: 'VENTAS',
        error:
          'No se puede eliminar: este producto aparece en pedidos ya registrados. Conserva el historial o desactívalo en lugar de borrarlo.',
      },
      { status: 409 },
    );
  }

  // --- Borrado en BD: hijos primero; si `productos` tiene otra FK, el delete falla y devolvemos code DB ---
  await admin.from('producto_tallas').delete().eq('producto_id', pid);
  await admin.from('producto_colores').delete().eq('producto_id', pid);

  const { error: delErr } = await admin.from('productos').delete().eq('id', pid);
  if (delErr) {
    return NextResponse.json(
      {
        success: false,
        code: 'DB',
        error:
          delErr.message ||
          'No se pudo borrar el producto. Puede haber otra tabla relacionada en la base de datos.',
      },
      { status: 409 },
    );
  }

  // --- Disco: misma convención que subida local ({slug}-{id}); no borra carpetas legacy con otro patrón ---
  const slug = slugify(nombre);
  if (slug) {
    const dir = path.join(uploadRootDir(), 'productos', `${slug}-${pid}`);
    if (existsSync(dir)) {
      try {
        await rm(dir, { recursive: true, force: true });
      } catch (e) {
        console.error('[api/admin/producto-delete] rm carpeta', dir, e);
      }
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * Duplicar producto para el panel admin: copia nombre, descripción, precio, categoría y grupo_id;
 * sin imágenes, sin tallas ni color; stock 0 y activo false. El admin completa en edición.
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

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

  const { data: perfil } = await supabase.from('perfiles').select('es_admin').eq('id', user.id).single();
  if (!perfil?.es_admin) return { ok: false, status: 403 };

  return { ok: true };
}

export async function POST(request: Request) {
  const session = await assertAdminSession();
  if (!session.ok) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: session.status });
  }

  const admin = getServiceClient();
  if (!admin) {
    console.error('[api/admin/producto-duplicate] Falta SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json(
      { success: false, error: 'Configuración del servidor incompleta' },
      { status: 500 },
    );
  }

  let body: { producto_id?: string | number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 });
  }

  const rawId = body.producto_id;
  const pid = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);
  if (!Number.isFinite(pid) || pid <= 0) {
    return NextResponse.json({ success: false, error: 'producto_id inválido' }, { status: 400 });
  }

  const { data: origen, error: readErr } = await admin.from('productos').select('*').eq('id', pid).single();
  if (readErr || !origen) {
    return NextResponse.json(
      { success: false, error: 'No se encontró el producto original' },
      { status: 404 },
    );
  }

  const grupoRaw = origen.grupo_id;
  const grupo_id =
    grupoRaw === null || grupoRaw === undefined
      ? null
      : typeof grupoRaw === 'string'
        ? grupoRaw.trim() || null
        : String(grupoRaw).trim() || null;

  const insertRow = {
    nombre: origen.nombre,
    descripcion: origen.descripcion ?? '',
    precio: Math.round(Number(origen.precio) || 0),
    stock: 0,
    categoria: origen.categoria,
    grupo_id,
    imagenes_urls: [] as string[],
    imagenes_locales: [] as { thumb: string; detail: string }[],
    activo: false,
  };

  const { data: nuevo, error: insErr } = await admin.from('productos').insert([insertRow]).select('id').single();

  if (insErr || !nuevo) {
    console.error('[api/admin/producto-duplicate] insert', insErr);
    return NextResponse.json(
      {
        success: false,
        error: insErr?.message || 'No se pudo crear la copia del producto',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, nuevo_id: nuevo.id });
}

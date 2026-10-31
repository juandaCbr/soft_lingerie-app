/**
 * Crear una categoría nueva desde el panel admin (formulario de Nuevo / Editar producto).
 *
 * - Exige sesión + perfiles.es_admin (mismo criterio que /admin en proxy.ts y que las otras rutas /api/admin).
 * - Solo INSERTA en `categorias`. No edita ni borra categorías ni toca productos, pedidos o stock.
 * - Si ya existe una con el mismo nombre (sin importar mayúsculas ni tildes), devuelve esa en vez de duplicarla.
 * - Los productos guardan la categoría por NOMBRE (productos.categoria), así que basta con que exista en la tabla.
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LARGO_MIN = 2;
const LARGO_MAX = 60;

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

/** "  set   premium " → "Set premium" se respeta tal cual lo escribe la admin, solo se limpian espacios. */
const limpiarNombre = (valor: unknown) => String(valor ?? '').replace(/\s+/g, ' ').trim();

/** Para comparar duplicados: sin mayúsculas ni tildes ("Básicos" = "basicos"). */
const clave = (nombre: string) =>
  nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export async function POST(request: Request) {
  // --- Autenticación y cliente privilegiado ---
  const session = await assertAdminSession();
  if (!session.ok) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: session.status });
  }

  const admin = getServiceClient();
  if (!admin) {
    console.error('[api/admin/categoria-crear] Falta SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json({ success: false, error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

  let body: { nombre?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 });
  }

  const nombre = limpiarNombre(body.nombre);
  if (nombre.length < LARGO_MIN || nombre.length > LARGO_MAX) {
    return NextResponse.json(
      { success: false, error: `El nombre debe tener entre ${LARGO_MIN} y ${LARGO_MAX} caracteres` },
      { status: 400 },
    );
  }

  // --- Evitar duplicados ---
  const { data: existentes, error: errorLectura } = await admin.from('categorias').select('id, nombre');
  if (errorLectura) {
    console.error('[api/admin/categoria-crear] Error leyendo categorías:', errorLectura.message);
    return NextResponse.json({ success: false, error: 'No se pudieron leer las categorías' }, { status: 500 });
  }
  const repetida = (existentes || []).find((c) => clave(String(c.nombre ?? '')) === clave(nombre));
  if (repetida) {
    return NextResponse.json({ success: true, categoria: repetida, ya_existia: true });
  }

  // --- Insertar ---
  // La columna `categorias.id` no tiene autoincremento en la BD (las categorías se crearon a mano con
  // id 1, 2, 3…), así que se asigna el siguiente número. Si otro insert tomó ese id al mismo tiempo
  // (violación de clave única, 23505), se vuelve a intentar con el siguiente.
  let siguienteId = Math.max(0, ...(existentes || []).map((c) => Number(c.id) || 0)) + 1;
  for (let intento = 0; intento < 3; intento++) {
    const { data: creada, error } = await admin
      .from('categorias')
      .insert({ id: siguienteId, nombre, created_at: new Date().toISOString() })
      .select('id, nombre')
      .single();

    if (!error && creada) {
      return NextResponse.json({ success: true, categoria: creada, ya_existia: false });
    }
    if (error?.code === '23505') {
      siguienteId += 1;
      continue;
    }
    console.error('[api/admin/categoria-crear] Error insertando categoría:', error?.message);
    break;
  }

  return NextResponse.json({ success: false, error: 'No se pudo crear la categoría' }, { status: 500 });
}

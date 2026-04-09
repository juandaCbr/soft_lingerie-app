/**
 * Invalida la caché de Next.js en home, catálogo y (opcional) ficha de producto
 * tras guardar cambios en el admin, para que listados y SEO reflejen `imagenes_locales` al instante.
 */
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function assertAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: perfil } = await supabase.from('perfiles').select('es_admin').eq('id', user.id).single();
  return Boolean(perfil?.es_admin);
}

type Body = { productPath?: string };

export async function POST(request: Request) {
  if (!(await assertAdminSession())) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }

  let productPath: string | undefined;
  try {
    const j = (await request.json()) as Body;
    productPath = typeof j.productPath === 'string' ? j.productPath.trim() : undefined;
  } catch {
    /* sin cuerpo */
  }

  revalidatePath('/');
  revalidatePath('/productos');
  if (productPath && productPath.startsWith('/productos/')) {
    revalidatePath(productPath);
  }

  return NextResponse.json({ success: true });
}

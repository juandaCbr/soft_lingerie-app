/**
 * Next.js 16: convención `proxy.ts` (sustituye `middleware.ts` deprecado).
 * Supabase SSR: cookies con `getAll`/`setAll` (la API `get`/`set`/`remove` está deprecada en @supabase/ssr).
 * Este archivo es el único que usa `createServerClient`; el resto de la app usa `createBrowserClient` en app/lib/supabase.ts.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Clonar respuesta para poder adjuntar Set-Cookie cuando Supabase refresca la sesión.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // getAll/setAll: necesarios para sesiones partidas en varias cookies (chunks); evita estado obsoleto.
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // matcher limita a /admin: misma cobertura que antes; login/navbar siguen usando el cliente en el browser.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('es_admin')
      .eq('id', user.id)
      .single();

    if (!perfil?.es_admin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};

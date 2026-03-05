import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 1. EL CAMBIO CLAVE: Usar getUser() en lugar de getSession()
  // Esto fuerza a Next.js a validar la sesión real con la base de datos
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Proteger las rutas de admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Si no hay usuario logueado, al login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Si hay usuario, verificamos si es admin en la tabla perfiles
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('es_admin')
      .eq('id', user.id)
      .single()

    // Si no es admin, lo mandamos a la página principal
    if (!perfil?.es_admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  // 3. EL OTRO CAMBIO: Asegurarnos de que proteja "/admin" y "/admin/cualquier-cosa"
  matcher: ['/admin', '/admin/:path*'],
}
/**
 * Utilidades compartidas para las rutas /api/admin: verificar que quien llama es admin y obtener
 * el cliente con service role. Mismo criterio que proxy.ts en /admin (sesión + perfiles.es_admin).
 *
 * Nota: las rutas admin que ya existían (producto-delete, venta-marcar-pagada, etc.) tienen su propia
 * copia de esta lógica; se dejaron intactas para no tocar flujos en producción. Las rutas nuevas
 * deben usar este módulo.
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente con bypass RLS; solo usar después de validar que el caller es admin. Null si falta la clave. */
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** 401 si no hay sesión, 403 si el usuario no es admin. */
export async function assertAdminSession(): Promise<{ ok: true } | { ok: false; status: 401 | 403 }> {
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

  const { data: perfil } = await supabase.from("perfiles").select("es_admin").eq("id", user.id).single();
  if (!perfil?.es_admin) return { ok: false, status: 403 };

  return { ok: true };
}

// Cliente solo para el navegador (sin cookies custom = API recomendada).
// La sesión en rutas /admin se refresca en `proxy.ts` (createServerClient).
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

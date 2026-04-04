/**
 * Comprueba si el correo ya está registrado.
 * Estrategia doble:
 *   1. GoTrue Admin API → consulta auth.users (fuente de verdad, más confiable).
 *   2. Fallback a tabla `perfiles` con ILIKE (para cubrir casos edge).
 * Rate limit por IP: 20 peticiones / 15 min.
 */
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getClientIp, rateLimitIp } from '@/app/lib/rate-limit-ip';

export const runtime = 'nodejs';

const CHECK_EMAIL_LIMIT = { max: 20, windowMs: 15 * 60 * 1000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimitIp(ip, CHECK_EMAIL_LIMIT);
  if (!limited.ok) {
    return NextResponse.json(
      {
        success: false,
        code: 'RATE_LIMIT',
        error: 'Demasiadas comprobaciones. Espera unos minutos y vuelve a intentarlo.',
        retryAfterSec: limited.retryAfterSec,
      },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 });
  }

  const raw = String(body.email ?? '').trim();
  if (!raw || !EMAIL_RE.test(raw)) {
    return NextResponse.json({ success: false, error: 'Correo no válido' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('[check-email] Falta SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json({ success: false, error: 'Configuración del servidor' }, { status: 500 });
  }

  const emailLower = raw.toLowerCase();

  /**
   * 1️⃣  Primario: GoTrue Admin API → /auth/v1/admin/users?filter=<email>
   *    El parámetro `filter` realiza búsqueda sobre el campo email en auth.users.
   *    Hacemos comparación exacta (lowercase) en el resultado para descartar falsos positivos.
   */
  let existsInAuth = false;
  try {
    const params = new URLSearchParams({ filter: raw, page: '1', per_page: '5' });
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?${params}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (authRes.ok) {
      const data = await authRes.json();
      if (Array.isArray(data.users)) {
        existsInAuth = data.users.some(
          (u: Record<string, unknown>) =>
            typeof u.email === 'string' && u.email.toLowerCase() === emailLower,
        );
      }
    } else {
      console.warn('[check-email] GoTrue API status:', authRes.status);
    }
  } catch (e) {
    console.warn('[check-email] GoTrue API error:', e);
  }

  if (existsInAuth) {
    return NextResponse.json({ success: true, exists: true });
  }

  /**
   * 2️⃣  Fallback: tabla `perfiles` con ILIKE (sin % → equivale a = insensible a mayúsculas).
   *    Nota: NO envolver el patrón en comillas dobles; PostgREST las tomaría como literal.
   */
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: filas, error } = await admin
    .from('perfiles')
    .select('id')
    .ilike('email', raw)
    .limit(1);

  if (error) {
    console.error('[check-email] perfiles:', error);
    // No fallar completamente; preferimos falso negativo a bloquear el checkout.
    return NextResponse.json({ success: true, exists: false });
  }

  const exists = Array.isArray(filas) && filas.length > 0;
  return NextResponse.json({ success: true, exists });
}

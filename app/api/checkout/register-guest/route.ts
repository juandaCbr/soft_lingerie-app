/**
 * Registro silencioso de usuarios invitados al finalizar compra.
 *
 * Flujo:
 *   1. Crea usuario en auth.users con contraseña aleatoria (email ya confirmado).
 *   2. Crea fila en `perfiles` con todos los datos del checkout.
 *   3. Envía email de "configura tu contraseña" via Supabase resetPasswordForEmail.
 *
 * Si el correo ya existe se devuelve { success: true, alreadyExists: true } sin error.
 */
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generarContrasena(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  let pw = '';
  for (let i = 0; i < 12; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ success: false, error: 'Correo no válido' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ success: false, error: 'Configuración del servidor' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1. Crear usuario en auth.users
  const { data: userData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: generarContrasena(),
    email_confirm: true,
    user_metadata: {
      full_name: String(body.nombre ?? '').trim(),
    },
  });

  if (authError) {
    // El correo ya existe (race condition o doble submit)
    const yaExiste =
      authError.status === 422 ||
      /already registered|already exists/i.test(authError.message ?? '');
    if (yaExiste) {
      return NextResponse.json({ success: true, alreadyExists: true });
    }
    console.error('[register-guest] createUser:', authError);
    return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
  }

  const userId = userData.user.id;

  // 2. Crear fila en perfiles
  const perfilData: Record<string, unknown> = {
    id: userId,
    email,
    nombre_completo: String(body.nombre ?? '').trim(),
    telefono: String(body.telefono ?? '').trim(),
    es_admin: false,
  };

  if (body.direccion) perfilData.direccion = String(body.direccion).trim();
  if (body.ciudad) perfilData.ciudad = String(body.ciudad).trim();
  if (body.departamento) perfilData.departamento = String(body.departamento).trim();
  if (body.barrio) perfilData.barrio = String(body.barrio).trim();
  if (body.apartamento) {
    const apto = String(body.apartamento).trim();
    perfilData.apartamento = apto || null;
  }

  const { error: perfilError } = await admin.from('perfiles').insert(perfilData);
  if (perfilError) {
    // Intentar solo campos básicos si hay error de columnas desconocidas
    await admin.from('perfiles').insert({
      id: userId,
      email,
      nombre_completo: perfilData.nombre_completo,
      telefono: perfilData.telefono,
      es_admin: false,
    });
  }

  // 3. Enviar email de configuración de contraseña
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? supabaseUrl;
  const { error: resetError } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/login?nueva_cuenta=1`,
  });
  if (resetError) {
    console.warn('[register-guest] resetPasswordForEmail:', resetError.message);
  }

  return NextResponse.json({ success: true, userCreated: true });
}

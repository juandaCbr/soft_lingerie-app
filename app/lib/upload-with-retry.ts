/**
 * Llama a /api/upload con un reintento automático cuando el primer intento falla.
 *
 * En modo desarrollo con Turbopack, el primer request a una API route que aún se está compilando
 * puede fallar con "Failed to parse body as FormData" (el body stream llega antes de que el
 * handler esté listo). El segundo intento siempre funciona porque la ruta ya está compilada.
 * En producción esto nunca ocurre (rutas pre-compiladas).
 */
export async function uploadConReintento(
  fd: FormData,
  intentos = 2,
): Promise<{ ok: boolean; json: any }> {
  let ultimoError: unknown = null;

  for (let i = 0; i < intentos; i++) {
    try {
      // FormData puede reutilizarse en varios fetch porque es un contenedor en memoria,
      // no un stream que se consume al leer.
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        return { ok: true, json };
      }

      // Fallo no-500 (validación, mime type, etc.): no vale la pena reintentar.
      if (res.status !== 500) {
        return { ok: false, json };
      }

      // 500 (posible race de compilación): esperar antes del siguiente intento.
      ultimoError = json.error ?? 'Error 500 del servidor';
    } catch (err) {
      ultimoError = err;
    }

    if (i < intentos - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return {
    ok: false,
    json: { success: false, error: ultimoError ?? 'Error al conectar con el servidor de imágenes' },
  };
}

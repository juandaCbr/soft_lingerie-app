/** Entrada alineada con filas de producto / variante en Supabase + imágenes locales. */
export type ImagenLocal = { thumb: string; detail: string };

export type ProductoImagenes = {
  imagenes_locales?: ImagenLocal[] | string | null;
  imagenes_urls?: string[] | null;
  imagen_url?: string | null;
};

export const PLACEHOLDER_IMAGE = '/images/placeholder.webp';

function parseImagenesLocales(raw: unknown): ImagenLocal[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter(
      (x): x is ImagenLocal =>
        typeof x === 'object' &&
        x !== null &&
        typeof (x as ImagenLocal).thumb === 'string' &&
        typeof (x as ImagenLocal).detail === 'string' &&
        Boolean((x as ImagenLocal).thumb.trim()) &&
        Boolean((x as ImagenLocal).detail.trim()),
    );
  }
  if (typeof raw === 'string') {
    try {
      return parseImagenesLocales(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

/** Cantidad de fotos disponibles (0 si solo habría placeholder). */
export function getProductoImageCount(producto: ProductoImagenes): number {
  const locals = parseImagenesLocales(producto.imagenes_locales);
  if (locals.length > 0) return locals.length;
  const legacy = Array.isArray(producto.imagenes_urls)
    ? producto.imagenes_urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];
  if (legacy.length > 0) return legacy.length;
  if (producto.imagen_url && String(producto.imagen_url).trim()) return 1;
  return 0;
}

/**
 * Resuelve la URL a mostrar: primero `imagenes_locales`, luego `imagenes_urls` / `imagen_url`, luego placeholder.
 */
export function getProductoImage(
  producto: ProductoImagenes,
  index = 0,
  type: 'thumb' | 'detail' = 'detail',
): string {
  const locals = parseImagenesLocales(producto.imagenes_locales);
  if (locals.length > 0 && locals[index]) {
    const url = type === 'thumb' ? locals[index].thumb : locals[index].detail;
    if (url?.trim()) return url.trim();
  }

  const legacy = Array.isArray(producto.imagenes_urls)
    ? producto.imagenes_urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];
  if (legacy[index]) return legacy[index].trim();
  if (legacy.length > 0) {
    const clamped = legacy[Math.min(index, legacy.length - 1)];
    if (clamped) return clamped.trim();
  }

  if (index === 0 && producto.imagen_url && String(producto.imagen_url).trim()) {
    return String(producto.imagen_url).trim();
  }

  return PLACEHOLDER_IMAGE;
}

/** URL absoluta para Open Graph / JSON-LD (rutas que empiezan por /). */
export function toAbsolutePublicUrl(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://soft-lingerie-app.vercel.app').replace(
    /\/$/,
    '',
  );
  if (trimmed.startsWith('/')) {
    return `${base}${trimmed}`;
  }
  return `${base}/${trimmed}`;
}

/** Añade parámetros de transformación en URLs públicas de Supabase Storage (solo catálogo legado). */
export function withSupabaseListThumbnailParams(url: string): string {
  if (!url.includes('supabase.co')) return url;
  if (url.includes('?')) return url;
  return `${url}?width=500&quality=80`;
}

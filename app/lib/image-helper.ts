/** Entrada alineada con filas de producto / variante en Supabase + imágenes locales. */
export type ImagenLocal = { thumb: string; detail: string };

export type ProductoImagenes = {
  imagenes_locales?: ImagenLocal[] | string | null;
  imagenes_urls?: string[] | null;
  imagen_url?: string | null;
};

export const PLACEHOLDER_IMAGE = '/images/placeholder.svg';

function asTrimmedString(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.trim();
}

/** Rutas relativas de app: asegura `/` inicial para que el navegador resuelva bien en admin y tienda. */
function normalizePublicPath(url: string): string {
  const s = url.trim();
  if (!s) return s;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//')) return s;
  if (s.startsWith('/')) return s;
  return `/${s}`;
}

/**
 * Convierte un elemento suelto del JSON de Supabase al par { thumb, detail }.
 * Tolera: strings (ruta única), solo thumb, solo detail, claves alternativas (Thumb, url…).
 */
function coerceLocalEntry(entry: unknown): ImagenLocal | null {
  if (entry == null) return null;
  if (typeof entry === 'string') {
    const s = normalizePublicPath(entry);
    if (!s) return null;
    return { thumb: s, detail: s };
  }
  if (typeof entry === 'object') {
    const o = entry as Record<string, unknown>;
    const thumb = normalizePublicPath(asTrimmedString(o.thumb ?? o.Thumb ?? o.thumbnail));
    const detail = normalizePublicPath(asTrimmedString(o.detail ?? o.Detail ?? o.full ?? o.large));
    const url = normalizePublicPath(asTrimmedString(o.url ?? o.src));
    let t = thumb || url;
    let d = detail || url;
    if (!t && d) t = d;
    if (!d && t) d = t;
    if (!t && !d) return null;
    return { thumb: t, detail: d };
  }
  return null;
}

/**
 * Normaliza `imagenes_locales` tal como puede venir de PostgREST (jsonb, string JSON, formas legacy).
 * Usar en admin (editar/crear) y misma lógica interna que el catálogo.
 */
export function normalizeImagenesLocales(raw: unknown): ImagenLocal[] {
  if (raw == null) return [];
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      return normalizeImagenesLocales(JSON.parse(s));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const out: ImagenLocal[] = [];
  for (const item of raw) {
    const c = coerceLocalEntry(item);
    if (c) out.push(c);
  }
  return out;
}

function parseImagenesLocales(raw: unknown): ImagenLocal[] {
  return normalizeImagenesLocales(raw);
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

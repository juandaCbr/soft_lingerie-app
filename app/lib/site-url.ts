/**
 * URL pública del sitio (sin barra final). Debe coincidir con NEXT_PUBLIC_SITE_URL en producción.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}

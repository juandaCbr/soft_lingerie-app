/**
 * Utilidades de texto para SEO (meta description, JSON-LD).
 *
 * Las descripciones en admin pueden traer HTML o espacios raros; los buscadores
 * esperan texto plano y ~155–160 caracteres para snippets. Esta función limpia
 * etiquetas, colapsa espacios y corta en un límite sin partir palabras cuando es posible.
 */
export function toMetaDescription(
  raw: string | null | undefined,
  fallback: string,
  maxLen = 160,
): string {
  const plain = (raw ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return fallback;
  if (plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

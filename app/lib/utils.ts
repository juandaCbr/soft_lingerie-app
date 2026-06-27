/** Documento de identidad: solo dígitos (sin puntos, espacios ni otros caracteres). */
export function normalizeDocumentoCliente(value: string): string {
  return value.replace(/\D/g, '');
}

export function slugify(text: string) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/ñ/g, 'n') // ñ no coincide con \w en RegExp JS estándar
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

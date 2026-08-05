/** Documento de identidad: solo dígitos (sin puntos, espacios ni otros caracteres). */
export function normalizeDocumentoCliente(value: string): string {
  return value.replace(/\D/g, '');
}

/** Documento para mostrar en UI: separador de millares con punto (ej. 26.529.256). */
export function formatDocumentoCliente(value: string): string {
  const digits = normalizeDocumentoCliente(value);
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Nombre completo del cliente: trim, espacios colapsados y mayúsculas sostenidas. */
export function normalizeNombreCliente(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-CO');
}

/**
 * Valida que el nombre tenga al menos un nombre y un apellido (dos palabras con contenido).
 * Considera que apellidos compuestos (ej. "De la Torre") siguen siendo válidos porque
 * solo exigimos >= 2 tokens no vacíos.
 * Retorna null si es válido, o un mensaje de error listo para mostrar al usuario.
 */
export function validarNombreCompleto(value: string): string | null {
  const normalized = normalizeNombreCliente(value);
  const partes = normalized.split(' ').filter((p) => p.length > 0);
  if (partes.length < 2) {
    return 'Introduce tu nombre y al menos un apellido (ej: María Pérez).';
  }
  return null;
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

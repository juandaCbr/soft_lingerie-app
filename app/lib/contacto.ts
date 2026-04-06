/** Datos de contacto públicos: un solo origen para footer, página contacto y CTAs. */

export const CONTACT_WHATSAPP_NUMBER = '573118897646';

export const CONTACT_WHATSAPP_MESSAGE =
  '¡Hola! Me gustaría recibir asesoría personalizada sobre sus prendas.';

export const CONTACT_INSTAGRAM_URL = 'https://instagram.com/soft.lingerie_';

export const CONTACT_INSTAGRAM_HANDLE = '@soft.lingerie_';

export const CONTACT_EMAIL = 'softlingerie8@gmail.com';

export function contactWhatsAppHref(): string {
  return `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(CONTACT_WHATSAPP_MESSAGE)}`;
}

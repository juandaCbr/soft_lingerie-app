export const CHECKOUT_ENVIO = {
  ciudadLocal: 'Valledupar',
  costoCiudadLocal: 6_000,
  costoNacional: 20_000,
} as const;

export function esCiudadEnvioLocal(ciudad: string): boolean {
  const normalized = ciudad.trim().toLowerCase();
  if (!normalized) return false;
  return normalized === CHECKOUT_ENVIO.ciudadLocal.toLowerCase();
}

export function getCostoEnvioCheckout(ciudad: string): number {
  const normalized = ciudad.trim();
  if (!normalized) return 0;
  if (esCiudadEnvioLocal(normalized)) {
    return CHECKOUT_ENVIO.costoCiudadLocal;
  }
  return CHECKOUT_ENVIO.costoNacional;
}

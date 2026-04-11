/** Datos del formulario de contacto y envío (paso 1 del checkout). */
export type CheckoutFormData = {
  nombre: string;
  email: string;
  telefono: string;
  departamento: string;
  ciudad: string;
  direccion: string;
  barrio: string;
  apartamento: string;
};

/** Campos auxiliares para Wompi según método de pago. */
export type CheckoutPaymentData = {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  installments: string;
  phoneNequi: string;
  phoneDaviplata: string;
  bankPSE: string;
  userType: string;
  docType: string;
  docNumber: string;
};

export type MetodoPagoEnvio = "INCLUIDO" | "CONTRAENTREGA";

export type MetodoPagoWompi = "CARD" | "PSE" | "NEQUI" | "DAVIPLATA" | "BANCOLOMBIA";

import type { ProductoImagenes } from "@/app/lib/image-helper";

/** Línea del carrito en checkout (producto + cantidad + talla; imágenes para miniatura). */
export type CheckoutCartLine = ProductoImagenes & {
  id: number | string;
  nombre: string;
  precio: number;
  quantity: number;
  talla_id?: number | string | null;
  talla?: { nombre?: string | null } | null;
  cart_item_id?: string | number;
};

/** Respuesta de Wompi o fila Realtime al confirmar pago. */
export type WompiExitoPayload = {
  status?: string;
  estado_pago?: string;
};

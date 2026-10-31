import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getProductoImage } from "./image-helper";
import { firstColorFromVariante } from "./catalog-helpers";
import { slugify } from "./utils";
import { CONTACT_WHATSAPP_NUMBER } from "./contacto";
import { getSiteUrl } from "./site-url";
import type { ProductoCatalogoVariante } from "./catalog-types";

/**
 * Catálogo por talla (/tallas/[talla] y su PDF). SOLO LECTURA: misma consulta que el catálogo
 * (productos activos + colores + stock por talla). No escribe nada ni toca pedidos o stock.
 */

const SELECT = `
  id,
  nombre,
  precio,
  created_at,
  grupo_id,
  categoria,
  imagenes_urls,
  imagenes_locales,
  producto_colores!left (
    colores (nombre, hex)
  ),
  producto_tallas!left (
    stock_talla,
    tallas (nombre, id, orden)
  )
`;

/** Orden natural de tallas; las que no estén aquí van al final por su `orden` en la BD. */
const ORDEN_TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

export type TallaCatalogo = {
  nombre: string;
  slug: string;
  /** Prendas (grupos) con stock en esta talla */
  cantidad: number;
};

export type PrendaTalla = {
  id: string;
  nombre: string;
  precio: number;
  categoria: string | null;
  imagen: string;
  href: string;
  colores: { nombre: string; hex: string | null }[];
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const tieneStockEnTalla = (v: ProductoCatalogoVariante, talla: string) =>
  (v.producto_tallas ?? []).some((pt) => pt.tallas?.nombre === talla && Number(pt.stock_talla ?? 0) > 0);

const timestamp = (value?: string) => {
  const ts = new Date(value || "").getTime();
  return Number.isFinite(ts) ? ts : 0;
};

/** Una sola consulta por render (React cache), compartida por la página y la metadata. */
const cargarVariantes = cache(async (): Promise<ProductoCatalogoVariante[]> => {
  const { data } = await supabaseAdmin.from("productos").select(SELECT).eq("activo", true);
  return (data || []) as unknown as ProductoCatalogoVariante[];
});

function agrupar(variantes: ProductoCatalogoVariante[]) {
  const grupos = new Map<string, ProductoCatalogoVariante[]>();
  for (const v of variantes) {
    const gid = String(v.grupo_id || `item-${v.id}`);
    const lista = grupos.get(gid);
    if (lista) lista.push(v);
    else grupos.set(gid, [v]);
  }
  return [...grupos.values()];
}

/** Todas las tallas que usan los productos (con o sin stock), en orden natural (XS, S, M, L, XL…). */
const getTodasLasTallas = cache(async (): Promise<TallaCatalogo[]> => {
  const [variantes, { data: tablaTallas }] = await Promise.all([
    cargarVariantes(),
    supabaseAdmin.from("tallas").select("nombre, orden"),
  ]);
  const ordenBd = new Map<string, number>();
  for (const t of (tablaTallas || []) as { nombre: string | null; orden: number | null }[])
    if (t.nombre) ordenBd.set(t.nombre, Number(t.orden ?? 99));
  for (const v of variantes)
    for (const pt of v.producto_tallas ?? [])
      if (pt.tallas?.nombre) ordenBd.set(pt.tallas.nombre, Number(pt.tallas.orden ?? 99));

  const grupos = agrupar(variantes);
  const tallas: TallaCatalogo[] = [...ordenBd.keys()].map((nombre) => ({
    nombre,
    slug: slugify(nombre),
    cantidad: grupos.filter((g) => g.some((v) => tieneStockEnTalla(v, nombre))).length,
  }));

  const posicion = (n: string) => {
    const i = ORDEN_TALLAS.indexOf(n.toUpperCase());
    return i >= 0 ? i : 100 + (ordenBd.get(n) ?? 99);
  };
  return tallas.sort((a, b) => posicion(a.nombre) - posicion(b.nombre));
});

/** Tallas con al menos una prenda disponible (las que se muestran como botones). */
export const getTallasDisponibles = cache(async (): Promise<TallaCatalogo[]> =>
  (await getTodasLasTallas()).filter((t) => t.cantidad > 0),
);

/**
 * Prendas con stock en la talla pedida (por slug: "m", "xl"…). Una talla existente pero sin stock
 * devuelve la lista vacía (la página muestra "por ahora no hay"); null solo si la talla no existe.
 */
export const getCatalogoTalla = cache(
  async (slug: string): Promise<{ talla: TallaCatalogo; prendas: PrendaTalla[] } | null> => {
    const tallas = await getTodasLasTallas();
    const talla = tallas.find((t) => t.slug === slug.toLowerCase());
    if (!talla) return null;

    const variantes = await cargarVariantes();
    const prendas: PrendaTalla[] = [];
    for (const grupo of agrupar(variantes)) {
      const conStock = grupo
        .filter((v) => tieneStockEnTalla(v, talla.nombre))
        .sort((a, b) => timestamp(b.created_at) - timestamp(a.created_at));
      if (conStock.length === 0) continue;

      const rep = conStock[0];
      const categoria = typeof rep.categoria === "object" ? rep.categoria?.nombre ?? null : rep.categoria ?? null;
      const colores = conStock
        .map((v) => firstColorFromVariante(v))
        .filter((c): c is { nombre: string; hex?: string | null } => Boolean(c))
        .map((c) => ({ nombre: c.nombre, hex: c.hex ?? null }))
        .filter((c, i, arr) => arr.findIndex((x) => x.nombre === c.nombre) === i);

      prendas.push({
        id: String(rep.id),
        nombre: rep.nombre,
        precio: Number(rep.precio),
        categoria: categoria ? String(categoria).trim() : null,
        imagen: getProductoImage(rep, 0, "detail"),
        href: `/productos/${slugify(rep.nombre)}-${rep.id}`,
        colores,
      });
    }

    prendas.sort((a, b) => {
      const va = variantes.find((v) => String(v.id) === a.id);
      const vb = variantes.find((v) => String(v.id) === b.id);
      return timestamp(vb?.created_at) - timestamp(va?.created_at);
    });

    return { talla, prendas };
  },
);

/** Enlace a WhatsApp con el pedido ya escrito (prenda, talla y enlace a la ficha). */
export function whatsappPedidoHref(prenda: Pick<PrendaTalla, "nombre" | "href">, talla: string) {
  const mensaje = `¡Hola! Quiero pedir *${prenda.nombre}* en talla *${talla}*.\n${getSiteUrl()}${prenda.href}`;
  return `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}

export const formatoPrecio = (precio: number) => `$${Number(precio).toLocaleString("es-CO")}`;

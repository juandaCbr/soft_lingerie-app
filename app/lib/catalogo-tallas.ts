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
 *
 * Además de lo que se vende en la tienda incluye las prendas "solo catálogo" (productos.solo_catalogo):
 * están ocultas en la tienda (activo = false) y solo se piden por WhatsApp. Ver components/admin/SoloCatalogo.
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

/**
 * Tallas que NO salen en el catálogo por tallas (pedido de Natalia: se quitó XS, queda solo S).
 * Siguen existiendo en la tienda y en el admin; aquí simplemente no aparecen.
 */
const TALLAS_FUERA_DEL_CATALOGO = ["XS"];

/**
 * Enlaces viejos que llevan a otra talla (por si alguien guardó o compartió el enlace):
 * /tallas/xs y /tallas/xs-s (el antiguo "XS y S") abren /tallas/s.
 */
const ENLACES_REDIRIGIDOS: Record<string, string> = { xs: "s", "xs-s": "s" };

/** Slug al que hay que redirigir este enlace, o null si no hace falta. */
export const slugRedirigido = (slug: string) => ENLACES_REDIRIGIDOS[slug.toLowerCase()] ?? null;

/**
 * Tallas que se muestran juntas en un solo enlace (cada prenda dice en cuál de ellas hay y se puede
 * filtrar "Ambas / Solo una"). Ej.: { nombre: "XS y S", slug: "xs-s", tallas: ["XS", "S"] }.
 * Hoy no hay ninguna: Natalia pidió dejar solo S.
 */
const TALLAS_JUNTAS: { nombre: string; slug: string; tallas: string[] }[] = [];

export type TallaCatalogo = {
  nombre: string;
  slug: string;
  /** Tallas reales que incluye: ["M"] para una talla, ["XS", "S"] para el enlace combinado */
  tallas: string[];
  /** Prendas (grupos) con stock en esta talla */
  cantidad: number;
};

export type PrendaTalla = {
  id: string;
  nombre: string;
  precio: number;
  categoria: string | null;
  imagen: string;
  /** Ficha en la tienda; null si la prenda es "solo catálogo" (no tiene página) */
  href: string | null;
  colores: { nombre: string; hex: string | null }[];
  /** De las tallas pedidas, en cuáles hay stock de esta prenda (en el combinado: "XS", "S" o ambas) */
  tallas: string[];
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

type VarianteTalla = ProductoCatalogoVariante & { solo_catalogo?: boolean | null };

/** Se vende en la tienda (tiene ficha). Las "solo catálogo" no. */
const enTienda = (v: VarianteTalla) => v.solo_catalogo !== true;

/**
 * Una sola consulta por render (React cache), compartida por la página y la metadata.
 * Si la columna solo_catalogo todavía no existe en la BD, la primera consulta falla y se usa la de
 * siempre (solo productos activos): el catálogo funciona igual que antes de este cambio.
 */
const cargarVariantes = cache(async (): Promise<VarianteTalla[]> => {
  const conSoloCatalogo = await supabaseAdmin
    .from("productos")
    .select(`${SELECT}, solo_catalogo`)
    .or("activo.eq.true,solo_catalogo.eq.true");
  if (!conSoloCatalogo.error) return (conSoloCatalogo.data || []) as unknown as VarianteTalla[];

  const { data } = await supabaseAdmin.from("productos").select(SELECT).eq("activo", true);
  return (data || []) as unknown as VarianteTalla[];
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

/**
 * Todas las tallas que usan los productos (con o sin stock), en orden natural (XS, S, M, L, XL…),
 * y aparte los enlaces combinados (TALLAS_JUNTAS).
 */
const getTodasLasTallas = cache(async (): Promise<{ tallas: TallaCatalogo[]; juntas: TallaCatalogo[] }> => {
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
  const contar = (nombres: string[]) =>
    grupos.filter((g) => g.some((v) => nombres.some((n) => tieneStockEnTalla(v, n)))).length;
  const enCatalogo = (nombre: string) => !TALLAS_FUERA_DEL_CATALOGO.includes(nombre.toUpperCase());
  const tallas: TallaCatalogo[] = [...ordenBd.keys()].filter(enCatalogo).map((nombre) => ({
    nombre,
    slug: slugify(nombre),
    tallas: [nombre],
    cantidad: contar([nombre]),
  }));

  const posicion = (n: string) => {
    const i = ORDEN_TALLAS.indexOf(n.toUpperCase());
    return i >= 0 ? i : 100 + (ordenBd.get(n) ?? 99);
  };
  tallas.sort((a, b) => posicion(a.nombre) - posicion(b.nombre));

  // Enlaces combinados (solo con las tallas que existen en la BD)
  const juntas: TallaCatalogo[] = TALLAS_JUNTAS.map((j) => ({
    ...j,
    tallas: j.tallas.filter((n) => ordenBd.has(n) && enCatalogo(n)),
  }))
    .filter((j) => j.tallas.length > 0)
    .map((j) => ({ ...j, cantidad: contar(j.tallas) }));

  return { tallas, juntas };
});

/**
 * Tallas con al menos una prenda disponible (las que se muestran como botones). Las tallas que van
 * juntas (XS y S) aparecen como un solo botón, en el lugar de la primera.
 */
export const getTallasDisponibles = cache(async (): Promise<TallaCatalogo[]> => {
  const { tallas, juntas } = await getTodasLasTallas();
  const botones: TallaCatalogo[] = [];
  for (const t of tallas) {
    const junta = juntas.find((j) => j.tallas.includes(t.nombre));
    if (!junta) botones.push(t);
    else if (!botones.includes(junta)) botones.push(junta);
  }
  return botones.filter((t) => t.cantidad > 0);
});

/**
 * Prendas con stock en la talla pedida (por slug: "m", "xs-s"…). Una talla existente pero sin stock
 * devuelve la lista vacía (la página muestra "por ahora no hay"); null solo si la talla no existe.
 * `junta` es el enlace combinado al que pertenece (o que es) la talla, con sus tallas sueltas en
 * `separadas`, para poder ver "solo XS" o "solo S" dentro del mismo catálogo.
 */
export const getCatalogoTalla = cache(
  async (
    slug: string,
  ): Promise<{
    talla: TallaCatalogo;
    prendas: PrendaTalla[];
    junta: { talla: TallaCatalogo; separadas: TallaCatalogo[] } | null;
  } | null> => {
    const { tallas, juntas } = await getTodasLasTallas();
    const talla = [...juntas, ...tallas].find((t) => t.slug === slug.toLowerCase());
    if (!talla) return null;

    const tallaJunta = juntas.find((j) => j === talla || j.tallas.includes(talla.nombre));
    const junta = tallaJunta
      ? { talla: tallaJunta, separadas: tallas.filter((t) => tallaJunta.tallas.includes(t.nombre)) }
      : null;

    const variantes = await cargarVariantes();
    const prendas: PrendaTalla[] = [];
    for (const grupo of agrupar(variantes)) {
      const conStock = grupo
        .filter((v) => talla.tallas.some((n) => tieneStockEnTalla(v, n)))
        .sort((a, b) => timestamp(b.created_at) - timestamp(a.created_at));
      if (conStock.length === 0) continue;

      const rep = conStock[0];
      // La ficha enlaza a una variante que se venda en la tienda (si el grupo tiene alguna)
      const conFicha = conStock.find(enTienda);
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
        href: conFicha ? `/productos/${slugify(conFicha.nombre)}-${conFicha.id}` : null,
        colores,
        tallas: talla.tallas.filter((n) => conStock.some((v) => tieneStockEnTalla(v, n))),
      });
    }

    prendas.sort((a, b) => {
      const va = variantes.find((v) => String(v.id) === a.id);
      const vb = variantes.find((v) => String(v.id) === b.id);
      return timestamp(vb?.created_at) - timestamp(va?.created_at);
    });

    return { talla, prendas, junta };
  },
);

/**
 * Enlace a WhatsApp con el pedido ya escrito (prenda, talla y enlace a la ficha). Las prendas
 * "solo catálogo" no tienen ficha: el mensaje dice que viene del catálogo para que Natalia la ubique.
 */
export function whatsappPedidoHref(prenda: Pick<PrendaTalla, "nombre" | "href" | "precio">, talla: string) {
  const enlace = prenda.href ? `\n${getSiteUrl()}${prenda.href}` : ` (${formatoPrecio(prenda.precio)}, del catálogo por tallas)`;
  const mensaje = `¡Hola! Quiero pedir *${prenda.nombre}* en talla *${talla}*.${enlace}`;
  return `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}

export const formatoPrecio = (precio: number) => `$${Number(precio).toLocaleString("es-CO")}`;

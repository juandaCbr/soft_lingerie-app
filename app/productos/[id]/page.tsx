import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { getProductoImage, toAbsolutePublicUrl } from '@/app/lib/image-helper';
import { getSiteUrl } from '@/app/lib/site-url';
import { slugify } from '@/app/lib/utils';
import { toMetaDescription } from '@/app/lib/seo-text';
import { PRODUCTO_DETALLE_CACHE_TAG } from '@/app/lib/cache-tags';
import type { ProductoCatalogoVariante } from '@/app/lib/catalog-types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Datos siempre frescos desde Supabase (imagenes_locales cambia al editar en admin).
 * La revalidación explícita sigue en POST /api/admin/revalidate-display tras guardar.
 */
export const revalidate = 60;

const PRODUCTO_BASE_SELECT = `
  id,
  nombre,
  descripcion,
  precio,
  stock,
  created_at,
  grupo_id,
  categoria,
  imagenes_urls,
  imagenes_locales,
  producto_colores ( colores (hex, nombre) )
`;

type TallasPorVariante = Record<string, Array<{ id: number; nombre: string; orden?: number | null; stock: number }>>;

type ProductoDetalleCache = {
  producto: ProductoCatalogoVariante;
  variantes: ProductoCatalogoVariante[];
  relacionados: Array<ProductoCatalogoVariante & { variantes: ProductoCatalogoVariante[] }>;
  tallasPorVariante: TallasPorVariante;
} | null;

type TallaRelacion = {
  producto_id: number | string;
  stock_talla?: number | null;
  tallas?: { id: number; nombre: string; orden?: number | null } | null;
};

/**
 * Cachea el conjunto completo de datos de la ficha (producto, variantes, tallas
 * y relacionados) para reutilizarlo entre solicitudes y durante la generación
 * de metadata. No incluye datos de sesión ni de usuario.
 */
function getProductoDetalle(id: string): Promise<ProductoDetalleCache> {
  return unstable_cache(
    async (): Promise<ProductoDetalleCache> => {
      const { data: productoData } = await supabaseAdmin
        .from('productos')
        .select(PRODUCTO_BASE_SELECT)
        .eq('id', id)
        .single();
      const producto = productoData as ProductoCatalogoVariante | null;

      if (!producto) return null;

      const [variantesResp, relacionadosResp] = await Promise.all([
        producto.grupo_id
          ? supabaseAdmin
              .from('productos')
              .select(PRODUCTO_BASE_SELECT)
              .eq('grupo_id', producto.grupo_id)
              .eq('activo', true)
          : Promise.resolve({ data: [producto] }),
        supabaseAdmin
          .from('productos')
          .select(PRODUCTO_BASE_SELECT)
          .eq('activo', true)
          .gt('stock', 0)
          .neq('id', producto.id)
          .limit(12),
      ]);

      const variantes = (variantesResp.data && variantesResp.data.length > 0
        ? variantesResp.data
        : [producto]) as unknown as ProductoCatalogoVariante[];
      const variantesIds = variantes.map((v) => v.id);
      const { data: tallasRelacionesData } = await supabaseAdmin
        .from('producto_tallas')
        .select('producto_id, stock_talla, tallas(id, nombre, orden)')
        .in('producto_id', variantesIds);
      const tallasRelaciones = tallasRelacionesData as TallaRelacion[] | null;

      const tallasPorVariante: TallasPorVariante = {};
      (tallasRelaciones || []).forEach((rel) => {
        if (!rel.tallas) return;
        const key = String(rel.producto_id);
        if (!tallasPorVariante[key]) tallasPorVariante[key] = [];
        tallasPorVariante[key].push({
          ...rel.tallas,
          stock: rel.stock_talla || 0,
        });
      });

      const gruposRelacionados: Record<string, ProductoCatalogoVariante & { variantes: ProductoCatalogoVariante[] }> = {};
      ((relacionadosResp.data || []) as unknown as ProductoCatalogoVariante[]).forEach((item) => {
        const gid = item.grupo_id || `item-${item.id}`;
        if (gid === producto.grupo_id) return;
        if (!gruposRelacionados[gid]) {
          gruposRelacionados[gid] = { ...item, variantes: [item] };
        } else {
          gruposRelacionados[gid].variantes.push(item);
        }
      });

      return {
        producto,
        variantes,
        relacionados: Object.values(gruposRelacionados),
        tallasPorVariante,
      };
    },
    ['producto-detalle', id],
    { revalidate, tags: [PRODUCTO_DETALLE_CACHE_TAG] },
  )();
}

/**
 * SEO por producto: URL canónica con slug+nombre (alineada al sitemap),
 * descripción limpia (sin HTML), OG/Twitter con imagen principal, robots index.
 * El título usa solo el nombre del producto; el layout añade " | Soft Lingerie".
 * Si el ID no existe, notFound() evita indexar una página vacía con meta genérica.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: rawId } = await params;
  // Misma regla que la página: slug opcional + id al final (/productos/nombre-id).
  const id = rawId.split('-').pop() || rawId;

  // Reutiliza la misma query cacheada que usa la página para evitar trabajo duplicado.
  const detalle = await getProductoDetalle(id);
  const producto = detalle?.producto;

  if (!producto) {
    notFound();
  }

  const canonicalPath = `/productos/${slugify(producto.nombre)}-${id}`;
  const image = toAbsolutePublicUrl(getProductoImage(producto, 0, 'detail'));
  const description = toMetaDescription(
    producto.descripcion,
    `Compra ${producto.nombre} en Soft Lingerie Valledupar. Lencería premium con envíos a Colombia.`,
  );
  const site = getSiteUrl();
  // Palabra clave extra si la categoría viene como string o como objeto con nombre (Supabase).
  const categoriaLabel =
    typeof producto.categoria === 'string'
      ? producto.categoria
      : producto.categoria && typeof producto.categoria === 'object' && 'nombre' in producto.categoria
        ? String((producto.categoria as { nombre?: string }).nombre ?? '')
        : '';

  return {
    title: producto.nombre,
    description,
    keywords: [
      producto.nombre,
      'lencería Valledupar',
      'lencería Colombia',
      ...(categoriaLabel ? [categoriaLabel] : []),
    ],
    alternates: {
      canonical: canonicalPath,
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${producto.nombre} | Soft Lingerie`,
      description,
      url: `${site}${canonicalPath}`,
      siteName: 'Soft Lingerie',
      locale: 'es_CO',
      type: 'website',
      images: [{ url: image, alt: producto.nombre }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${producto.nombre} | Soft Lingerie`,
      description,
      images: [image],
    },
  };
}

export async function generateStaticParams() {
  // En desarrollo, evita pre-generar params para reducir latencia en la primera navegación.
  if (process.env.NODE_ENV !== 'production') return [];

  const { data: productos } = await supabaseAdmin
    .from('productos')
    .select('id')
    .eq('activo', true);

  return productos?.map((p) => ({
    id: p.id.toString(),
  })) || [];
}

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  
  // Extraer el ID real (la última parte después del último guion)
  // Esto permite que /productos/nombre-del-producto-123 funcione
  const id = rawId.split('-').pop() || rawId;

  // 1. Producto base cacheado: evita doble roundtrip entre metadata y page.
  const detalle = await getProductoDetalle(id);

  if (!detalle) {
    notFound();
  }

  // 2 y 3 en paralelo para bajar tiempo total de render en servidor.
  // 2.1 Traer tallas de todas las variantes en servidor para evitar fetch adicional en cliente.
  return (
    <ProductClient
      producto={detalle.producto}
      variantesIniciales={detalle.variantes}
      relacionadosIniciales={detalle.relacionados}
      tallasPorVarianteIniciales={detalle.tallasPorVariante}
    />
  );
}

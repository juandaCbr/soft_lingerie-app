import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import { Metadata } from 'next';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getProductoImage, toAbsolutePublicUrl } from '@/app/lib/image-helper';
import { getSiteUrl } from '@/app/lib/site-url';
import { slugify } from '@/app/lib/utils';
import { toMetaDescription } from '@/app/lib/seo-text';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Datos siempre frescos desde Supabase (imagenes_locales cambia al editar en admin).
 * La revalidación explícita sigue en POST /api/admin/revalidate-display tras guardar.
 */
export const dynamic = 'force-dynamic';

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

const getProductoBase = cache(async (id: string) => {
  const { data } = await supabaseAdmin
    .from('productos')
    .select(PRODUCTO_BASE_SELECT)
    .eq('id', id)
    .single();

  return data;
});

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
  const producto = await getProductoBase(id);

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
  const producto = await getProductoBase(id);

  if (!producto) {
    notFound();
  }

  // 2 y 3 en paralelo para bajar tiempo total de render en servidor.
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
      .select(`
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
      `)
      .eq('activo', true)
      .gt('stock', 0)
      .neq('id', producto.id)
      .limit(12),
  ]);

  const variantes = variantesResp.data && variantesResp.data.length > 0 ? variantesResp.data : [producto];

  // 2.1 Traer tallas de todas las variantes en servidor para evitar fetch adicional en cliente.
  const variantesIds = variantes.map((v) => v.id);
  const { data: tallasRelaciones } = await supabaseAdmin
    .from('producto_tallas')
    .select('producto_id, stock_talla, tallas(id, nombre, orden)')
    .in('producto_id', variantesIds);

  // Estructura: { [productoId]: [{ id, nombre, stock }, ...] }
  const tallasPorVariante: Record<string, any[]> = {};
  (tallasRelaciones || []).forEach((rel: any) => {
    const key = String(rel.producto_id);
    if (!tallasPorVariante[key]) tallasPorVariante[key] = [];
    tallasPorVariante[key].push({
      ...rel.tallas,
      stock: rel.stock_talla || 0,
    });
  });

  const dataRelacionados = relacionadosResp.data;

  let relacionados: any[] = [];
  if (dataRelacionados) {
    const tempGrupos: any = {};
    dataRelacionados.forEach(item => {
      const gid = item.grupo_id || `item-${item.id}`;
      if (gid === producto.grupo_id) return;
      if (!tempGrupos[gid]) {
        tempGrupos[gid] = { ...item, variantes: [item] };
      } else {
        tempGrupos[gid].variantes.push(item);
      }
    });
    relacionados = Object.values(tempGrupos);
  }

  return (
    <ProductClient 
      producto={producto} 
      variantesIniciales={variantes} 
      relacionadosIniciales={relacionados} 
      tallasPorVarianteIniciales={tallasPorVariante}
    />
  );
}

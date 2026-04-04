import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getProductoImage, toAbsolutePublicUrl } from '@/app/lib/image-helper';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ISR: Revalidar cada 60 segundos
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: rawId } = await params;
  // Extraer el ID real (la última parte después del último guion) para que el SEO funcione igual que la página
  const id = rawId.split('-').pop() || rawId;

  const { data: producto } = await supabaseAdmin
    .from('productos')
    .select('nombre, descripcion, imagenes_urls, imagenes_locales')
    .eq('id', id)
    .single();

  if (!producto) return { title: "Soft Lingerie | Producto" };

  const image = toAbsolutePublicUrl(getProductoImage(producto, 0, 'detail'));

  return {
    title: `Soft Lingerie | ${producto.nombre}`,
    description: producto.descripcion?.substring(0, 160) || `Compra ${producto.nombre} en Soft Lingerie Valledupar. Calidad premium y diseños exclusivos.`,
    openGraph: {
      title: `Soft Lingerie | ${producto.nombre}`,
      description: producto.descripcion?.substring(0, 160),
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Soft Lingerie | ${producto.nombre}`,
      description: producto.descripcion?.substring(0, 160),
      images: [image],
    }
  };
}

export async function generateStaticParams() {
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

  // 1. Obtener producto principal
  const { data: producto, error } = await supabaseAdmin
    .from('productos')
    .select(`*, producto_colores ( colores (hex, nombre) )`)
    .eq('id', id)
    .single();

  if (error || !producto) {
    notFound();
  }

  // 2. Obtener variantes del mismo grupo
  let variantes = [producto];
  if (producto.grupo_id) {
    const { data: todasLasVariantes } = await supabaseAdmin
      .from('productos')
      .select(`*, producto_colores ( colores (hex, nombre) )`)
      .eq('grupo_id', producto.grupo_id)
      .eq('activo', true);
    if (todasLasVariantes) variantes = todasLasVariantes;
  }

  // 3. Obtener productos relacionados
  const { data: dataRelacionados } = await supabaseAdmin
    .from('productos')
    .select(`*, producto_colores ( colores (hex, nombre) )`)
    .eq('activo', true)
    .neq('id', producto.id)
    .limit(12);
// ... resto del archivo

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
    />
  );
}

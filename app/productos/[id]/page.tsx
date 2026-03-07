import { supabase } from '@/app/lib/supabase';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';

// ISR: Revalidar cada 60 segundos
export const revalidate = 60;

export async function generateStaticParams() {
  const { data: productos } = await supabase
    .from('productos')
    .select('id')
    .eq('activo', true);

  return productos?.map((p) => ({
    id: p.id.toString(),
  })) || [];
}

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Obtener producto principal
  const { data: producto, error } = await supabase
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
    const { data: todasLasVariantes } = await supabase
      .from('productos')
      .select(`*, producto_colores ( colores (hex, nombre) )`)
      .eq('grupo_id', producto.grupo_id)
      .eq('activo', true);
    if (todasLasVariantes) variantes = todasLasVariantes;
  }

  // 3. Obtener productos relacionados
  const { data: dataRelacionados } = await supabase
    .from('productos')
    .select(`*, producto_colores ( colores (hex, nombre) )`)
    .eq('activo', true)
    .neq('id', producto.id)
    .limit(12);

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

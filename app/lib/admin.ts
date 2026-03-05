import { supabase } from './supabase';

export async function obtenerVentasAdmin() {
  const { data, error } = await supabase
    .from('ventas_realizadas')
    .select(`
      *,
      items_pedido (
        cantidad,
        precio_unitario,
        nombre_producto_snapshot
      )
    `)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data;
}
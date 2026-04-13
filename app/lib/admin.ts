import { supabase } from './supabase';

export async function obtenerVentasAdmin() {
  // Solo detalle_compra (JSON en la fila). La relación items_pedido no existe en todos los proyectos
  // y rompía la consulta → lista de pedidos vacía en admin.
  const { data, error } = await supabase
    .from('ventas_realizadas')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data;
}
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Configuración de Supabase con Service Role para saltar RLS en el backend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, event, signature, timestamp } = body;

    // 1. Verificación de Seguridad (Firma)
    // Nota: Wompi envía una firma para asegurar que el mensaje viene de ellos.
    // Para validarla necesitas el "Secret de eventos" de tu panel de Wompi.
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    
    if (eventsSecret) {
      const properties = data.transaction;
      const signatureString = `${properties.id}${properties.status}${properties.amount_in_cents}${timestamp}${eventsSecret}`;
      const localSignature = crypto.createHash('sha256').update(signatureString).digest('hex');

      if (localSignature !== signature.checksum) {
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
      }
    }

    // 2. Procesar solo transacciones aprobadas
    if (event === 'transaction.updated' && data.transaction.status === 'APPROVED') {
      const { reference, id: transactionId } = data.transaction;

      // Buscar el pedido en la base de datos
      const { data: pedido, error: errorBusqueda } = await supabaseAdmin
        .from('ventas_realizadas')
        .select('*')
        .eq('referencia_wompi', reference)
        .single();

      if (errorBusqueda || !pedido) {
        console.error('Pedido no encontrado para la referencia:', reference);
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
      }

      // Si el pedido ya estaba aprobado, no hacemos nada (evitar duplicados)
      if (pedido.estado_pago === 'APROBADO') {
        return NextResponse.json({ message: 'Pedido ya procesado' });
      }

      // 3. Actualizar Pedido y Reducir Stock
      // Actualizamos a aprobado
      await supabaseAdmin
        .from('ventas_realizadas')
        .update({ 
          estado_pago: 'APROBADO',
          referencia_wompi: `${reference} (ID: ${transactionId})` 
        })
        .eq('id', pedido.id);

      // Reducir stock de cada producto y sus tallas
      if (Array.isArray(pedido.detalle_compra)) {
        for (const item of pedido.detalle_compra) {
          // Bajar stock general del producto
          const { data: prod } = await supabaseAdmin
            .from('productos')
            .select('stock')
            .eq('id', item.id)
            .single();
          
          if (prod) {
            await supabaseAdmin
              .from('productos')
              .update({ stock: Math.max(0, prod.stock - item.quantity) })
              .eq('id', item.id);
          }

          // Bajar stock de la talla específica
          if (item.talla_id) {
            const { data: relTalla } = await supabaseAdmin
              .from('producto_tallas')
              .select('stock_talla')
              .eq('producto_id', item.id)
              .eq('talla_id', item.talla_id)
              .single();

            if (relTalla) {
              await supabaseAdmin
                .from('producto_tallas')
                .update({ stock_talla: Math.max(0, relTalla.stock_talla - item.quantity) })
                .eq('producto_id', item.id)
                .eq('talla_id', item.talla_id);
            }
          }
        }
      }

      console.log(`Pedido ${reference} procesado con éxito vía Webhook.`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Error Webhook:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
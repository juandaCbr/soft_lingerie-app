import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Función para enviar notificación Push al celular
async function enviarNotificacionPushover(mensaje: string) {
  const userKey = process.env.PUSHOVER_USER_KEY;
  const apiToken = process.env.PUSHOVER_API_TOKEN;

  if (!userKey || !apiToken) {
    console.log("Pushover keys missing, skipping notification");
    return;
  }

  try {
    await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: apiToken,
        user: userKey,
        message: mensaje,
        title: "¡NUEVA VENTA SOFT LINGERIE! 💖",
        sound: "cashregister", // Sonido de caja registradora
        priority: 1
      }),
    });
  } catch (err) {
    console.error("Error enviando push:", err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, event, signature, timestamp } = body;

    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    if (eventsSecret) {
      const properties = data.transaction;
      const signatureString = `${properties.id}${properties.status}${properties.amount_in_cents}${timestamp}${eventsSecret}`;
      const localSignature = crypto.createHash('sha256').update(signatureString).digest('hex');
      if (localSignature !== signature.checksum) {
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
      }
    }

    if (event === 'transaction.updated' && data.transaction.status === 'APPROVED') {
      const { reference, id: transactionId } = data.transaction;

      const { data: pedido, error: errorBusqueda } = await supabaseAdmin
        .from('ventas_realizadas')
        .select('*')
        .eq('referencia_wompi', reference)
        .single();

      if (errorBusqueda || !pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
      if (pedido.estado_pago === 'APROBADO') return NextResponse.json({ message: 'Ya procesado' });

      // Actualizar pedido
      await supabaseAdmin
        .from('ventas_realizadas')
        .update({ 
          estado_pago: 'APROBADO',
          referencia_wompi: `${reference} (ID: ${transactionId})` 
        })
        .eq('id', pedido.id);

      // Reducir stock y preparar mensaje de notificación
      let resumenArticulos = "";
      if (Array.isArray(pedido.detalle_compra)) {
        for (const item of pedido.detalle_compra) {
          // Si es un ítem de envío, lo saltamos para no intentar reducir stock de un producto inexistente
          if (item.es_envio) continue;

          resumenArticulos += `• ${item.nombre} (Talla: ${item.talla?.nombre || 'Única'}) x${item.quantity}\n`;
          
          // Stock General
          const { data: prod } = await supabaseAdmin.from('productos').select('stock').eq('id', item.id).single();
          if (prod) {
            await supabaseAdmin.from('productos').update({ stock: Math.max(0, prod.stock - item.quantity) }).eq('id', item.id);
          }

          // Stock Talla
          if (item.talla_id) {
            const { data: relTalla } = await supabaseAdmin.from('producto_tallas').select('stock_talla').eq('producto_id', item.id).eq('talla_id', item.talla_id).single();
            if (relTalla) {
              await supabaseAdmin.from('producto_tallas').update({ stock_talla: Math.max(0, relTalla.stock_talla - item.quantity) }).eq('producto_id', item.id).eq('talla_id', item.talla_id);
            }
          }
        }
      }

      // ENVIAR LA NOTIFICACIÓN AL CELULAR
      const mensajePush = `¡Se ha realizado una venta por $${Number(pedido.monto_total).toLocaleString('es-CO')}!\n\nCliente: ${pedido.nombre_cliente}\nCiudad: ${pedido.ciudad}\n\nArtículos:\n${resumenArticulos}`;
      await enviarNotificacionPushover(mensajePush);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
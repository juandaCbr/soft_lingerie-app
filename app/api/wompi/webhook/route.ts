import { NextResponse } from 'next/server';
import {
  procesarPedidoWompiAprobado,
  validarChecksumEventoWompi,
} from '@/app/lib/procesar-pedido-wompi-aprobado';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, event, signature, timestamp } = body;

    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    if (eventsSecret) {
      if (!validarChecksumEventoWompi(data, signature, timestamp, eventsSecret)) {
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
      }
    }

    if (event === 'transaction.updated' && data?.transaction?.status === 'APPROVED') {
      const { reference, id: transactionId } = data.transaction;
      if (!reference || !transactionId) {
        return NextResponse.json({ error: 'Transacción incompleta' }, { status: 400 });
      }

      const result = await procesarPedidoWompiAprobado(reference, transactionId);
      if (!result.ok && result.reason === 'Pedido no encontrado') {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { procesarPedidoWompiAprobado } from '@/app/lib/procesar-pedido-wompi-aprobado';

/**
 * Respaldo cuando el webhook falla o tarda: el cliente llama tras ver APPROVED en Wompi.
 * Idempotente con el webhook (mismo UPDATE condicional a PENDIENTE).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const transactionId = body.transactionId as string | undefined;
    const reference = body.reference as string | undefined;
    if (!transactionId?.trim() && !reference?.trim()) {
      return NextResponse.json({ error: 'transactionId o reference requerido' }, { status: 400 });
    }

    const base = process.env.NEXT_PUBLIC_WOMPI_API_URL;
    const priv = process.env.WOMPI_PRIVATE_KEY;
    if (!base || !priv) {
      return NextResponse.json({ error: 'Configuración Wompi incompleta' }, { status: 500 });
    }

    let tx: any = null;

    if (transactionId?.trim()) {
      const wompiRes = await fetch(`${base}/transactions/${encodeURIComponent(transactionId.trim())}`, {
        headers: { Authorization: `Bearer ${priv}` },
        cache: 'no-store',
      });
      const json = await wompiRes.json();
      if (wompiRes.ok && json?.data) {
        tx = json.data;
      }
    }

    if (!tx && reference?.trim()) {
      const byRefRes = await fetch(`${base}/transactions?reference=${encodeURIComponent(reference.trim())}`, {
        headers: { Authorization: `Bearer ${priv}` },
        cache: 'no-store',
      });
      const byRefJson = await byRefRes.json().catch(() => ({}));
      const rows = Array.isArray(byRefJson?.data) ? byRefJson.data : [];
      tx = rows.find((row: any) => row?.status === 'APPROVED' && row?.reference === reference.trim()) ?? null;
    }

    if (!tx) {
      return NextResponse.json({ error: 'No se pudo consultar la transacción' }, { status: 400 });
    }

    if (tx.status !== 'APPROVED') {
      return NextResponse.json({ error: 'La transacción no está aprobada' }, { status: 400 });
    }

    const result = await procesarPedidoWompiAprobado(tx.reference, tx.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.reason === 'Pedido no encontrado' ? 404 : 400 });
    }

    return NextResponse.json({ ok: true, duplicado: result.duplicado === true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

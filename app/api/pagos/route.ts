import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { metodo, paymentData, referencia, monto, email, nombre, telefono } = body;

    // Comentario: PSE y Bancolombia exigen montos reales. Si haces pruebas, intenta con productos de 15.000 COP o mas.
    const amountInCents = Math.round(monto * 100);

    const acceptanceResponse = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/merchants/${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`);
    if (!acceptanceResponse.ok) {
      throw new Error("No se pudo conectar con Wompi para obtener el token de aceptacion.");
    }
    const merchantData = await acceptanceResponse.json();
    const acceptance_token = merchantData.data.presigned_acceptance.acceptance_token;

    const integritySecret = process.env.NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET || process.env.WOMPI_INTEGRITY_SECRET;
    const chainToHash = `${referencia}${amountInCents}COP${integritySecret}`;
    const integrity_signature = crypto.createHash('sha256').update(chainToHash).digest('hex');

    // Comentario: Al usar llaves de PRODUCCION, Wompi exige estrictamente que la redirect_url sea HTTPS.
    // Forzamos el dominio de Vercel para asegurar que si pruebas en localhost, Wompi genere la URL del banco.
    const redirectUrlValid = `https://soft-lingerie-app.vercel.app/gracias?ref=${referencia}`;

    let transactionPayload: any = {
      amount_in_cents: amountInCents,
      currency: "COP",
      customer_email: email || "correo@pordefecto.com",
      reference: referencia,
      signature: integrity_signature,
      acceptance_token: acceptance_token,
      redirect_url: redirectUrlValid,
      customer_data: {
        phone_number: (telefono || "3000000000").replace(/\D/g, '').substring(0, 10),
        full_name: (nombre || "Cliente Soft").substring(0, 50)
      }
    };

    if (metodo === 'NEQUI') {
      transactionPayload.payment_method = { type: "NEQUI", phone_number: paymentData.phoneNequi };
    } else if (metodo === 'CARD') {
      transactionPayload.payment_method = { type: "CARD", installments: 1, token: paymentData.token };
    } else if (metodo === 'PSE') {
      // Comentario: PSE falla silenciosamente si envias campos de cedula vacios. Añadimos fallbacks.
      transactionPayload.payment_method = {
        type: "PSE",
        user_type: parseInt(paymentData.userType || "0"),
        user_legal_id_type: paymentData.docType || "CC",
        user_legal_id: String(paymentData.docNumber || "123456789").trim(),
        financial_institution_code: String(paymentData.bankPSE),
        payment_description: "Pedido Soft Lingerie"
      };
    } else if (metodo === 'BANCOLOMBIA') {
      transactionPayload.payment_method = {
        type: "BANCOLOMBIA_TRANSFER",
        user_type: "PERSON",
        payment_description: "Pedido Soft Lingerie"
      };
    }

    const wompiRes = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WOMPI_PRIVATE_KEY}`
      },
      body: JSON.stringify(transactionPayload)
    });

    const wompiData = await wompiRes.json();

    if (!wompiRes.ok) {
      let errorMessage = "Error en la pasarela";
      if (wompiData.error && wompiData.error.messages) {
        const detailedMessages = Object.entries(wompiData.error.messages)
          .map(([field, msgs]: [string, any]) => `${field}: ${msgs.join(', ')}`)
          .join(' | ');
        errorMessage = `Error de validacion Wompi: ${detailedMessages}`;
      } else if (wompiData.error && wompiData.error.reason) {
        errorMessage = wompiData.error.reason;
      }
      return NextResponse.json({ error: errorMessage, debug: wompiData }, { status: 400 });
    }

    // Comentario: Caza de Errores Silenciosos. Wompi devuelve codigo HTTP 200, pero la transaccion nace en estado ERROR.
    // Esto captura la razon exacta del banco y te la envia a la pantalla.
    if (wompiData.data && (wompiData.data.status === 'ERROR' || wompiData.data.status === 'DECLINED')) {
      const statusMsg = wompiData.data.status_message || "La pasarela declino la transaccion al instante.";
      return NextResponse.json({ error: `Wompi rechazo el pago: ${statusMsg}`, debug: wompiData }, { status: 400 });
    }

    // Comentario: Extraccion de la URL del banco
    const urlFinal = wompiData.data.payment_method?.extra?.async_payment_url ||
      wompiData.data.extra?.async_payment_url ||
      wompiData.data.payment_method?.extra?.external_url ||
      wompiData.data.payment_method?.extra?.async_url;

    if ((metodo === 'PSE' || metodo === 'BANCOLOMBIA') && !urlFinal) {
      return NextResponse.json({
        error: `Transaccion PENDIENTE pero sin URL. Revisa la consola o los logs del dashboard de Wompi.`,
        debug: wompiData
      }, { status: 400 });
    }

    return NextResponse.json({
      data: wompiData.data,
      url: urlFinal
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
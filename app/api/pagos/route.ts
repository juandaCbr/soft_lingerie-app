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

    const amountInCents = Math.round(monto * 100);

    // 1. Obtener token de aceptacion
    const acceptanceResponse = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/merchants/${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`);
    if (!acceptanceResponse.ok) {
      throw new Error("No se pudo conectar con Wompi para obtener el token de aceptacion.");
    }
    const merchantData = await acceptanceResponse.json();
    const acceptance_token = merchantData.data.presigned_acceptance.acceptance_token;

    // 2. Firma de integridad
    const integritySecret = process.env.NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET || process.env.WOMPI_INTEGRITY_SECRET;
    if (!integritySecret) {
      console.warn("ADVERTENCIA: WOMPI_INTEGRITY_SECRET no esta configurado.");
    }
    const chainToHash = `${referencia}${amountInCents}COP${integritySecret}`;
    const integrity_signature = crypto.createHash('sha256').update(chainToHash).digest('hex');

    // 3. Forzar origen HTTPS seguro para la redireccion en produccion
    const redirectUrlValid = `https://soft-lingerie-app.vercel.app/gracias?ref=${referencia}`;

    let transactionPayload: any = {
      amount_in_cents: amountInCents,
      currency: "COP",
      customer_email: email || "cliente@softlingerie.com",
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
      // Se elimina el fallback de '123456789'. Si llega vacio, enviamos el error desde el backend.
      if (!paymentData.docNumber) {
        return NextResponse.json({ error: "PSE requiere el numero de documento del pagador." }, { status: 400 });
      }
      transactionPayload.payment_method = {
        type: "PSE",
        user_type: parseInt(paymentData.userType || "0"),
        user_legal_id_type: paymentData.docType || "CC",
        user_legal_id: String(paymentData.docNumber).trim(),
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
        errorMessage = `Error de validacion: ${detailedMessages}`;
      } else {
        errorMessage = wompiData.error?.reason || wompiData.error?.type || errorMessage;
      }
      return NextResponse.json({ error: errorMessage, debug: wompiData }, { status: 400 });
    }

    // Evaluacion de estados silenciosos de rechazo
    if (wompiData.data && (wompiData.data.status === 'ERROR' || wompiData.data.status === 'DECLINED')) {
       return NextResponse.json({ 
           error: `Wompi declino la transaccion. Motivo: ${wompiData.data.status_message || 'Rechazo del banco'}`, 
           debug: wompiData 
       }, { status: 400 });
    }

    const urlFinal = wompiData.data.payment_method?.extra?.async_payment_url || 
                     wompiData.data.extra?.async_payment_url ||
                     wompiData.data.payment_method?.extra?.external_url ||
                     wompiData.data.payment_method?.extra?.async_url;

    // Control del error de URL no generada
    if ((metodo === 'PSE' || metodo === 'BANCOLOMBIA') && !urlFinal) {
        return NextResponse.json({ 
            error: "El banco no genero el enlace. Verifica: 1. Monto mayor a $10.000. 2. Cedula real. 3. Que PSE/Bancolombia esten ACTIVOS en tu dashboard de Wompi.", 
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
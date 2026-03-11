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

    // Comentario: 1. Obtener token de aceptacion
    const acceptanceResponse = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/merchants/${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`);
    if (!acceptanceResponse.ok) {
      throw new Error("No se pudo conectar con Wompi para obtener el token de aceptacion.");
    }
    const merchantData = await acceptanceResponse.json();
    const acceptance_token = merchantData.data.presigned_acceptance.acceptance_token;

    // Comentario: 2. Firma de integridad
    const integritySecret = process.env.NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET || process.env.WOMPI_INTEGRITY_SECRET;
    if (!integritySecret) {
      console.warn("ADVERTENCIA: WOMPI_INTEGRITY_SECRET no esta configurado.");
    }
    const chainToHash = `${referencia}${amountInCents}COP${integritySecret}`;
    const integrity_signature = crypto.createHash('sha256').update(chainToHash).digest('hex');

    // Comentario: 3. Determinar origen para redireccion
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || "https://soft-lingerie-app.vercel.app";

    let transactionPayload: any = {
      amount_in_cents: amountInCents,
      currency: "COP",
      customer_email: email,
      reference: referencia,
      signature: integrity_signature,
      acceptance_token: acceptance_token,
      redirect_url: `${origin}/gracias?ref=${referencia}`,
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
      // Comentario: Estructura estricta exigida por Wompi para PSE
      transactionPayload.payment_method = {
        type: "PSE",
        user_type: parseInt(paymentData.userType || "0"),
        user_legal_id_type: paymentData.docType || "CC",
        user_legal_id: String(paymentData.docNumber || "").trim(),
        financial_institution_code: String(paymentData.bankPSE),
        payment_description: "Pedido Soft Lingerie"
      };
    } else if (metodo === 'BANCOLOMBIA') {
      // Comentario: Estructura estricta exigida por Wompi para Bancolombia
      transactionPayload.payment_method = {
        type: "BANCOLOMBIA_TRANSFER",
        user_type: "PERSON",
        payment_description: "Pedido Soft Lingerie"
      };
    }

    console.log("PAYLOAD ENVIADO A WOMPI:", JSON.stringify(transactionPayload, null, 2));

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
      console.error("ERROR REAL WOMPI:", JSON.stringify(wompiData));

      let errorMessage = "Error en la pasarela";
      if (wompiData.error) {
        if (wompiData.error.messages) {
          const detailedMessages = Object.entries(wompiData.error.messages)
            .map(([field, msgs]: [string, any]) => `${field}: ${msgs.join(', ')}`)
            .join(' | ');
          errorMessage = `Error de validacion: ${detailedMessages}`;
        } else {
          errorMessage = wompiData.error.reason || wompiData.error.type || errorMessage;
        }
      }

      return NextResponse.json({ error: errorMessage, debug: wompiData }, { status: 400 });
    }

    // Comentario: Busqueda exhaustiva de la URL de redireccion en la respuesta de Wompi
    const urlFinal = wompiData.data.payment_method?.extra?.async_payment_url ||
      wompiData.data.extra?.async_payment_url ||
      wompiData.data.payment_method?.extra?.external_url ||
      wompiData.data.payment_method?.extra?.async_url;

    if ((metodo === 'PSE' || metodo === 'BANCOLOMBIA') && !urlFinal) {
      console.error("Wompi no devolvio URL para PSE/Bancolombia:", JSON.stringify(wompiData));
    }

    return NextResponse.json({
      data: wompiData.data,
      url: urlFinal
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
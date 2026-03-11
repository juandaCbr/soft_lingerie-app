import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { metodo, paymentData, referencia, monto, email } = body;

    // Convertir monto a centavos para Wompi
    const amountInCents = monto * 100;

    // 1. Obtener la sesión de aceptación de Wompi (obligatorio legalmente)
    const acceptanceResponse = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/merchants/${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`);
    const merchantData = await acceptanceResponse.json();
    const acceptance_token = merchantData.data.presigned_acceptance.acceptance_token;

    let transactionPayload: any = {
      amount_in_cents: amountInCents,
      currency: "COP",
      customer_email: email,
      reference: referencia,
      payment_method: {},
      acceptance_token
    };

    // 2. Configurar el método de pago específico
    if (metodo === 'NEQUI') {
      transactionPayload.payment_method = {
        type: "NEQUI",
        phone_number: paymentData.phoneNequi
      };
    } else if (metodo === 'CARD') {
      // Nota: En producción, el número de tarjeta debe ser tokenizado primero en el frontend
      // Por ahora configuramos la estructura base para la API
      transactionPayload.payment_method = {
        type: "CARD",
        installments: 1,
        token: paymentData.token // Este token vendrá del frontend
      };
    } else if (metodo === 'PSE') {
      transactionPayload.payment_method = {
        type: "PSE",
        user_type: Number(paymentData.userType),
        user_legal_id_type: paymentData.docType,
        user_legal_id: paymentData.docNumber,
        financial_institution_code: paymentData.bankPSE,
        payment_description: `Compra en Soft Lingerie - Ref: ${referencia}`
      };
    }

    // 3. Enviar transacción a Wompi
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
      return NextResponse.json({ error: wompiData.error?.messages || 'Error en la pasarela' }, { status: 400 });
    }

    return NextResponse.json({ data: wompiData.data });

  } catch (error: any) {
    console.error('Error procesando pago:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

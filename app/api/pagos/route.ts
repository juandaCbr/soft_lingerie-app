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

    // 1. Get Acceptance Token
    const acceptanceResponse = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/merchants/${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`);
    const merchantData = await acceptanceResponse.json();
    const acceptance_token = merchantData.data.presigned_acceptance.acceptance_token;

    // 2. Generate Integrity Signature
    const integritySecret = process.env.NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET;
    const chainToHash = `${referencia}${amountInCents}COP${integritySecret}`;
    const integrity_signature = crypto.createHash('sha256').update(chainToHash).digest('hex');

    const redirectUrl = `${req.headers.get('origin')}/gracias?ref=${referencia}`;

    // Base Payload according to standard Transacciones API
    let transactionPayload: any = {
      amount_in_cents: amountInCents,
      currency: "COP",
      customer_email: email,
      reference: referencia,
      signature: integrity_signature,
      acceptance_token: acceptance_token,
      redirect_url: redirectUrl,
      payment_method: {
        type: ""
      }
    };

    if (metodo === 'NEQUI') {
      transactionPayload.payment_method = {
        type: "NEQUI",
        phone_number: paymentData.phoneNequi
      };
    } else if (metodo === 'CARD') {
      transactionPayload.payment_method = {
        type: "CARD",
        installments: 1,
        token: paymentData.token
      };
    } else if (metodo === 'PSE') {
      transactionPayload.payment_method = {
        type: "PSE",
        user_type: parseInt(paymentData.userType || "0"),
        user_legal_id_type: paymentData.docType,
        user_legal_id: String(paymentData.docNumber).trim(),
        financial_institution_code: String(paymentData.bankPSE),
        payment_description: "Compra Soft Lingerie"
      };
    } else if (metodo === 'BANCOLOMBIA') {
      transactionPayload.payment_method = {
        type: "BANCOLOMBIA_TRANSFER",
        user_type: "PERSON",
        payment_description: "Compra Soft Lingerie"
      };
    }

    // According to docs, for some methods customer_data might be required
    transactionPayload.customer_data = {
      phone_number: telefono.replace(/\D/g, '').substring(0, 10),
      full_name: nombre.substring(0, 50)
    };

    console.log("FINAL PAYLOAD:", JSON.stringify(transactionPayload));

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
      console.error("WOMPI ERROR RESPONSE:", JSON.stringify(wompiData));
      let msg = "Error en la pasarela";
      if (wompiData.error?.messages) {
        msg = Object.entries(wompiData.error.messages)
          .map(([f, m]) => `${f}: ${m}`)
          .join(", ");
      } else if (wompiData.error?.reason) {
        msg = wompiData.error.reason;
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ data: wompiData.data });

  } catch (error: any) {
    console.error("CATCH ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

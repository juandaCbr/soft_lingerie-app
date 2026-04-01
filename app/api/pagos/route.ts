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
    const { metodo, paymentData, referencia, monto, email, nombre, telefono, ciudad } = body;

    const amountInCents = Math.round(monto * 100);

    // 1. Obtener token de aceptacion
    const acceptanceResponse = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/merchants/${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`);
    if (!acceptanceResponse.ok) {
      throw new Error("No se pudo conectar con Wompi para obtener el token de aceptacion.");
    }
    const merchantData = await acceptanceResponse.json();
    const acceptance_token = merchantData.data.presigned_acceptance.acceptance_token;
    const personal_data_auth_token = merchantData.data.presigned_personal_data_auth?.acceptance_token;

    // 2. Firma de integridad
    const integritySecret = process.env.NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET || process.env.WOMPI_INTEGRITY_SECRET;
    if (!integritySecret) {
      console.warn("ADVERTENCIA: WOMPI_INTEGRITY_SECRET no esta configurado.");
    }
    const chainToHash = `${referencia}${amountInCents}COP${integritySecret}`;
    const integrity_signature = crypto.createHash('sha256').update(chainToHash).digest('hex');

    // 3. Determinar URL de redireccion dinamicamente
    const origin = req.headers.get('origin') || 'https://soft-lingerie-app.vercel.app';
    const redirectUrlValid = `${origin}/gracias?ref=${referencia}${ciudad ? '&city=' + encodeURIComponent(ciudad) : ''}`;

    // Limpieza de telefono para Colombia (10 digitos empezando por 3)
    let rawPhone = (telefono || "3000000000").replace(/\D/g, '');
    if (rawPhone.startsWith('57') && rawPhone.length > 10) {
      rawPhone = rawPhone.substring(2);
    }
    const cleanPhone = rawPhone.substring(0, 10);

    let transactionPayload: any = {
      amount_in_cents: amountInCents,
      currency: "COP",
      customer_email: email?.trim().toLowerCase() || "cliente@softlingerie.com",
      reference: referencia,
      signature: integrity_signature,
      acceptance_token: acceptance_token,
      personal_data_auth_token: personal_data_auth_token,
      redirect_url: redirectUrlValid,
      customer_data: {
        phone_number: cleanPhone,
        full_name: (nombre || "Cliente Soft").trim().substring(0, 50)
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
    } else if (metodo === 'PSE' || metodo === 'BANCOLOMBIA') {
      // Solo PSE y Bancolombia usan el Checkout Web Hosted de Wompi
      const amountInCents = Math.round(monto * 100);
      
      // Asegurarnos de usar la llave pública correcta
      const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || merchantData.data.public_key;
      
      if (!publicKey) {
        throw new Error("Llave pública de Wompi no encontrada en las variables de entorno.");
      }

      // IMPORTANTE: El parámetro se debe llamar 'signature:integrity'
      const hostedUrl = `https://checkout.wompi.co/p/?public-key=${publicKey}&currency=COP&amount-in-cents=${amountInCents}&reference=${referencia}&signature:integrity=${integrity_signature}&redirect-url=${encodeURIComponent(redirectUrlValid)}`;
      
      console.log("Generando URL Hosted:", hostedUrl);

      return NextResponse.json({ 
          url: hostedUrl 
      });
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
    console.log("RESPUESTA WOMPI:", JSON.stringify(wompiData, null, 2));

    if (!wompiRes.ok) {
      let errorMessage = "Error en la pasarela";
      if (wompiData.error && wompiData.error.messages) {
        const detailedMessages = Object.entries(wompiData.error.messages)
          .map(([field, msgs]: [string, any]) => {
            const msgStr = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
            return `${field}: ${msgStr}`;
          })
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

    const urlFinal = wompiData.data?.payment_method?.extra?.async_payment_url || 
                     wompiData.data?.payment_method?.extra?.external_url ||
                     wompiData.data?.payment_method?.extra?.external_resource_url ||
                     wompiData.data?.payment_method?.extra?.async_url ||
                     wompiData.data?.extra?.async_payment_url ||
                     wompiData.data?.extra?.external_url ||
                     wompiData.data?.payment_method?.async_payment_url ||
                     wompiData.data?.payment_method?.external_url;

    // Control del error de URL no generada
    if ((metodo === 'PSE' || metodo === 'BANCOLOMBIA' || metodo === 'DAVIPLATA') && !urlFinal) {
        const motivoExtra = wompiData.data?.status_message || "Wompi no entregó URL de redirección";
        const bankCode = transactionPayload.payment_method?.financial_institution_code || `Directo (${metodo})`;
        return NextResponse.json({ 
            error: `El banco no generó el enlace. Motivo: ${motivoExtra}. (Metodo: ${bankCode}). Verifica que el método esté ACTIVO en tu Dashboard de Wompi.`, 
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
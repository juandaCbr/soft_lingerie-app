"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink } from 'lucide-react';

interface BotonWompiProps {
    montoTotal: number;
    referenciaPedido: string;
    onExito: (datos: any) => void;
    disabled?: boolean;
    metodo?: string | null;
    paymentData?: any;
    email?: string;
    nombre?: string;
    telefono?: string;
}

export default function BotonWompi({
    montoTotal, referenciaPedido, onExito, disabled, metodo, paymentData, email, nombre, telefono
}: BotonWompiProps) {
    const [cargando, setCargando] = useState(false);
    const [verificando, setVerificando] = useState(false);
    const [urlRedireccion, setUrlRedireccion] = useState<string | null>(null);

    // Comentario: Sistema de polling para Nequi y transferencias asincronas
    const iniciarPolling = (transactionId: string) => {
        setVerificando(true);
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/transactions/${transactionId}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`
                    }
                });
                const { data } = await res.json();
                if (data.status === 'APPROVED') {
                    clearInterval(interval);
                    onExito(data);
                } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(data.status)) {
                    clearInterval(interval);
                    const motivo = data.status_message || "Wompi declinó la transacción.";
                    toast.error(`Pago fallido: ${motivo}`);
                    setVerificando(false);
                }
            } catch (e) { /* Captura silenciosa para no ensuciar la consola */ }
        }, 4000);
    };

    const procesarPagoNativo = async () => {
        if (!metodo) {
            toast.error("Elige un método de pago");
            return;
        }

        // Comentario: Barrera de contencion.
        if (metodo === 'NEQUI' && (!paymentData?.phoneNequi)) {
            toast.error("Ingresa tu número de celular para Nequi");
            return;
        }

        setCargando(true);
        setUrlRedireccion(null);

        try {
            let finalPaymentData = { ...paymentData };

            // Comentario: Tokenizacion para tarjeta
            if (metodo === 'CARD') {
                if (!paymentData?.cardNumber || !paymentData?.expiry || !paymentData?.cvv) {
                    toast.error("Completa todos los datos de la tarjeta");
                    setCargando(false);
                    return;
                }
                const parts = paymentData.expiry.split('/').map((s: string) => s.replace(/\D/g, '').trim());
                const resToken = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/tokens/cards`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}` },
                    body: JSON.stringify({
                        number: paymentData.cardNumber.replace(/\D/g, ''),
                        cvc: paymentData.cvv.trim(),
                        exp_month: parts[0].padStart(2, '0'),
                        exp_year: parts[1].slice(-2),
                        card_holder: paymentData.cardHolder.trim()
                    })
                });
                const tokenRes = await resToken.json();
                if (!resToken.ok) throw new Error(tokenRes.error?.reason || "Datos de tarjeta inválidos");
                finalPaymentData.token = tokenRes.data.id;
            }

            // Comentario: Llamada a tu API centralizada
            const res = await fetch('/api/pagos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metodo,
                    paymentData: finalPaymentData,
                    referencia: referenciaPedido,
                    monto: montoTotal,
                    email,
                    nombre,
                    telefono
                })
            });

            const result = await res.json();

            if (!res.ok) {
                console.error("DETALLE ERROR API PAGOS:", result);
                throw new Error(result.error || "Error al procesar el pago");
            }

            // Comentario: Redireccion automatica y manejo de respuestas
            if (result.url) {
                setUrlRedireccion(result.url);
                // Redireccion instantanea para mejorar la experiencia (friccion cero)
                window.location.href = result.url;

            } else if (metodo === 'NEQUI' && result.data?.status === 'PENDING') {
                toast.success("Revisa tu app Nequi para aprobar el pago");
                iniciarPolling(result.data.id);
            } else if (result.data?.status === 'APPROVED') {
                onExito(result.data);
            } else if (metodo === 'PSE' || metodo === 'BANCOLOMBIA' || metodo === 'DAVIPLATA') {
                throw new Error(result.error || "El banco no generó el enlace. Revisa tu Dashboard de Wompi.");
            } else {
                iniciarPolling(result.data.id);
            }
        } catch (error: any) {
            toast.error(error.message || "Fallo en la pasarela de pagos");
        } finally {
            setCargando(false);
        }
    };

    if (urlRedireccion) {
        return (
            <a href={urlRedireccion} className="w-full bg-green-600 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-green-700 transition-all border-4 border-white animate-in zoom-in">
                <ExternalLink size={20} /> ABRIENDO PORTAL SEGURO...
            </a>
        );
    }

    if (verificando) {
        return (
            <div className="w-full bg-[#fdf8f6] p-8 rounded-2xl border-2 border-[#4a1d44]/10 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-[#4a1d44]/20 border-t-[#4a1d44] rounded-full animate-spin mx-auto" />
                <p className="text-[10px] font-black uppercase text-[#4a1d44]">Esperando confirmación...</p>
            </div>
        );
    }

    return (
        <button type="button" disabled={disabled || cargando} onClick={procesarPagoNativo} className="w-full bg-[#4a1d44] text-white py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#5c2454] transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
            {cargando ? "Procesando de forma segura..." : "Finalizar pedido ahora"}
        </button>
    );
}
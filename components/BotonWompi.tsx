"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';

interface BotonWompiProps {
    montoTotal: number;
    referenciaPedido: string;
    onExito: (datos: any) => void;
    disabled?: boolean;
    metodo?: string | null;
    paymentData?: any;
    email?: string;
}

export default function BotonWompi({ 
    montoTotal, 
    referenciaPedido, 
    onExito, 
    disabled, 
    metodo, 
    paymentData, 
    email 
}: BotonWompiProps) {
    const [cargando, setCargando] = useState(false);

    const obtenerTokenTarjeta = async () => {
        const cleanNumber = paymentData.cardNumber.replace(/\s/g, '');
        const [month, year] = paymentData.expiry.split('/');
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/tokens/cards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`
            },
            body: JSON.stringify({
                number: cleanNumber,
                cvc: paymentData.cvv,
                exp_month: month.trim(),
                exp_year: year.trim().length === 2 ? `20${year.trim()}` : year.trim(),
                card_holder: paymentData.cardHolder
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.reason || "Datos de tarjeta inválidos");
        return result.data.id;
    };

    const procesarPagoNativo = async () => {
        if (!metodo) {
            toast.error("Selecciona un método de pago");
            return;
        }

        setCargando(true);
        try {
            let finalPaymentData = { ...paymentData };

            // Si es tarjeta, primero tokenizamos
            if (metodo === 'CARD') {
                toast.loading("Validando tarjeta...", { id: 'pago-loading' });
                const token = await obtenerTokenTarjeta();
                finalPaymentData.token = token;
            }

            const res = await fetch('/api/pagos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metodo,
                    paymentData: finalPaymentData,
                    referencia: referenciaPedido,
                    monto: montoTotal,
                    email
                })
            });

            const result = await res.json();
            toast.dismiss('pago-loading');

            if (!res.ok || result.error) {
                toast.error(result.error || "Error al procesar el pago");
                return;
            }

            const data = result.data;

            if (metodo === 'PSE' && data.extra?.async_payment_url) {
                window.location.href = data.extra.async_payment_url;
            } else if (metodo === 'NEQUI' && data.status === 'PENDING') {
                toast.success("Notificación enviada a tu Nequi");
                onExito(data);
            } else {
                onExito(data);
            }

        } catch (error: any) {
            toast.dismiss('pago-loading');
            toast.error(error.message || "Error en la pasarela");
        } finally {
            setCargando(false);
        }
    };

    return (
        <button
            type="button"
            disabled={disabled || cargando}
            onClick={procesarPagoNativo}
            className="w-full bg-[#4a1d44] text-white py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#5c2454] transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
        >
            {cargando ? (
                <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Procesando...
                </>
            ) : (
                "Finalizar pedido ahora"
            )}
        </button>
    );
}

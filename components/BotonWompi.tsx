"use client";

import { useState, useEffect } from 'react';
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
    const [verificando, setVerificando] = useState(false);

    // Función para revisar el estado de una transacción (Polling)
    const revisarEstadoTransaccion = async (transactionId: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/transactions/${transactionId}`);
            const { data } = await res.json();
            
            if (data.status === 'APPROVED') {
                onExito(data);
                return true;
            } else if (data.status === 'DECLINED' || data.status === 'VOIDED' || data.status === 'ERROR') {
                toast.error("El pago no pudo ser completado.");
                setVerificando(false);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    const iniciarPolling = (transactionId: string) => {
        setVerificando(true);
        const interval = setInterval(async () => {
            const finalizado = await revisarEstadoTransaccion(transactionId);
            if (finalizado) clearInterval(interval);
        }, 3500);

        // Limite de 2 minutos para el polling
        setTimeout(() => {
            clearInterval(interval);
            if (verificando) {
                setVerificando(false);
                toast.error("Tiempo de espera agotado. Si ya pagaste, verifica tu correo en unos minutos.");
            }
        }, 120000);
    };

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

            if (metodo === 'CARD') {
                toast.loading("Tokenizando tarjeta...", { id: 'pago-loading' });
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

            // Manejo de redirecciones
            if ((metodo === 'PSE' || metodo === 'BANCOLOMBIA') && data.extra?.async_payment_url) {
                toast.loading("Redirigiendo al portal bancario...");
                window.location.href = data.extra.async_payment_url;
            } else if (metodo === 'NEQUI' && data.status === 'PENDING') {
                toast.success("Notificación enviada. Por favor autoriza en tu App Nequi.");
                iniciarPolling(data.id);
            } else if (data.status === 'APPROVED') {
                onExito(data);
            } else {
                // Para otros estados pendientes, también iniciamos polling
                iniciarPolling(data.id);
            }

        } catch (error: any) {
            toast.dismiss('pago-loading');
            toast.error(error.message || "Error en la pasarela");
        } finally {
            setCargando(false);
        }
    };

    if (verificando) {
        return (
            <div className="w-full bg-[#fdf8f6] p-8 rounded-[2rem] border-2 border-[#4a1d44]/10 text-center space-y-4 animate-pulse">
                <div className="w-10 h-10 border-4 border-[#4a1d44]/20 border-t-[#4a1d44] rounded-full animate-spin mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest text-[#4a1d44]">Verificando tu pago...</p>
                <p className="text-[10px] opacity-60">No cierres esta ventana mientras confirmamos la transacción.</p>
            </div>
        );
    }

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

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

    const procesarPagoNativo = async () => {
        if (!metodo) {
            toast.error("Selecciona un método de pago");
            return;
        }

        // Validaciones básicas antes de enviar
        if (metodo === 'NEQUI' && !paymentData.phoneNequi) {
            toast.error("Ingresa tu número de Nequi");
            return;
        }
        if (metodo === 'PSE' && (!paymentData.bankPSE || !paymentData.docNumber)) {
            toast.error("Completa los datos de PSE");
            return;
        }

        setCargando(true);
        try {
            const res = await fetch('/api/pagos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metodo,
                    paymentData,
                    referencia: referenciaPedido,
                    monto: montoTotal,
                    email
                })
            });

            const result = await res.json();

            if (!res.ok || result.error) {
                toast.error(result.error || "Error al procesar el pago");
                return;
            }

            const data = result.data;

            // Manejo de flujos específicos
            if (metodo === 'PSE' && data.extra?.async_payment_url) {
                toast.loading("Redirigiendo al banco...");
                window.location.href = data.extra.async_payment_url;
            } else if (metodo === 'NEQUI' && data.status === 'PENDING') {
                toast.success("¡Listo! Revisa tu App Nequi y acepta el pago.", { duration: 6000 });
                onExito(data);
            } else {
                onExito(data);
            }

        } catch (error) {
            console.error("Error nativo:", error);
            toast.error("Error de conexión con la pasarela");
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

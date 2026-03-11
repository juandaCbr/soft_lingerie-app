"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, ArrowRight } from 'lucide-react';

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
    const [urlRedireccion, setUrlRedireccion] = useState<string | null>(null);

    const revisarEstadoTransaccion = async (transactionId: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/transactions/${transactionId}`);
            const { data } = await res.json();
            if (data.status === 'APPROVED') {
                onExito(data);
                return true;
            } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(data.status)) {
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
            if (await revisarEstadoTransaccion(transactionId)) clearInterval(interval);
        }, 4000);
        setTimeout(() => {
            clearInterval(interval);
            if (verificando) {
                setVerificando(false);
                toast.error("Tiempo de espera agotado.");
            }
        }, 180000);
    };

    const obtenerTokenTarjeta = async () => {
        const cleanNumber = paymentData.cardNumber.replace(/\D/g, '');
        const expiryParts = paymentData.expiry.split('/').map(s => s.replace(/\D/g, '').trim());
        if (expiryParts.length < 2) throw new Error("Fecha incompleta");
        const exp_month = expiryParts[0].padStart(2, '0');
        const exp_year = expiryParts[1].slice(-2);

        const response = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/tokens/cards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`
            },
            body: JSON.stringify({
                number: cleanNumber,
                cvc: paymentData.cvv.trim(),
                exp_month,
                exp_year,
                card_holder: paymentData.cardHolder.trim()
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.reason || "Datos de tarjeta inválidos");
        return result.data.id;
    };

    const procesarPagoNativo = async () => {
        if (!metodo) { toast.error("Selecciona un método de pago"); return; }
        if (metodo === 'PSE' && !paymentData.bankPSE) { toast.error("Selecciona tu banco"); return; }

        setCargando(true);
        setUrlRedireccion(null);
        try {
            let finalPaymentData = { ...paymentData };
            if (metodo === 'CARD') {
                toast.loading("Validando tarjeta...", { id: 'pago-loading' });
                finalPaymentData.token = await obtenerTokenTarjeta();
            }

            const res = await fetch('/api/pagos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ metodo, paymentData: finalPaymentData, referencia: referenciaPedido, monto: montoTotal, email })
            });

            const result = await res.json();
            toast.dismiss('pago-loading');

            if (!res.ok) {
                toast.error(result.error || "Error en el pago");
                return;
            }

            const data = result.data;
            const asyncUrl = data.extra?.async_payment_url || data.payment_method?.extra?.async_payment_url;

            if (asyncUrl) {
                // En lugar de redirigir automático, mostramos el botón manual para mayor seguridad
                setUrlRedireccion(asyncUrl);
                toast.success("Enlace de pago generado con éxito");
            } else if (metodo === 'NEQUI' && data.status === 'PENDING') {
                toast.success("¡Revisa tu celular!");
                iniciarPolling(data.id);
            } else if (data.status === 'APPROVED') {
                onExito(data);
            } else {
                iniciarPolling(data.id);
            }
        } catch (error: any) {
            toast.dismiss('pago-loading');
            toast.error(error.message || "Error en la pasarela");
        } finally {
            setCargando(false);
        }
    };

    // VISTA CUANDO EL ENLACE ESTÁ LISTO (PSE / BANCOLOMBIA)
    if (urlRedireccion) {
        return (
            <div className="w-full space-y-4 animate-in zoom-in duration-300">
                <a 
                    href={urlRedireccion}
                    className="w-full bg-green-600 text-white py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-2 shadow-2xl hover:bg-green-700 transition-all border-4 border-white"
                >
                    <ExternalLink size={24} />
                    ¡CLICK AQUÍ PARA IR AL BANCO!
                </a>
                <p className="text-[9px] text-center opacity-50 font-bold uppercase tracking-widest">
                    Haz click arriba para finalizar el pago de forma segura
                </p>
            </div>
        );
    }

    if (verificando) {
        return (
            <div className="w-full bg-[#fdf8f6] p-8 rounded-[2rem] border-2 border-[#4a1d44]/10 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-[#4a1d44]/20 border-t-[#4a1d44] rounded-full animate-spin mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest text-[#4a1d44]">Verificando tu pago...</p>
            </div>
        );
    }

    return (
        <button type="button" disabled={disabled || cargando} onClick={procesarPagoNativo} className="w-full bg-[#4a1d44] text-white py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#5c2454] transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
            {cargando ? "Generando pago..." : "Finalizar pedido ahora"}
        </button>
    );
}

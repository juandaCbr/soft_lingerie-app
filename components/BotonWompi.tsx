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

    const iniciarPolling = (transactionId: string) => {
        setVerificando(true);
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/transactions/${transactionId}`);
                const { data } = await res.json();
                if (data.status === 'APPROVED') {
                    clearInterval(interval);
                    onExito(data);
                } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(data.status)) {
                    clearInterval(interval);
                    toast.error("El pago fue rechazado.");
                    setVerificando(false);
                }
            } catch (e) { /* ignore */ }
        }, 4000);
    };

    const procesarPagoNativo = async () => {
        setCargando(true);
        setUrlRedireccion(null);
        try {
            let finalPaymentData = { ...paymentData };
            if (metodo === 'CARD') {
                const parts = paymentData.expiry.split('/').map((s:string) => s.replace(/\D/g, '').trim());
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
                const tokenData = await resToken.json();
                if (!resToken.ok) throw new Error(tokenData.error?.reason || "Tarjeta inválida");
                finalPaymentData.token = tokenData.data.id;
            }

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
            if (!res.ok) throw new Error(result.error || "Error en el servidor");

            const data = result.data;
            const asyncUrl = data.extra?.async_payment_url || data.payment_method?.extra?.async_payment_url;

            if (asyncUrl) {
                setUrlRedireccion(asyncUrl);
            } else if (metodo === 'NEQUI' && data.status === 'PENDING') {
                toast.success("¡Notificación enviada!");
                iniciarPolling(data.id);
            } else if (data.status === 'APPROVED') {
                onExito(data);
            }
        } catch (error: any) {
            toast.error(error.message || "Error en la pasarela");
        } finally {
            setCargando(false);
        }
    };

    if (urlRedireccion) {
        return (
            <a href={urlRedireccion} className="w-full bg-green-600 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl">
                <ExternalLink size={20} /> ¡IR AL BANCO AHORA!
            </a>
        );
    }

    if (verificando) {
        return (
            <div className="w-full bg-[#fdf8f6] p-8 rounded-2xl border-2 border-[#4a1d44]/10 text-center animate-pulse">
                <p className="text-xs font-black uppercase text-[#4a1d44]">Verificando tu pago...</p>
            </div>
        );
    }

    return (
        <button type="button" disabled={disabled || cargando} onClick={procesarPagoNativo} className="w-full bg-[#4a1d44] text-white py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#5c2454] transition-all shadow-xl active:scale-95 disabled:opacity-50">
            {cargando ? "Generando pago..." : "Finalizar pedido ahora"}
        </button>
    );
}

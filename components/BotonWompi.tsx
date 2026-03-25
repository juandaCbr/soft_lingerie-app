"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';

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
    pedidoId?: string | null; // Nuevo prop para vigilar el pedido en DB
}

export default function BotonWompi({
    montoTotal, referenciaPedido, onExito, disabled, metodo, paymentData, email, nombre, telefono, pedidoId
}: BotonWompiProps) {
    const [cargando, setCargando] = useState(false);
    const [verificando, setVerificando] = useState(false);
    const [urlRedireccion, setUrlRedireccion] = useState<string | null>(null);

    // Sistema de Realtime para confirmacion instantanea via DB
    useEffect(() => {
        if (!pedidoId || !verificando) return;

        console.log("Iniciando vigilancia Realtime para pedido:", pedidoId);
        
        const channel = supabase
            .channel(`pago-${pedidoId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'ventas_realizadas', filter: `id=eq.${pedidoId}` },
                (payload) => {
                    console.log("Cambio detectado en pedido via Realtime:", payload);
                    if (payload.new.estado_pago === 'APROBADO') {
                        toast.success("¡Pago confirmado por el sistema!");
                        onExito(payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [pedidoId, verificando, onExito]);

    // Comentario: Sistema de polling (Fallback en caso de que Realtime falle o sea lento)
    const iniciarPolling = (transactionId: string) => {
        setVerificando(true);
        const interval = setInterval(async () => {
            try {
                // Agregamos cache: 'no-store' para forzar datos frescos de Wompi
                const res = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/transactions/${transactionId}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`
                    },
                    cache: 'no-store'
                });
                const { data } = await res.json();
                
                if (data.status === 'APPROVED') {
                    clearInterval(interval);
                    onExito(data);
                } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(data.status)) {
                    clearInterval(interval);
                    const motivo = data.status_message || "La transacción no pudo ser procesada.";
                    toast.error(`Pago fallido: ${motivo}`);
                    setVerificando(false);
                }
            } catch (e) { /* Captura silenciosa */ }
        }, 3000); 
    };

    const procesarPagoNativo = async () => {
        if (!metodo) {
            toast.error("Elige un método de pago");
            return;
        }

        if (metodo === 'NEQUI' && (!paymentData?.phoneNequi)) {
            toast.error("Ingresa tu número de celular para Nequi");
            return;
        }

        // Se eliminó la validación de PSE aquí porque ahora usamos el portal Hosted de Wompi

        setCargando(true);
        setUrlRedireccion(null);

        try {
            let finalPaymentData = { ...paymentData };
            // ... (resto del código de tokenización de tarjeta se mantiene igual)
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

            if (!res.ok) throw new Error(result.error || "Error al procesar el pago");

            if (result.url) {
                setUrlRedireccion(result.url);
                window.location.href = result.url;
            } else if (metodo === 'NEQUI' && result.data?.status === 'PENDING') {
                toast.success("¡Notificación enviada! Por favor abre tu App Nequi y acepta el pago.");
                iniciarPolling(result.data.id);
            } else if (result.data?.status === 'APPROVED') {
                onExito(result.data);
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
            <div className="w-full bg-green-600 text-white py-6 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 shadow-xl animate-in zoom-in">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <ExternalLink size={18} /> REDIRIGIENDO AL PORTAL SEGURO...
                </div>
                <p className="text-[8px] opacity-60 normal-case font-medium">No cierres esta ventana</p>
            </div>
        );
    }

    if (verificando) {
        return (
            <div className="w-full bg-white p-8 rounded-[2rem] border-2 border-[#4a1d44]/10 text-center space-y-4 shadow-inner animate-pulse">
                <div className="w-10 h-10 border-4 border-[#4a1d44]/10 border-t-[#4a1d44] rounded-full animate-spin mx-auto" />
                <div>
                    <p className="text-xs font-black uppercase text-[#4a1d44] tracking-widest">Esperando confirmación</p>
                    <p className="text-[9px] text-[#4a1d44]/60 mt-1">Por favor, confirma el pago en tu App Nequi</p>
                </div>
                <div className="pt-2">
                   <p className="text-[8px] italic opacity-40 italic">Esta ventana se actualizará automáticamente apenas confirmes.</p>
                </div>
            </div>
        );
    }

    return (
        <button type="button" disabled={disabled || cargando} onClick={procesarPagoNativo} className="w-full bg-[#4a1d44] text-white py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#5c2454] transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
            {cargando ? "Procesando de forma segura..." : "Finalizar pedido ahora"}
        </button>
    );
}
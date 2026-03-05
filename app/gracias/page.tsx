"use client";

import Link from "next/link";
import { CheckCircle, ShoppingBag, Home, Search, ClipboardCheck } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

function GraciasContent() {
    const [isMounted, setIsMounted] = useState(false);
    const searchParams = useSearchParams();
    const referencia = searchParams.get('ref') || '---';

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const copiarReferencia = () => {
        navigator.clipboard.writeText(referencia);
        toast.success("¡Número de pedido copiado!");
    };

    if (!isMounted) {
        return <div className="min-h-screen bg-[#faf8f7]" />;
    }

    return (
        <main className="min-h-screen bg-[#faf8f7] flex flex-col items-center justify-center p-6 text-center text-[#4a1d44]">
            <div className="bg-white p-8 md:p-16 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(74,29,68,0.12)] max-w-2xl w-full border border-white/60 ring-1 ring-[#4a1d44]/5 backdrop-blur-xl">

                <div className="flex justify-center mb-8 animate-in zoom-in duration-500">
                    <div className="bg-green-50 p-6 rounded-full border-8 border-green-100">
                        <CheckCircle className="text-green-500" size={64} strokeWidth={2.5} />
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-black font-playfair uppercase tracking-tighter mb-4 text-[#361531]">
                    ¡Gracias por tu compra!
                </h1>

                <p className="text-base md:text-lg opacity-70 mb-8 leading-relaxed max-w-lg mx-auto">
                    Tu pago ha sido procesado con éxito. Hemos recibido tu pedido y estamos preparando todo para el envío.
                </p>

                {/* CUADRO DE REFERENCIA */}
                <div className="bg-[#fdf8f6] p-6 rounded-3xl border border-[#4a1d44]/5 mb-10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Número de Pedido</p>
                    <div className="flex items-center justify-center gap-3">
                        <code className="text-xl md:text-2xl font-black tracking-tight text-[#4a1d44]">{referencia}</code>
                        <button onClick={copiarReferencia} className="p-2 hover:bg-white rounded-full transition-all text-[#4a1d44]/40 hover:text-[#4a1d44]">
                            <ClipboardCheck size={20} />
                        </button>
                    </div>
                    <p className="text-[9px] mt-3 opacity-40 font-bold italic">Guarda este número para rastrear tu envío</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href={`/rastreo?ref=${referencia}`}
                        className="w-full sm:w-auto bg-[#4a1d44] text-white px-8 py-4 rounded-full font-bold shadow-xl hover:bg-[#5c2454] transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-xs"
                    >
                        <Search size={18} />
                        Rastrear Pedido
                    </Link>

                    <Link
                        href="/productos"
                        className="w-full sm:w-auto bg-white text-[#4a1d44] px-8 py-4 rounded-full font-bold shadow-sm border border-[#4a1d44]/10 hover:bg-[#f2e1d9] hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-xs"
                    >
                        <ShoppingBag size={18} />
                        Seguir Comprando
                    </Link>
                </div>
            </div>
        </main>
    );
}

export default function GraciasPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#faf8f7]" />}>
            <GraciasContent />
        </Suspense>
    );
}
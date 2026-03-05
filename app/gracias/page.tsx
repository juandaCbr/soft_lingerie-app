"use client";

import Link from "next/link";
import { CheckCircle, ShoppingBag, Home } from "lucide-react";
import { useEffect, useState } from "react";

export default function GraciasPage() {
    const [isMounted, setIsMounted] = useState(false);

    // Evitamos errores de hidratacion en Next.js asegurando que el renderizado inicial coincida
    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="min-h-screen bg-[#faf8f7]" />;
    }

    return (
        <main className="min-h-screen bg-[#faf8f7] flex flex-col items-center justify-center p-6 text-center text-[#4a1d44]">
            <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(74,29,68,0.12)] max-w-2xl w-full border border-white/60 ring-1 ring-[#4a1d44]/5 backdrop-blur-xl">

                {/* Icono de exito animado */}
                <div className="flex justify-center mb-8 animate-in zoom-in duration-500">
                    <div className="bg-green-50 p-6 rounded-full border-8 border-green-100">
                        <CheckCircle className="text-green-500" size={64} strokeWidth={2.5} />
                    </div>
                </div>

                {/* Mensajes principales */}
                <h1 className="text-4xl md:text-5xl font-black font-playfair uppercase tracking-tighter mb-4 text-[#361531]">
                    Pago Exitoso
                </h1>

                <p className="text-base md:text-lg opacity-70 mb-10 leading-relaxed max-w-lg mx-auto">
                    Hemos recibido tu pedido correctamente. En breve nos pondremos en contacto contigo para coordinar los detalles del envio. Gracias por confiar en nosotros.
                </p>

                {/* Botones de accion */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/productos"
                        className="w-full sm:w-auto bg-[#4a1d44] text-white px-8 py-4 rounded-full font-bold shadow-xl hover:bg-[#5c2454] transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-xs"
                    >
                        <ShoppingBag size={18} />
                        Seguir Comprando
                    </Link>

                    <Link
                        href="/"
                        className="w-full sm:w-auto bg-white text-[#4a1d44] px-8 py-4 rounded-full font-bold shadow-sm border border-[#4a1d44]/10 hover:bg-[#f2e1d9] hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-xs"
                    >
                        <Home size={18} />
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        </main>
    );
}
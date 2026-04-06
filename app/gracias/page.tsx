"use client";

import Link from "next/link";
import { CheckCircle, ShoppingBag, Search, ClipboardCheck, Bike, Truck } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCart } from "@/context/CartContext";

function GraciasContent() {
    const [isMounted, setIsMounted] = useState(false);
    const searchParams = useSearchParams();
    const [referencia, setReferencia] = useState('---');
    const [ciudad, setCiudad] = useState('');
    const [esValledupar, setEsValledupar] = useState(false);

    const cartContext = useCart();
    const clearCart = cartContext?.clearCart;

    useEffect(() => {
        setIsMounted(true);
        
        // Extraer params de forma segura en el cliente
        const ref = searchParams.get('ref') || '---';
        const city = searchParams.get('city') || '';
        
        setReferencia(ref);
        setCiudad(city);
        setEsValledupar(city.toLowerCase() === 'valledupar');

        // Vaciar el carrito automáticamente al llegar a la página de éxito
        if (clearCart) {
            clearCart();
        }
    }, [searchParams, clearCart]);

    const copiarReferencia = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(referencia);
            toast.success("¡Número de pedido copiado!");
        }
    };

    if (!isMounted) {
        return <div className="min-h-screen bg-[#faf8f7] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#4a1d44]/10 border-t-[#4a1d44] rounded-full animate-spin" />
        </div>;
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
                    Tu pago ha sido procesado con éxito. Hemos recibido tu pedido correctamente.
                </p>

                {/* MENSAJE INTELIGENTE SEGÚN CIUDAD */}
                <div className={`p-8 rounded-[2.5rem] mb-10 border transition-all duration-700 ${esValledupar ? 'bg-pink-50 border-pink-100 shadow-sm' : 'bg-[#fdf8f6] border-[#4a1d44]/5'}`}>
                    {esValledupar ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-white p-4 rounded-full shadow-md text-pink-600 animate-bounce">
                                <Bike size={40} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-pink-700 uppercase tracking-tight">Prioridad Valledupar 💖</h3>
                                <p className="text-sm text-pink-600/80 font-medium mt-2 leading-relaxed">
                                    ¡Estás en nuestra ciudad! Un domiciliario saldrá en breve hacia tu dirección para entregarte <strong>hoy mismo</strong>.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-white p-4 rounded-full shadow-sm text-[#4a1d44]/40">
                                <Truck size={40} />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-widest opacity-40">Envío Nacional</h3>
                                <p className="text-base opacity-60 font-medium mt-2 leading-relaxed">
                                    Estamos preparando tu paquete para entregarlo a la transportadora lo antes posible.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* CUADRO DE REFERENCIA */}
                <div className="bg-white p-6 rounded-3xl border border-[#4a1d44]/10 mb-10 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Referencia de Pedido</p>
                    <div className="flex items-center justify-center gap-3">
                        <code className="text-xl font-black tracking-tight text-[#4a1d44]">{referencia}</code>
                        <button onClick={copiarReferencia} className="p-2 hover:bg-[#fdf8f6] rounded-full transition-all text-[#4a1d44]/60 hover:text-[#4a1d44]">
                            <ClipboardCheck size={20} />
                        </button>
                    </div>
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
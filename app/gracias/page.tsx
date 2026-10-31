"use client";

import Link from "next/link";
import { CheckCircle, ShoppingBag, Search, ClipboardCheck, Bike, Truck } from "lucide-react";
import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCart } from "@/context/CartContext";
import { esCiudadEnvioLocal } from "@/app/lib/checkout-config";
import { HomeCloud, HomeCloudBank } from "@/components/home/HomeCloud";

function GraciasContent() {
    const [isMounted, setIsMounted] = useState(false);
    const searchParams = useSearchParams();
    const [referencia, setReferencia] = useState('---');
    const [ciudad, setCiudad] = useState('');
    const [esValledupar, setEsValledupar] = useState(false);
    const confirmEnviado = useRef(false);

    const cartContext = useCart();
    const clearCart = cartContext?.clearCart;

    useEffect(() => {
        setIsMounted(true);
        
        // Extraer params de forma segura en el cliente
        const ref = searchParams.get('ref') || '---';
        const city = searchParams.get('city') || '';
        
        setReferencia(ref);
        setCiudad(city);
        setEsValledupar(esCiudadEnvioLocal(city));

        // Vaciar el carrito automáticamente al llegar a la página de éxito
        if (clearCart) {
            clearCart();
        }
    }, [searchParams, clearCart]);

    // Tras PSE / checkout hosted, Wompi suele añadir el id de transacción a la URL de retorno.
    useEffect(() => {
        const txId =
            searchParams.get("id") ||
            searchParams.get("transactionId") ||
            searchParams.get("transaction_id");
        const ref = searchParams.get("ref");
        if ((!txId && !ref) || confirmEnviado.current) return;
        confirmEnviado.current = true;
        void fetch("/api/wompi/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId: txId, reference: ref }),
        });
    }, [searchParams]);

    const copiarReferencia = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(referencia);
            toast.success("¡Número de pedido copiado!");
        }
    };

    if (!isMounted) {
        return <div className="min-h-screen bg-cream flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-ink/10 border-t-ink rounded-full animate-spin" />
        </div>;
    }

    return (
        <main className="min-h-screen bg-cream px-2 pb-16 font-display text-ink sm:px-3">
            {/* Celebración en el cielo rosa de la marca */}
            <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-[radial-gradient(130%_90%_at_50%_0%,#d7a9c7_0%,#e5bed7_38%,#f2cbe2_72%,#f6d6e9_100%)] px-6 pb-40 pt-14 text-center md:rounded-[2.75rem] md:pb-48 md:pt-20">
                <HomeCloud fade sizes="20vw" className="left-[-5%] top-[8%] aspect-[2/1] w-[36%] opacity-60 md:w-[14%]" />
                <HomeCloud fade flip sizes="16vw" className="right-[-4%] top-[4%] aspect-[2/1] w-[30%] opacity-50 md:w-[12%]" />

                <div className="relative mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-white text-ink shadow-xl shadow-ink/15 animate-in zoom-in duration-500">
                    <CheckCircle size={40} strokeWidth={2.25} />
                </div>
                <h1 className="relative text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-7xl">
                    ¡Gracias por tu compra!
                </h1>
                <p className="relative mx-auto mt-5 max-w-lg text-base leading-relaxed text-ink/75 md:text-lg">
                    Tu pago ha sido procesado con éxito. Hemos recibido tu pedido correctamente.
                </p>

                <HomeCloudBank className="inset-x-0 bottom-0 top-[80%]" />
            </div>

            <div className="relative z-10 mx-auto -mt-28 max-w-2xl space-y-4 px-2 text-center sm:px-4">
                {/* MENSAJE INTELIGENTE SEGÚN CIUDAD */}
                <div className={`rounded-[2rem] p-6 shadow-xl shadow-ink/10 ring-1 transition-all duration-700 md:p-8 ${esValledupar ? 'bg-ink text-white ring-ink' : 'bg-white ring-ink/5'}`}>
                    {esValledupar ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-accent text-ink">
                                <Bike size={30} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold tracking-[-0.03em]">Prioridad Valledupar 💖</h3>
                                <p className="mt-2 text-base leading-relaxed text-white/75">
                                    ¡Estás en nuestra ciudad! Un domiciliario saldrá en breve hacia tu dirección para entregarte <strong className="text-brand-accent">hoy mismo</strong>.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-accent text-ink">
                                <Truck size={30} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold tracking-[-0.03em]">Envío nacional</h3>
                                <p className="mt-2 text-base leading-relaxed text-ink/70">
                                    Estamos preparando tu paquete para entregarlo a la transportadora lo antes posible.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* CUADRO DE REFERENCIA */}
                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/5">
                    <p className="text-sm font-semibold text-brand-dark">Referencia de pedido</p>
                    <div className="mt-2 flex items-center justify-center gap-3">
                        <code className="font-display text-2xl font-bold tabular-nums tracking-tight text-ink">{referencia}</code>
                        <button onClick={copiarReferencia} aria-label="Copiar referencia" className="grid h-10 w-10 place-items-center rounded-full text-ink/55 transition-colors hover:bg-brand-accent/60 hover:text-ink">
                            <ClipboardCheck size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
                    <Link
                        href={`/rastreo?ref=${referencia}`}
                        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-ink px-8 text-sm font-bold text-white shadow-xl shadow-ink/25 transition-colors hover:bg-brand-dark active:scale-[0.98] sm:w-auto"
                    >
                        <Search size={18} />
                        Rastrear pedido
                    </Link>

                    <Link
                        href="/productos"
                        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-white px-8 text-sm font-bold text-ink ring-1 ring-ink/15 transition-colors hover:bg-brand-accent/50 active:scale-[0.98] sm:w-auto"
                    >
                        <ShoppingBag size={18} />
                        Seguir comprando
                    </Link>
                </div>
            </div>
        </main>
    );
}

export default function GraciasPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-cream" />}>
            <GraciasContent />
        </Suspense>
    );
}
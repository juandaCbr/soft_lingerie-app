"use client";

import { useCart } from "@/context/CartContext";
import { Trash2, ArrowLeft, Plus, Minus, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { getProductoImage, withSupabaseListThumbnailParams } from "@/app/lib/image-helper";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, totalPrice, totalItems } = useCart();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const cartOrdenado = useMemo(() => {
    return [...cart].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  }, [cart]);

  // Prevenir Hydration Mismatch
  if (!isMounted) {
    return <div className="min-h-screen bg-[#faf8f7] pb-16" />;
  }

  // Pantalla de Carrito Vacio
  if (totalItems === 0) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center px-6 text-center text-[#4a1d44]">
        <div className="bg-[#f2e1d9]/70 p-10 rounded-full mb-8 animate-pulse">
          <Trash2 size={48} className="opacity-40" />
        </div>
        <h2 className="text-3xl font-black font-playfair uppercase tracking-tight mb-3">
          Tu carrito está vacío
        </h2>
        <p className="max-w-xs italic opacity-70 mb-10 leading-relaxed">
          "Las piezas más exclusivas no suelen esperar demasiado. Encuentra hoy ese diseño que te hará sentir única."
        </p>
        <Link
          href="/productos"
          className="group relative overflow-hidden bg-[#4a1d44] text-white px-10 py-4 rounded-full font-bold shadow-xl transition-all hover:pr-14 active:scale-95"
        >
          <span className="relative z-10 uppercase tracking-widest text-xs">Explorar la Coleccion</span>
          <ArrowLeft className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 rotate-180 transition-all group-hover:opacity-100 group-hover:right-6" size={18} />
        </Link>
      </div>
    );
  }

  // Pantalla de Carrito con Productos
  return (
    <div className="min-h-screen bg-[#faf8f7] pb-16">
      <main className="max-w-6xl mx-auto px-6 md:px-12 pt-8 text-[#4a1d44]">
        {/* Boton Volver */}
        <div className="flex items-center gap-4 mb-10">
          <Link href="/productos" className="p-2 bg-white shadow-sm border border-[#4a1d44]/5 hover:bg-[#f2e1d9] hover:shadow-md rounded-full transition-all text-[#4a1d44]">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-[#361531]">Tu Carrito <span className="text-xl opacity-60">({totalItems})</span></h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mt-8">
          {/* Columna Izquierda: Lista de Productos */}
          <div className="flex-grow">
            <div className="bg-white rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(74,29,68,0.08)] border border-white/60 ring-1 ring-[#4a1d44]/5 flex flex-col p-1.5 md:p-3 overflow-hidden backdrop-blur-xl">
              {cartOrdenado.map((item: any, index: number) => {
                const imagenAShow = withSupabaseListThumbnailParams(
                  getProductoImage(item, 0, "thumb"),
                );
                const isMax = item.quantity >= (item.stock_disponible ?? 99);

                return (
                  <div key={`${item.id}-${item.talla_id}`} className="relative group">
                    {index > 0 && (
                      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#4a1d44]/10 to-transparent" />
                    )}
                    <div className="flex flex-row items-stretch gap-3 md:gap-5 p-4 md:p-5 rounded-[2rem] transition-all duration-300 hover:bg-[#faf8f7] hover:shadow-[0_8px_30px_rgb(74,29,68,0.04)] m-1">
                      <img
                        src={imagenAShow}
                        loading="lazy"
                        className="w-16 h-20 md:w-20 md:h-28 object-cover rounded-2xl shadow-sm bg-[#f2e1d9]/20 flex-shrink-0 border border-[#4a1d44]/5"
                        alt={item.nombre}
                      />
                      <div className="flex flex-col justify-between flex-grow">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="text-base font-bold leading-tight text-[#361531] group-hover:text-[#4a1d44] transition-colors">{item.nombre}</h3>
                            <div className="flex gap-2 mt-1">
                              <div className="inline-block px-2 py-0.5 bg-[#4a1d44]/5 rounded-full border border-[#4a1d44]/10 text-center w-fit">
                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#4a1d44]/70">
                                  {item.producto_colores?.[0]?.colores?.nombre || "Color único"}
                                </p>
                              </div>
                              {item.talla && (
                                <div className="inline-block px-2 py-0.5 bg-[#4a1d44] rounded-full text-center w-fit">
                                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white">
                                    Talla: {item.talla.nombre}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id, item.talla_id)}
                            className="p-1.5 md:p-2.5 text-[#4a1d44]/60 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-300 active:scale-90 flex-shrink-0"
                            title="Eliminar producto"
                            aria-label="Eliminar producto"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                        <div className="flex items-end justify-between mt-2">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center bg-white shadow-sm rounded-full p-0.5 md:p-1 border border-[#4a1d44]/10 w-fit">
                              <button
                                onClick={(e) => { e.preventDefault(); updateQuantity(item.id, -1, item.talla_id); }}
                                className="p-1 hover:bg-[#f2e1d9]/50 rounded-full transition active:scale-90 text-[#4a1d44]"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-6 md:w-8 text-center font-bold text-xs md:text-sm text-[#361531]">
                                {item.quantity}
                              </span>
                              <button
                                onClick={(e) => { e.preventDefault(); updateQuantity(item.id, 1, item.talla_id); }}
                                disabled={isMax}
                                className={`p-1 rounded-full transition active:scale-90 text-[#4a1d44] ${isMax ? 'opacity-20 cursor-not-allowed' : 'hover:bg-[#f2e1d9]/50'}`}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            {isMax && (
                              <p className="text-[9px] md:text-[10px] font-black uppercase text-[#4a1d44]/60 ml-2">Stock Máximo</p>
                            )}
                          </div>
                          <div className="text-right flex flex-col justify-end">
                            <p className="text-sm md:text-base font-black whitespace-nowrap flex items-baseline gap-1 mt-1 text-[#4a1d44]">
                              ${(item.precio * item.quantity).toLocaleString('es-CO')}
                              <span className="text-[8px] md:text-[9px] font-bold opacity-50 tracking-wieder">COP</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Resumen de Pago */}
          <div className="w-full lg:w-[400px] flex-shrink-0">
            <div className="p-8 md:p-10 bg-white rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(74,29,68,0.12)] border border-white/60 ring-1 ring-[#4a1d44]/5 sticky top-24 backdrop-blur-xl">
              <div className="flex flex-col gap-8 mb-8">
                <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
                  <p className="text-[12px] font-black uppercase tracking-widest opacity-70 mb-1">Total a pagar</p>
                  <div className="flex items-baseline gap-2 justify-center lg:justify-start">
                    <p className="text-4xl font-black text-[#4a1d44]">
                      ${totalPrice.toLocaleString('es-CO')}
                    </p>
                    <span className="text-sm font-black opacity-60 tracking-widest">COP</span>
                  </div>
                  <p className="text-[12px] font-bold italic opacity-60 mt-2 text-[#4a1d44]">
                    * El costo de envío se calculará en el siguiente paso.
                  </p>
                </div>

                {/* Boton para ir al Checkout */}
                <Link
                  href="/checkout"
                  className="w-full bg-[#4a1d44] text-white py-4 rounded-xl text-[11px] font-black tracking-[0.2em] flex items-center justify-center gap-3 mt-4 shadow-xl hover:bg-[#5c2454] active:scale-95 transition-all uppercase"
                >
                  CONTINUAR CON EL PAGO <ArrowRight size={18} />
                </Link>
              </div>

              {/* METODOS DE PAGO */}
              <div className="flex flex-col items-center gap-6 pt-8 border-t border-[#4a1d44]/5">
                <p className="text-[12px] font-black uppercase tracking-[0.3em] opacity-70 text-center">
                  Aceptamos tus medios de pago favoritos
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 opacity-70  hover:opacity-100 transition-all duration-700 ease-in-out">
                  <img src="https://juntanacional.co/wp-content/uploads/2015/08/logo_380.png" alt="PSE" className="h-10 object-contain" />
                  <img src="https://unicentro.com/wp-content/uploads/2025/07/BANCOLOMBIA.png" alt="Bancolombia" className="h-10 object-contain" />
                  <img src="https://images.seeklogo.com/logo-png/50/3/nequi-colombia-logo-png_seeklogo-505078.png" alt="Nequi" className="h-10 object-contain" />
                  <img src="https://app.redecom.co/396-medium_default/recarga-claro.jpg" alt="Daviplata" className="h-10 object-contain mix-blend-multiply" />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#4a1d44]/5 flex items-center justify-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em] italic text-center">
                <ShieldCheck size={24} className="text-green-600 opacity-70" />
                Transacción Privada y Segura
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
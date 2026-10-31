"use client";

import { useCart } from "@/context/CartContext";
import { Trash2, ArrowLeft, Plus, Minus, ShieldCheck, ArrowRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { getProductoImage, withSupabaseListThumbnailParams } from "@/app/lib/image-helper";
import { HomeCloud, HomeCloudBank } from "@/components/home/HomeCloud";

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
    return <div className="min-h-screen bg-cream pb-16" />;
  }

  // Pantalla de Carrito Vacio: el cielo rosa de la marca con nubes
  if (totalItems === 0) {
    return (
      <div className="px-2 pb-6 font-display text-ink sm:px-3">
        <div className="relative isolate flex min-h-[70vh] flex-col items-center justify-center overflow-hidden rounded-[1.75rem] bg-[radial-gradient(130%_90%_at_50%_0%,#d7a9c7_0%,#e5bed7_38%,#f2cbe2_72%,#f6d6e9_100%)] px-6 pb-32 pt-16 text-center md:rounded-[2.75rem]">
          <HomeCloud fade sizes="20vw" className="left-[-5%] top-[8%] aspect-[2/1] w-[36%] opacity-60 md:w-[14%]" />
          <HomeCloud fade flip sizes="16vw" className="right-[-4%] top-[4%] aspect-[2/1] w-[30%] opacity-50 md:w-[12%]" />

          <div className="relative mb-6 grid h-20 w-20 place-items-center rounded-full bg-white/80 text-ink shadow-xl shadow-ink/10">
            <ShoppingBag size={32} aria-hidden />
          </div>
          <h1 className="relative text-4xl font-bold leading-[0.95] tracking-[-0.04em] md:text-6xl">
            Tu carrito está vacío
          </h1>
          <p className="relative mt-4 max-w-sm text-base leading-relaxed text-ink/75 md:text-lg">
            Las piezas más exclusivas no suelen esperar demasiado. Encuentra hoy ese diseño que te hará sentir única.
          </p>
          <Link
            href="/productos"
            className="group relative mt-8 inline-flex min-h-[56px] items-center gap-3 rounded-full bg-ink px-9 text-sm font-bold text-white shadow-2xl shadow-ink/30 transition-colors hover:bg-brand-dark active:scale-[0.98]"
          >
            Explorar la colección
            <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>

          <HomeCloudBank className="inset-x-0 bottom-0 top-[80%]" />
        </div>
      </div>
    );
  }

  // Pantalla de Carrito con Productos
  return (
    <div className="min-h-screen bg-cream pb-16 font-display text-ink">
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:px-10 md:pt-12">
        {/* Encabezado: volver + título */}
        <div className="relative mb-10 flex items-center gap-4 md:mb-12">
          <Link
            href="/productos"
            aria-label="Volver al catálogo"
            className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-ink/10 transition-colors hover:bg-ink hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="relative text-4xl font-bold leading-[0.95] tracking-[-0.04em] md:text-6xl">
            Tu carrito <span className="align-middle text-2xl font-semibold text-ink/45 md:text-3xl">({totalItems})</span>
          </h1>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* Columna Izquierda: Lista de Productos */}
          <div className="flex-grow">
            <ul className="flex flex-col gap-3">
              {cartOrdenado.map((item: any) => {
                const imagenAShow = withSupabaseListThumbnailParams(
                  getProductoImage(item, 0, "thumb"),
                );
                const isMax = item.quantity >= (item.stock_disponible ?? 99);

                return (
                  <li key={`${item.id}-${item.talla_id}`} className="rounded-[1.75rem] bg-white p-3 shadow-sm ring-1 ring-ink/5 md:p-4">
                    <div className="flex flex-row items-stretch gap-4 md:gap-5">
                      <img
                        src={imagenAShow}
                        loading="lazy"
                        className="h-28 w-[5.25rem] flex-shrink-0 rounded-[1.25rem] bg-blush object-cover md:h-32 md:w-24"
                        alt={item.nombre}
                      />
                      <div className="flex flex-grow flex-col justify-between py-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold leading-tight md:text-lg">{item.nombre}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-brand-accent px-2.5 py-0.5 text-xs font-medium text-ink">
                                {item.producto_colores?.[0]?.colores?.nombre || "Color único"}
                              </span>
                              {item.talla && (
                                <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-white">
                                  Talla {item.talla.nombre}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id, item.talla_id)}
                            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-ink/50 transition-colors duration-300 hover:bg-brand-accent/60 hover:text-ink active:scale-90"
                            title="Eliminar producto"
                            aria-label="Eliminar producto"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex w-fit items-center rounded-full bg-cream p-1 ring-1 ring-ink/10">
                              <button
                                onClick={(e) => { e.preventDefault(); updateQuantity(item.id, -1, item.talla_id); }}
                                aria-label="Quitar una"
                                className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-white active:scale-90"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={(e) => { e.preventDefault(); updateQuantity(item.id, 1, item.talla_id); }}
                                disabled={isMax}
                                aria-label="Agregar una"
                                className={`grid h-8 w-8 place-items-center rounded-full text-ink transition active:scale-90 ${isMax ? 'cursor-not-allowed opacity-25' : 'hover:bg-white'}`}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            {isMax && (
                              <p className="ml-2 text-xs font-medium text-ink/55">Stock máximo</p>
                            )}
                          </div>
                          <p className="flex items-baseline gap-1 whitespace-nowrap text-base font-semibold tabular-nums md:text-lg">
                            ${(item.precio * item.quantity).toLocaleString('es-CO')}
                            <span className="text-xs font-medium text-ink/45">COP</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Columna Derecha: Resumen de Pago */}
          <div className="w-full flex-shrink-0 lg:w-[400px]">
            <div className="sticky top-28 overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-ink/10 ring-1 ring-ink/5">
              <div className="p-7 md:p-8">
                <p className="text-sm font-semibold text-brand-dark">Total a pagar</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-4xl font-bold tabular-nums tracking-[-0.03em] md:text-5xl">
                    ${totalPrice.toLocaleString('es-CO')}
                  </p>
                  <span className="text-sm font-medium text-ink/50">COP</span>
                </div>
                <p className="mt-2 text-sm text-ink/60">
                  El costo de envío se calcula en el siguiente paso.
                </p>

                {/* Boton para ir al Checkout */}
                <Link
                  href="/checkout"
                  className="mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-ink text-base font-bold text-white shadow-xl shadow-ink/25 transition-colors hover:bg-brand-dark active:scale-[0.98]"
                >
                  Continuar con el pago <ArrowRight size={18} aria-hidden />
                </Link>
              </div>

              {/* METODOS DE PAGO */}
              <div className="flex flex-col items-center gap-5 border-t border-ink/5 bg-cream/60 px-7 py-6">
                <p className="text-center text-sm font-medium text-ink/65">
                  Aceptamos tus medios de pago favoritos
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 opacity-80 transition-opacity duration-500 hover:opacity-100">
                  <img src="https://juntanacional.co/wp-content/uploads/2015/08/logo_380.png" alt="PSE" className="h-9 object-contain" />
                  <img src="https://unicentro.com/wp-content/uploads/2025/07/BANCOLOMBIA.png" alt="Bancolombia" className="h-9 object-contain" />
                  <img src="https://images.seeklogo.com/logo-png/50/3/nequi-colombia-logo-png_seeklogo-505078.png" alt="Nequi" className="h-9 object-contain" />
                  <img src="https://app.redecom.co/396-medium_default/recarga-claro.jpg" alt="Daviplata" className="h-9 object-contain mix-blend-multiply" />
                </div>
                <p className="flex items-center gap-2 text-sm font-medium text-ink/70">
                  <ShieldCheck size={18} className="text-brand-dark" aria-hidden />
                  Transacción privada y segura
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

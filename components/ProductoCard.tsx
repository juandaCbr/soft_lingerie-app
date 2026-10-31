"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, ChevronLeft, ChevronRight, ImageIcon, Package, X, Plus, Minus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';
import { slugify } from '@/app/lib/utils';
import {
  getProductoImage,
  getProductoImageCount,
  withSupabaseListThumbnailParams,
  PLACEHOLDER_IMAGE,
} from '@/app/lib/image-helper';
import type {
  ProductoCardProducto,
  ProductoCatalogoVariante,
  ProductoTallaJoin,
} from '@/app/lib/catalog-types';
import { firstColorFromVariante, getColorInfo } from '@/app/lib/catalog-helpers';

/** Determina si una variante tiene stock disponible (columna stock O stock_talla). */
function varianteTieneStock(v: ProductoCatalogoVariante): boolean {
  if (Number(v.stock ?? 0) > 0) return true;
  return (v.producto_tallas ?? []).some((pt) => Number(pt.stock_talla ?? 0) > 0);
}

/** Devuelve la primera variante con stock > 0, o la primera si todas están agotadas. */
function primeraVarianteConStock(variantes: ProductoCatalogoVariante[]): ProductoCatalogoVariante {
  return variantes.find(varianteTieneStock) ?? variantes[0];
}

function ordenarTallas(tallas: ProductoTallaJoin[]): ProductoTallaJoin[] {
  return [...tallas].sort((a, b) => {
    const ordenA = Number(a.tallas?.orden ?? 999);
    const ordenB = Number(b.tallas?.orden ?? 999);
    if (ordenA !== ordenB) return ordenA - ordenB;
    return String(a.tallas?.nombre ?? '').localeCompare(String(b.tallas?.nombre ?? ''));
  });
}

export default function ProductoCard({
  producto,
  colorFiltro,
  priority = false,
  /** Query del catálogo (sin `?`) para volver con los mismos filtros; se pasa como `cv` en la URL del producto. */
  returnCatalogQuery,
  /** En ficha de producto: no mostrar cantidad disponible en el modal de talla. */
  hideAvailabilityQuantity = false,
}: {
  producto: ProductoCardProducto;
  colorFiltro?: string;
  priority?: boolean;
  returnCatalogQuery?: string;
  hideAvailabilityQuantity?: boolean;
}) {
  const varianteInicial = producto.variantes
    ? primeraVarianteConStock(producto.variantes)
    : producto;

  const [varianteActiva, setVarianteActiva] = useState(varianteInicial);
  const [currentImg, setCurrentImg] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [tallaSeleccionadaId, setTallaSeleccionadaId] = useState<number | null>(null);
  const [cantidadModal, setCantidadModal] = useState(1);
  const { addToCart, cart } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setImgErrors({});
  }, [varianteActiva.id]);

  useEffect(() => {
    if (isSizeModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSizeModalOpen]);

  useEffect(() => {
    if (producto.variantes) {
      // Si hay un filtro de color activo, buscamos la variante que coincida
      if (colorFiltro && colorFiltro !== 'Todos') {
        const varianteMatch = producto.variantes.find((v) => {
          for (const pc of v.producto_colores ?? []) {
            if (getColorInfo(pc)?.nombre === colorFiltro) return true;
          }
          return false;
        });
        if (varianteMatch) {
          setVarianteActiva(varianteMatch);
          setCurrentImg(0);
          return;
        }
      }
      // Sin filtro de color: preferir la primera variante con stock
      setVarianteActiva(primeraVarianteConStock(producto.variantes));
    } else {
      setVarianteActiva(producto);
    }
    setCurrentImg(0);
    setTallaSeleccionadaId(null);
    setCantidadModal(1);
  }, [producto, colorFiltro]);

  const obtenerListaDeFotos = () => {
    const count = getProductoImageCount(varianteActiva);
    const n = Math.max(count, 1);
    return Array.from({ length: n }, (_, i) =>
      // "detail" (700px) y no "thumb" (250px): la miniatura se ve borrosa al tamaño de la tarjeta
      withSupabaseListThumbnailParams(getProductoImage(varianteActiva, i, 'detail')),
    );
  };

  const imagenes = obtenerListaDeFotos();
  const requiereTalla = (varianteActiva.producto_tallas ?? []).length > 0;
  const tallasVariante = ordenarTallas(varianteActiva.producto_tallas ?? []);
  const stockTotalTallas = tallasVariante.reduce((acc, t) => acc + Number(t.stock_talla ?? 0), 0);
  const reservadoTotalVariante = (cart as any[]).reduce((acc, item) => {
    if (item.id !== varianteActiva.id) return acc;
    return acc + Number(item.quantity || 0);
  }, 0);
  const stockRestanteGlobalTallas = Math.max(0, stockTotalTallas - reservadoTotalVariante);
  const sinDisponibilidadPorTalla = requiereTalla && stockRestanteGlobalTallas <= 0;
  const stockMaxVariante = Number(varianteActiva.stock_disponible ?? varianteActiva.stock ?? 0);
  const cantidadEnCarrito = (cart as any[])?.find(
    (item) => item.id === varianteActiva.id && !item.talla_id,
  )?.quantity || 0;
  const isAgotado = !varianteTieneStock(varianteActiva);
  const sinDisponibilidadParaAgregar =
    isAgotado ||
    sinDisponibilidadPorTalla ||
    (!requiereTalla && stockMaxVariante > 0 && cantidadEnCarrito >= stockMaxVariante);
  const tallaSeleccionada = tallasVariante.find((t) => Number(t.tallas?.id ?? 0) === tallaSeleccionadaId) ?? null;
  const stockTallaSeleccionada = Number(tallaSeleccionada?.stock_talla ?? 0);
  const reservadoParaTalla = (cart as any[]).reduce((acc, item) => {
    if (item.id !== varianteActiva.id) return acc;
    if (!tallaSeleccionadaId) return acc;
    if (item.talla_id === tallaSeleccionadaId || !item.talla_id) {
      return acc + Number(item.quantity || 0);
    }
    return acc;
  }, 0);
  const restanteTalla = Math.max(0, stockTallaSeleccionada - reservadoParaTalla);

  const modalAvailabilityLabel = hideAvailabilityQuantity
    ? tallaSeleccionada
      ? restanteTalla <= 0
        ? "Agotado"
        : null
      : "Elige una talla"
    : tallaSeleccionada
      ? restanteTalla > 0
        ? `Disponible (${restanteTalla})`
        : "Agotado"
      : "Elige una talla";

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (requiereTalla) {
      setIsSizeModalOpen(true);
      return;
    }
    if (sinDisponibilidadParaAgregar) return;
    const agregado = await addToCart(varianteActiva);
    if (agregado) {
      toast.success(`¡${varianteActiva.nombre} añadido!`);
    } else {
      toast.error("No hay más stock disponible para agregar.");
    }
  };

  const handleConfirmAddWithSize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tallaSeleccionada || restanteTalla <= 0) {
      toast.error("Selecciona una talla disponible.");
      return;
    }
    const qty = Math.min(Math.max(1, cantidadModal), restanteTalla);
    const agregado = await addToCart(
      varianteActiva,
      { id: Number(tallaSeleccionadaId), nombre: tallaSeleccionada.tallas?.nombre, stock: stockTallaSeleccionada },
      qty,
    );
    if (agregado) {
      toast.success(`¡${varianteActiva.nombre} añadido!`);
      setIsSizeModalOpen(false);
      setCantidadModal(1);
      setTallaSeleccionadaId(null);
    } else {
      toast.error("No hay más stock disponible para agregar.");
    }
  };

  const cambiarVariante = (e: React.MouseEvent, nuevaVariante: ProductoCatalogoVariante) => {
    e.preventDefault();
    setVarianteActiva(nuevaVariante);
    setCurrentImg(0);
  };

  const slug = slugify(varianteActiva.nombre);

  const cv = returnCatalogQuery?.trim();
  const productHref =
    cv && cv.length > 0
      ? `/productos/${slug}-${varianteActiva.id}?cv=${encodeURIComponent(cv)}`
      : `/productos/${slug}-${varianteActiva.id}`;

  /** Antes solo se mostraban colores si había 2+ variantes; una sola variante con color en BD no mostraba nada. */
  const mostrarSelectorColores =
    !!producto.variantes?.length &&
    (producto.variantes.length > 1 ||
      producto.variantes.some((v) => firstColorFromVariante(v) != null));

  return (
    <Link href={productHref} className="block h-full min-w-0 font-display focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink rounded-[1.75rem]">
      <div
        className={`group flex h-full flex-col transition-transform duration-500 active:scale-[0.99] ${isAgotado ? "opacity-75" : ""}`}
      >

        {/* Contenedor de Imagen */}
        <div className="relative w-full shrink-0 overflow-hidden rounded-[1.5rem] bg-blush/60 pt-[125%] md:rounded-[1.75rem]">

          {/* OVERLAY AGOTADO */}
          {isAgotado && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-cream/45 p-4">
              <div className="rounded-full bg-ink px-5 py-2 text-white shadow-xl shadow-ink/30">
                <span className="text-xs font-semibold md:text-sm">Agotado</span>
              </div>
            </div>
          )}

          {/* Tag de Categoría Flotante */}
          <div
            className="absolute left-3 top-3 z-40 rounded-full bg-white/90 px-3 py-1 md:left-4 md:top-4"
            suppressHydrationWarning
          >
            <span className="text-[11px] font-semibold text-ink md:text-xs">
              {mounted
                ? typeof varianteActiva.categoria === "object" && varianteActiva.categoria !== null
                  ? varianteActiva.categoria.nombre ?? "Lencería"
                  : varianteActiva.categoria || "Lencería"
                : "Lencería"}
            </span>
          </div>

          {imagenes.length > 0 ? (
            <>
              {/* Solo renderizamos la imagen actual y la siguiente para optimizar */}
              {imagenes.map((img: string, index: number) => {
                const isCurrent = index === currentImg;
                const isNext = index === (currentImg + 1) % imagenes.length;
                
                // Si no es la actual ni la siguiente, no la renderizamos para ahorrar recursos
                if (!isCurrent && !isNext) return null;

                const imgKey = `${varianteActiva.id}-${index}`;
                return (
                  <Image
                    key={imgKey}
                    src={imgErrors[imgKey] ? PLACEHOLDER_IMAGE : img}
                    alt={`${varianteActiva.nombre} - ${index}`}
                    fill
                    sizes="(max-width: 768px) 45vw, 280px"
                    className={`object-cover transition-[opacity,scale] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] ${isCurrent ? 'opacity-100' : 'opacity-0'} ${isAgotado ? 'grayscale-[0.6]' : ''}`}
                    priority={priority && index === 0}
                    loading={priority && index === 0 ? 'eager' : 'lazy'}
                    onError={() => setImgErrors(prev => ({ ...prev, [imgKey]: true }))}
                  />
                );
              })}

              {imagenes.length > 1 && (
                <>
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-2 z-30 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <button aria-label="Foto anterior" onClick={(e) => { e.preventDefault(); setCurrentImg((prev) => (prev - 1 + imagenes.length) % imagenes.length); }} className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-lg active:scale-90">
                      <ChevronLeft size={16} />
                    </button>
                    <button aria-label="Foto siguiente" onClick={(e) => { e.preventDefault(); setCurrentImg((prev) => (prev + 1) % imagenes.length); }} className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-lg active:scale-90">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 z-30">
                    {imagenes.map((_: string, index: number) => (
                      <div key={index} className={`h-[2px] rounded-full transition-all duration-700 ${index === currentImg ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-20 absolute inset-0">
              <ImageIcon size={40} />
            </div>
          )}
        </div>

        {/* Información del Producto */}
        <div className="relative z-10 flex grow flex-col justify-between px-1 pt-4">
          <div className="flex w-full min-w-0 flex-col items-start">

            <h3 className="mb-2 w-full min-w-0 break-words text-base font-semibold leading-snug text-ink hyphens-none md:text-lg">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">
                {varianteActiva.nombre}
              </span>
            </h3>

            {/* SELECTOR DE COLORES */}
            {mostrarSelectorColores && (
              <div className="mb-3 flex w-full max-w-full flex-wrap items-center gap-2.5 p-1">
                {(producto.variantes ?? []).map((v) => {
                  const colorInfo = firstColorFromVariante(v);
                  const isSelected = varianteActiva.id === v.id;

                  // Override manual para asegurar que los colores se vean bien
                  let colorHex = colorInfo?.hex || '#ccc';
                  const nombreBajo = colorInfo?.nombre?.toLowerCase() || "";
                  if (nombreBajo.includes('vino tinto')) colorHex = '#6B1324';
                  if (nombreBajo === 'amarillo') colorHex = '#FDE047';
                  if (nombreBajo === 'azul celeste') colorHex = '#BAE6FD';
                  if (nombreBajo === 'lila') colorHex = '#D8B4FE';
                  if (nombreBajo === 'amarillo pastel') colorHex = '#FEF9C3';

                  return (
                    <button
                      key={v.id}
                      onClick={(e) => cambiarVariante(e, v)}
                      title={colorInfo?.nombre}
                      aria-label={colorInfo?.nombre}
                      className={`group/color relative h-5 w-5 rounded-full border transition-transform duration-300 ${isSelected
                        ? 'scale-110 border-ink/20 ring-2 ring-brand-primary ring-offset-2'
                        : 'border-ink/10 hover:scale-110'
                        }`}
                      style={{
                        backgroundColor: colorHex,
                      }}
                    >
                      <span className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover/color:opacity-100">
                        {colorInfo?.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* PRECIO CON COP INTEGRADO Y BENEFICIO */}
            <div className="mb-4 flex w-full flex-col items-start">
              <div className="flex items-baseline gap-1" suppressHydrationWarning>
                <p className="text-base font-semibold tabular-nums text-ink md:text-lg">
                  {mounted ? `$${Number(varianteActiva.precio).toLocaleString('es-CO')}` : `$${varianteActiva.precio}`}
                </p>
                <span className="text-[11px] font-medium text-ink/45">
                  COP
                </span>
              </div>

              {/* BENEFICIO DE COMPRA */}
              <div className="mt-1 flex w-full items-center gap-1.5 text-ink/55">
                <Package size={12} className="shrink-0" />
                <span className="whitespace-nowrap text-[11px] font-medium md:text-xs">
                  Envío 100% discreto
                </span>
              </div>
            </div>

          </div>

          {/* BOTÓN ALINEADO SIEMPRE ABAJO */}
          <button
            onClick={handleAddToCart}
            disabled={sinDisponibilidadParaAgregar}
            className={`relative z-40 mt-auto flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-2 py-3 text-xs font-semibold transition-colors duration-300 md:text-sm ${
              sinDisponibilidadParaAgregar
                ? 'cursor-not-allowed bg-blush text-ink/40'
                : 'bg-ink text-white hover:bg-brand-dark active:scale-[0.98]'
            }`}
          >
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">
              {sinDisponibilidadParaAgregar ? 'Agotado' : 'Añadir al carrito'}
            </span>
          </button>
        </div>
      </div>
      {isSizeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSizeModalOpen(false);
              setCantidadModal(1);
              setTallaSeleccionadaId(null);
            }}
          />
          <div className="relative z-[101] w-full max-w-md rounded-[2rem] bg-cream p-6 font-display text-ink shadow-2xl md:p-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSizeModalOpen(false);
                setCantidadModal(1);
                setTallaSeleccionadaId(null);
              }}
              aria-label="Cerrar"
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-ink/60 transition-colors hover:text-ink"
            >
              <X size={18} />
            </button>
            <h4 className="mb-1 text-2xl font-bold tracking-[-0.03em]">Selecciona tu talla</h4>
            <p className="mb-5 truncate pr-10 text-sm text-ink/60">{varianteActiva.nombre}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {tallasVariante.map((t) => {
                const tallaId = Number(t.tallas?.id ?? 0);
                const stock = Number(t.stock_talla ?? 0);
                const reservado = (cart as any[]).reduce((acc, item) => {
                  if (item.id !== varianteActiva.id) return acc;
                  if (item.talla_id === tallaId || !item.talla_id) return acc + Number(item.quantity || 0);
                  return acc;
                }, 0);
                const restante = Math.max(0, stock - reservado);
                const isSelected = tallaSeleccionadaId === tallaId;
                return (
                  <button
                    key={`${varianteActiva.id}-${tallaId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (restante <= 0) return;
                      setTallaSeleccionadaId(tallaId);
                      setCantidadModal(1);
                    }}
                    className={`min-w-[52px] rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'border-ink bg-ink text-white'
                        : restante <= 0
                          ? 'cursor-not-allowed border-transparent bg-blush/60 text-ink/30 line-through'
                          : 'border-ink/15 bg-white text-ink hover:border-ink/40'
                    }`}
                  >
                    {t.tallas?.nombre ?? 'Talla'}
                  </button>
                );
              })}
            </div>
            {modalAvailabilityLabel != null && (
              <div className="mb-4 text-sm font-medium text-ink/70">
                {modalAvailabilityLabel}
              </div>
            )}
            <div className={`mb-6 flex w-fit items-center overflow-hidden rounded-full border border-ink/15 bg-white ${!tallaSeleccionada || restanteTalla <= 0 ? 'pointer-events-none opacity-40' : ''}`}>
              <button aria-label="Quitar una" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCantidadModal((prev) => Math.max(1, prev - 1)); }} className="grid h-10 w-10 place-items-center text-ink">
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-base font-semibold tabular-nums text-ink">{cantidadModal}</span>
              <button aria-label="Agregar una" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCantidadModal((prev) => Math.min(restanteTalla || 1, prev + 1)); }} className="grid h-10 w-10 place-items-center text-ink">
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={handleConfirmAddWithSize}
              disabled={!tallaSeleccionada || restanteTalla <= 0}
              className="w-full rounded-full bg-ink py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:bg-blush disabled:text-ink/40"
            >
              Añadir al carrito
            </button>
          </div>
        </div>
      )}
    </Link>
  );
}
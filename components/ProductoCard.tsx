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
}: {
  producto: ProductoCardProducto;
  colorFiltro?: string;
  priority?: boolean;
  returnCatalogQuery?: string;
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
      withSupabaseListThumbnailParams(getProductoImage(varianteActiva, i, 'thumb')),
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
    <Link href={productHref} className="block h-full min-w-0">
      <div
        className={`group bg-white overflow-hidden shadow-sm border border-[#4a1d44]/5 flex flex-col h-full active:scale-[0.98] transition-all duration-500 hover:shadow-xl hover:shadow-[#4a1d44]/5 rounded-[1.5rem] md:rounded-[2.5rem] ${isAgotado ? "opacity-70" : ""}`}
      >

        {/* Contenedor de Imagen */}
        <div className="relative w-full pt-[125%] overflow-hidden bg-[#fdf8f6] shrink-0">

          {/* OVERLAY AGOTADO */}
          {isAgotado && (
            <div className="absolute inset-0 z-40 bg-white/40 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-[#4a1d44] text-white px-6 py-2 rounded-full shadow-2xl transform -rotate-12 border-2 border-white/20">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">Agotado</span>
              </div>
            </div>
          )}

          {/* Tag de Categoría Flotante */}
          <div
            className="absolute top-4 left-4 z-40 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-black/5"
            suppressHydrationWarning
          >
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[#4a1d44]">
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
                    className={`object-cover transition-all duration-1000 ease-in-out transform group-hover:scale-110 ${isCurrent ? 'opacity-100' : 'opacity-0'} ${isAgotado ? 'grayscale-[0.6]' : ''}`}
                    priority={priority && index === 0}
                    loading={priority && index === 0 ? 'eager' : 'lazy'}
                    onError={() => setImgErrors(prev => ({ ...prev, [imgKey]: true }))}
                  />
                );
              })}

              {imagenes.length > 1 && (
                <>
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-2 z-30 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={(e) => { e.preventDefault(); setCurrentImg((prev) => (prev - 1 + imagenes.length) % imagenes.length); }} className="p-1.5 bg-white/90 backdrop-blur-md rounded-full text-[#4a1d44] shadow-lg active:scale-90">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); setCurrentImg((prev) => (prev + 1) % imagenes.length); }} className="p-1.5 bg-white/90 backdrop-blur-md rounded-full text-[#4a1d44] shadow-lg active:scale-90">
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
        <div className="p-4 md:p-6 text-center grow flex flex-col justify-between bg-white relative z-10 pt-5">
          <div className="flex flex-col items-center min-w-0 w-full">

            <h3 className="font-bold text-sm md:text-lg text-[#4a1d44] mb-3 md:mb-4 w-full min-w-0 text-balance uppercase tracking-tight leading-snug break-words hyphens-none">
              {varianteActiva.nombre}
            </h3>

            {/* SELECTOR DE COLORES */}
            {mostrarSelectorColores && (
              <div className="mb-4 flex w-full max-w-full flex-wrap items-center justify-center gap-2.5 p-1">
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
                      className={`group/color relative w-4 h-4 md:w-5 md:h-5 rounded-full transition-all duration-300 border shadow-inner ${isSelected
                        ? 'ring-2 ring-offset-2 ring-[#4a1d44] scale-110 border-[#4a1d44]/20'
                        : 'hover:scale-110 border-black/10'
                        }`}
                      style={{
                        backgroundColor: colorHex,
                      }}
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#4a1d44] text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/color:opacity-100 transition-opacity pointer-events-none uppercase font-bold whitespace-nowrap z-50">
                        {colorInfo?.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* PRECIO CON COP INTEGRADO Y BENEFICIO */}
            <div className="flex flex-col items-center mb-4 w-full">
              <div className="flex items-baseline justify-center gap-1" suppressHydrationWarning>
                <p className="text-[#4a1d44]/50 text-sm md:text-lg font-black">
                  {mounted ? `$${Number(varianteActiva.precio).toLocaleString('es-CO')}` : `$${varianteActiva.precio}`}
                </p>
                <span className="text-[9px] md:text-[10px] font-black opacity-40 tracking-widest uppercase">
                  COP
                </span>
              </div>

              {/* BENEFICIO DE COMPRA */}
              <div className="flex items-center justify-center gap-1 mt-1.5 opacity-60 w-full">
                <Package size={11} className="text-[#4a1d44] shrink-0" />
                <span className="text-[7.5px] md:text-[9px] text-[#4a1d44] font-bold tracking-wider md:tracking-widest uppercase whitespace-nowrap">
                  Envío 100% Discreto
                </span>
              </div>
            </div>

          </div>

          {/* BOTÓN ALINEADO SIEMPRE ABAJO */}
          <button
            onClick={handleAddToCart}
            disabled={sinDisponibilidadParaAgregar}
            className={`w-full py-3 md:py-3.5 rounded-xl flex items-center justify-center gap-1 md:gap-2 px-1 transition-all duration-300 shadow-md z-40 relative text-[8px] md:text-[10px] font-bold md:font-black tracking-wider md:tracking-widest mt-auto overflow-hidden ${
              sinDisponibilidadParaAgregar
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-[#4a1d44] text-white hover:bg-[#5d2555] active:scale-95'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              {sinDisponibilidadParaAgregar ? 'AGOTADO' : 'AÑADIR AL CARRITO'}
            </span>
          </button>
        </div>
      </div>
      {isSizeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <div
            className="absolute inset-0 bg-[#4a1d44]/60 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSizeModalOpen(false);
              setCantidadModal(1);
              setTallaSeleccionadaId(null);
            }}
          />
          <div className="relative z-[101] bg-[#fdf8f6] w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl border border-[#4a1d44]/10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSizeModalOpen(false);
                setCantidadModal(1);
                setTallaSeleccionadaId(null);
              }}
              className="absolute top-4 right-4 p-2 bg-white/80 rounded-full text-[#4a1d44]/50 hover:text-[#4a1d44]"
            >
              <X size={18} />
            </button>
            <h4 className="text-lg font-playfair font-black text-[#4a1d44] mb-4">Selecciona tu talla</h4>
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
                    className={`min-w-[52px] px-3 py-2 rounded-lg text-xs font-black border ${
                      isSelected
                        ? 'bg-[#4a1d44] text-white border-[#4a1d44]'
                        : restante <= 0
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-[#4a1d44] border-[#4a1d44]/20'
                    }`}
                  >
                    {t.tallas?.nombre ?? 'Talla'}
                  </button>
                );
              })}
            </div>
            <div className="mb-4 text-[11px] font-bold uppercase tracking-wider text-[#4a1d44]/70">
              {tallaSeleccionada ? (restanteTalla > 0 ? `Disponible (${restanteTalla})` : 'Agotado') : 'Elige una talla'}
            </div>
            <div className={`flex items-center w-fit border border-[#4a1d44]/15 rounded-xl overflow-hidden mb-5 ${!tallaSeleccionada || restanteTalla <= 0 ? 'opacity-40 pointer-events-none' : ''}`}>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCantidadModal((prev) => Math.max(1, prev - 1)); }} className="p-2 text-[#4a1d44]">
                <Minus size={14} />
              </button>
              <span className="w-10 text-center font-black text-sm text-[#4a1d44]">{cantidadModal}</span>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCantidadModal((prev) => Math.min(restanteTalla || 1, prev + 1)); }} className="p-2 text-[#4a1d44]">
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={handleConfirmAddWithSize}
              disabled={!tallaSeleccionada || restanteTalla <= 0}
              className="w-full py-3 rounded-xl bg-[#4a1d44] text-white text-[11px] font-black tracking-[0.18em] disabled:bg-gray-200 disabled:text-gray-400"
            >
              AÑADIR AL CARRITO
            </button>
          </div>
        </div>
      )}
    </Link>
  );
}
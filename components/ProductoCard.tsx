"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, ChevronLeft, ChevronRight, ImageIcon, Package } from 'lucide-react';
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
} from '@/app/lib/catalog-types';
import { getColorInfo } from '@/app/lib/catalog-helpers';

/** Determina si una variante tiene stock disponible (columna stock O stock_talla). */
function varianteTieneStock(v: ProductoCatalogoVariante): boolean {
  if (Number(v.stock ?? 0) > 0) return true;
  return (v.producto_tallas ?? []).some((pt) => Number(pt.stock_talla ?? 0) > 0);
}

/** Devuelve la primera variante con stock > 0, o la primera si todas están agotadas. */
function primeraVarianteConStock(variantes: ProductoCatalogoVariante[]): ProductoCatalogoVariante {
  return variantes.find(varianteTieneStock) ?? variantes[0];
}

export default function ProductoCard({ producto, colorFiltro, priority = false }: { producto: ProductoCardProducto, colorFiltro?: string, priority?: boolean }) {
  const varianteInicial = producto.variantes
    ? primeraVarianteConStock(producto.variantes)
    : producto;

  const [varianteActiva, setVarianteActiva] = useState(varianteInicial);
  const [currentImg, setCurrentImg] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const { addToCart } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setImgErrors({});
  }, [varianteActiva.id]);

  useEffect(() => {
    if (producto.variantes) {
      // Si hay un filtro de color activo, buscamos la variante que coincida
      if (colorFiltro && colorFiltro !== 'Todos') {
        const varianteMatch = producto.variantes.find((v) =>
          v.producto_colores?.some((pc) => getColorInfo(pc)?.nombre === colorFiltro)
        );
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
  }, [producto, colorFiltro]);

  const obtenerListaDeFotos = () => {
    const count = getProductoImageCount(varianteActiva);
    const n = Math.max(count, 1);
    return Array.from({ length: n }, (_, i) =>
      withSupabaseListThumbnailParams(getProductoImage(varianteActiva, i, 'thumb')),
    );
  };

  const imagenes = obtenerListaDeFotos();
  const isAgotado = !varianteTieneStock(varianteActiva);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAgotado) return;
    addToCart(varianteActiva);
    toast.success(`¡${varianteActiva.nombre} añadido!`);
  };

  const cambiarVariante = (e: React.MouseEvent, nuevaVariante: ProductoCatalogoVariante) => {
    e.preventDefault();
    setVarianteActiva(nuevaVariante);
    setCurrentImg(0);
  };

  const slug = slugify(varianteActiva.nombre);

  return (
    <Link href={`/productos/${slug}-${varianteActiva.id}`} className="block h-full">
      <div className={`group bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-sm border border-[#4a1d44]/5 flex flex-col h-full active:scale-[0.98] transition-all duration-500 hover:shadow-xl hover:shadow-[#4a1d44]/5 ${isAgotado ? 'opacity-70' : ''}`}>

        {/* Contenedor de Imagen */}
        <div className="relative w-full pt-[125%] overflow-hidden bg-[#fdf8f6] flex-shrink-0">

          {/* OVERLAY AGOTADO */}
          {isAgotado && (
            <div className="absolute inset-0 z-40 bg-white/40 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-[#4a1d44] text-white px-6 py-2 rounded-full shadow-2xl transform -rotate-12 border-2 border-white/20">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">Agotado</span>
              </div>
            </div>
          )}

          {/* Tag de Categoría Flotante */}
          <div className="absolute top-4 left-4 z-40 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-black/5" suppressHydrationWarning>
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
                    sizes="(max-width: 768px) 50vw, 33vw"
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
        <div className="p-4 md:p-6 text-center flex-grow flex flex-col justify-between bg-white relative z-10 pt-5">
          <div className="flex flex-col items-center">

            <h3 className="font-playfair font-bold text-[#4a1d44] text-sm md:text-lg mb-4 truncate w-full">
              {varianteActiva.nombre}
            </h3>

            {/* SELECTOR DE COLORES */}
            {producto.variantes && producto.variantes.length > 1 && (
              <div className="flex justify-center items-center gap-2.5 mb-4">
                {producto.variantes.map((v) => {
                  const colorInfo = v.producto_colores?.[0] ? getColorInfo(v.producto_colores[0]) : null;
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
                <p className="text-[#4a1d44] font-black text-sm md:text-base">
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
            disabled={isAgotado}
            className={`w-full py-3 md:py-3.5 rounded-xl flex items-center justify-center gap-1 md:gap-2 px-1 transition-all duration-300 shadow-md z-40 relative text-[8px] md:text-[10px] font-bold md:font-black tracking-wider md:tracking-widest mt-auto overflow-hidden ${
              isAgotado
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-[#4a1d44] text-white hover:bg-[#5d2555] active:scale-95'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              {isAgotado ? 'AGOTADO' : 'AÑADIR AL CARRITO'}
            </span>
          </button>
        </div>
      </div>
    </Link>
  );
}
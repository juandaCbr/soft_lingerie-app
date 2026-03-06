"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, ChevronLeft, ChevronRight, ImageIcon, Package } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';

export default function ProductoCard({ producto }: { producto: any }) {
  const [varianteActiva, setVarianteActiva] = useState(producto.variantes ? producto.variantes[0] : producto);
  const [currentImg, setCurrentImg] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (producto.variantes) {
      setVarianteActiva(producto.variantes[0]);
    } else {
      setVarianteActiva(producto);
    }
    setCurrentImg(0);
  }, [producto]);

  const obtenerListaDeFotos = () => {
    if (Array.isArray(varianteActiva.imagenes_urls) && varianteActiva.imagenes_urls.length > 0) {
      return varianteActiva.imagenes_urls;
    }
    return varianteActiva.imagen_url ? [varianteActiva.imagen_url] : [];
  };

  const imagenes = obtenerListaDeFotos();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(varianteActiva);
    toast.success(`¡${varianteActiva.nombre} añadido!`);
  };

  const cambiarVariante = (e: React.MouseEvent, nuevaVariante: any) => {
    e.preventDefault();
    setVarianteActiva(nuevaVariante);
    setCurrentImg(0);
  };

  return (
    <Link href={`/productos/${varianteActiva.id}`} className="block h-full">
      <div className="group bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-sm border border-[#4a1d44]/5 flex flex-col h-full active:scale-[0.98] transition-all duration-500 hover:shadow-xl hover:shadow-[#4a1d44]/5">

        {/* Contenedor de Imagen */}
        <div className="relative w-full pt-[125%] overflow-hidden bg-[#fdf8f6] flex-shrink-0">

          {/* Tag de Categoría Flotante */}
          <div className="absolute top-4 left-4 z-40 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-black/5" suppressHydrationWarning>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[#4a1d44]">
              {mounted ? (typeof varianteActiva.categoria === 'object' ? varianteActiva.categoria.nombre : (varianteActiva.categoria || 'Lencería')) : 'Lencería'}
            </span>
          </div>

          {imagenes.length > 0 ? (
            <>
              {imagenes.map((img: string, index: number) => (
                <img
                  key={`${varianteActiva.id}-${index}`}
                  src={img}
                  alt={`${varianteActiva.nombre} - ${index}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out transform group-hover:scale-110 ${index === currentImg ? 'opacity-100' : 'opacity-0'
                    }`}
                />
              ))}

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
                {producto.variantes.map((v: any) => {
                  const colorInfo = v.producto_colores?.[0]?.colores;
                  const isSelected = varianteActiva.id === v.id;

                  // Override manual para asegurar que Vino Tinto no sea morado
                  let colorHex = colorInfo?.hex || '#ccc';
                  if (colorInfo?.nombre?.toLowerCase().includes('vino tinto')) {
                    colorHex = '#6B1324';
                  }

                  return (
                    <button
                      key={v.id}
                      onClick={(e) => cambiarVariante(e, v)}
                      title={colorInfo?.nombre}
                      className={`group/color relative w-4 h-4 md:w-5 md:h-5 rounded-full transition-all duration-300 border border-black/10 shadow-inner ${isSelected
                        ? 'ring-2 ring-offset-2 ring-[#4a1d44] scale-110'
                        : 'hover:scale-110'
                        }`}
                      style={{
                        backgroundColor: colorHex,
                        boxShadow: isSelected ? '0 0 0 1px rgba(0,0,0,0.05)' : 'none'
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
            className="w-full bg-[#4a1d44] text-white py-3 md:py-3.5 rounded-xl flex items-center justify-center gap-1 md:gap-2 px-1 hover:bg-[#5d2555] transition-all duration-300 shadow-md active:scale-95 z-40 relative text-[8px] md:text-[10px] font-bold md:font-black tracking-wider md:tracking-widest mt-auto overflow-hidden"
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">AÑADIR AL CARRITO</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
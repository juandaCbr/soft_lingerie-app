"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { ShoppingCart, ArrowLeft, Loader2, Check, ChevronLeft, ChevronRight, ChevronDown, ShieldCheck, Heart, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';
import ProductoCard from '@/components/ProductoCard';

export default function ProductoDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [variantes, setVariantes] = useState<any[]>([]);
  const [varianteActiva, setVarianteActiva] = useState<any>(null);
  const [relacionados, setRelacionados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImg, setCurrentImg] = useState(0);

  // Estado para los acordeones de información
  const [acordeonAbierto, setAcordeonAbierto] = useState<string | null>(null);

  const toggleAcordeon = (seccion: string) => {
    setAcordeonAbierto(prev => prev === seccion ? null : seccion);
  };

  useEffect(() => {
    const fetchProductoYVariantes = async () => {
      try {
        const { data: productoPrincipal, error: errorPrincipal } = await supabase
          .from('productos')
          .select(`*, producto_colores ( colores (hex, nombre) )`)
          .eq('id', id)
          .single();

        if (errorPrincipal || !productoPrincipal) {
          toast.error("Producto no encontrado");
          router.push('/productos');
          return;
        }

        if (productoPrincipal.grupo_id) {
          const { data: todasLasVariantes } = await supabase
            .from('productos')
            .select(`*, producto_colores ( colores (hex, nombre) )`)
            .eq('grupo_id', productoPrincipal.grupo_id)
            .eq('activo', true);
          setVariantes(todasLasVariantes || [productoPrincipal]);
        } else {
          setVariantes([productoPrincipal]);
        }

        setVarianteActiva(productoPrincipal);

        const { data: dataRelacionados } = await supabase
          .from('productos')
          .select(`*, producto_colores ( colores (hex, nombre) )`)
          .eq('activo', true)
          .neq('id', productoPrincipal.id)
          .limit(12);

        if (dataRelacionados) {
          const tempGrupos: any = {};
          dataRelacionados.forEach(item => {
            const gid = item.grupo_id || `item-${item.id}`;
            if (gid === productoPrincipal.grupo_id) return;
            if (!tempGrupos[gid]) {
              tempGrupos[gid] = { ...item, variantes: [item] };
            } else {
              tempGrupos[gid].variantes.push(item);
            }
          });
          setRelacionados(Object.values(tempGrupos));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProductoYVariantes();
  }, [id, router]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8;
      const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (loading || !varianteActiva) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-[#4a1d44]" size={40} />
    </div>
  );

  const imagenes = Array.isArray(varianteActiva.imagenes_urls)
    ? varianteActiva.imagenes_urls
    : [varianteActiva.imagen_url];

  return (
    <main className="max-w-7xl mx-auto px-4 pt-12 md:pt-24 pb-20 text-[#4a1d44]">
      {/* Botón Volver */}
      <div className="-mt-2 mb-6 max-w-5xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity text-[10px] font-bold uppercase tracking-[0.2em] py-1">
          <ArrowLeft size={14} /> Volver al catálogo
        </button>
      </div>

      {/* CONTENEDOR EN DOS COLUMNAS CON MAX-W Y GAP REDUCIDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 lg:gap-12 max-w-5xl mx-auto items-start">

        {/* COLUMNA IZQUIERDA: GALERÍA Y TÍTULO EN MÓVIL (Alineado a la Izquierda) */}
        <div className="space-y-4 w-full max-w-[360px] md:max-w-[420px] mx-auto md:mx-0 flex flex-col">

          {/* Título visible SOLO en móvil (encima de la foto, alineado a la izquierda) */}
          <div className="md:hidden text-left mb-1.5 px-1">
            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-40 block mb-1">
              {varianteActiva.categoria?.nombre || varianteActiva.categoria || 'Colección'}
            </span>
            <h1 className="text-3xl font-black font-playfair leading-tight text-[#4a1d44]">
              {varianteActiva.nombre}
            </h1>
          </div>

          <div className="relative aspect-[4/5] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-[#fdf8f6] shadow-sm border border-[#4a1d44]/5 shrink-0">
            {imagenes.map((img: string, index: number) => (
              <img
                key={`${varianteActiva.id}-${index}`}
                src={img}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${index === currentImg ? 'opacity-100' : 'opacity-0'}`}
                alt={varianteActiva.nombre}
              />
            ))}
            <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5 z-10">
              {imagenes.map((_: string, i: number) => (
                <div key={i} className={`h-[2px] rounded-full transition-all duration-500 ${i === currentImg ? 'w-8 bg-white' : 'w-3 bg-white/40'}`} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto py-2 px-1 scrollbar-hide items-center">
            {imagenes.map((img: string, i: number) => (
              <button key={i} onClick={() => setCurrentImg(i)} className={`relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-300 ${i === currentImg ? 'border-[#4a1d44] scale-105 shadow-md' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                <img src={img} className="w-full h-full object-cover" alt="miniatura" />
              </button>
            ))}
          </div>
        </div>

        {/* COLUMNA DERECHA: INFORMACIÓN (Todo alineado a la izquierda en móvil) */}
        <div className="flex flex-col gap-6 md:sticky md:top-28 w-full max-w-[420px] mx-auto md:mx-0">

          <div className="space-y-2">
            {/* Título y categoría originales: Ocultos en móvil */}
            <div className="hidden md:block">
              <span className="text-sm font-black uppercase tracking-[0.2em] opacity-40 block mb-2">
                {varianteActiva.categoria?.nombre || varianteActiva.categoria || 'Colección'}
              </span>
              <h1 className="text-5xl font-black font-playfair leading-tight text-[#4a1d44] mb-4">
                {varianteActiva.nombre}
              </h1>
            </div>

            {/* Precio: Visible siempre, alineado a la izquierda en móvil */}
            <p className="text-2xl md:text-2xl font-black opacity-90 text-left">
              ${Number(varianteActiva.precio).toLocaleString('es-CO')} COP
            </p>
          </div>

          {/* Descripción: Ahora movida arriba, debajo del precio */}
          <div className="text-left space-y-3">
            <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-50">Descripción</h3>
            <p className="text-base leading-relaxed text-[#4a1d44]/80">
              {varianteActiva.descripcion || "Diseño exclusivo de Soft Lingerie. Confeccionado con materiales premium para garantizar suavidad, comodidad y elegancia en todo momento."}
            </p>
          </div>

          {/* Selector de colores: Ahora movido abajo, después de la descripción */}
          {variantes.length > 1 && (
            <div className="py-5 border-y border-[#4a1d44]/10 flex flex-col items-start">
              <h3 className="text-[9px] font-bold uppercase tracking-widest mb-3 opacity-50">Colores Disponibles</h3>
              <div className="flex gap-3">
                {variantes.map((v) => {
                  const color = v.producto_colores?.[0]?.colores;
                  const isSelected = varianteActiva.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => { setVarianteActiva(v); setCurrentImg(0); }}
                      className={`relative w-9 h-9 rounded-full border border-black/10 transition-all duration-300 ${isSelected ? 'ring-2 ring-offset-2 ring-[#4a1d44] scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color?.hex || '#ccc' }}
                      title={color?.nombre}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Checkmarks de Compra y Envíos: Alineados a la izquierda en una sola línea (flex-row) */}
          <div className="flex flex-row gap-6 pt-2 justify-start items-center">
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest opacity-60">
              <Check size={14} className="text-[#4a1d44]" /> Compra Segura
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest opacity-60">
              <Check size={14} className="text-[#4a1d44]" /> Envíos Nacionales
            </div>
          </div>

          <button
            onClick={() => { addToCart(varianteActiva); toast.success('Añadido al carrito'); }}
            className="w-full bg-[#4a1d44] text-white py-4 rounded-xl text-[11px] font-black tracking-[0.2em] flex items-center justify-center gap-3 mt-2 shadow-xl hover:bg-[#5c2454] active:scale-95 transition-all"
          >
            <ShoppingCart size={18} /> AÑADIR AL CARRITO
          </button>

          {/* Acordeones y Pagos */}
          <div className="mt-4 border border-[#4a1d44]/10 rounded-2xl overflow-hidden bg-[#fdf8f6]/50">
            {/* Acordeón 1: Cuidado */}
            <div className="border-b border-[#4a1d44]/10">
              <button
                onClick={() => toggleAcordeon('cuidado')}
                className="w-full flex justify-between items-center p-4 text-xs font-bold uppercase tracking-widest hover:bg-[#4a1d44]/5 transition-colors"
              >
                <div className="flex items-center gap-3"><Heart size={16} className="opacity-60" /> Cuidado de la prenda</div>
                <ChevronDown size={16} className={`transition-transform duration-300 ${acordeonAbierto === 'cuidado' ? 'rotate-180' : ''}`} />
              </button>
              {acordeonAbierto === 'cuidado' && (
                <div className="p-4 pt-0 text-sm text-[#4a1d44]/70 leading-relaxed text-left">
                  Recomendamos lavar a mano con jabón suave y agua fría. No retorcer, no usar blanqueador y secar a la sombra para mantener intacta la calidad de los encajes y las telas.
                </div>
              )}
            </div>

            {/* Acordeón 2: Envíos */}
            <div className="border-b border-[#4a1d44]/10">
              <button
                onClick={() => toggleAcordeon('envios')}
                className="w-full flex justify-between items-center p-4 text-xs font-bold uppercase tracking-widest hover:bg-[#4a1d44]/5 transition-colors"
              >
                <div className="flex items-center gap-3"><Truck size={16} className="opacity-60" /> Envíos y Discreción</div>
                <ChevronDown size={16} className={`transition-transform duration-300 ${acordeonAbierto === 'envios' ? 'rotate-180' : ''}`} />
              </button>
              {acordeonAbierto === 'envios' && (
                <div className="p-4 pt-0 text-sm text-[#4a1d44]/70 leading-relaxed text-left">
                  Realizamos envíos a toda Colombia. Todos nuestros paquetes son 100% discretos, sin logos ni descripciones externas de los productos en el empaque.
                </div>
              )}
            </div>

            {/* Acordeón 3: Garantía */}
            <div>
              <button
                onClick={() => toggleAcordeon('garantia')}
                className="w-full flex justify-between items-center p-4 text-xs font-bold uppercase tracking-widest hover:bg-[#4a1d44]/5 transition-colors"
              >
                <div className="flex items-center gap-3"><ShieldCheck size={16} className="opacity-60" /> Cambios y Devoluciones</div>
                <ChevronDown size={16} className={`transition-transform duration-300 ${acordeonAbierto === 'garantia' ? 'rotate-180' : ''}`} />
              </button>
              {acordeonAbierto === 'garantia' && (
                <div className="p-4 pt-0 text-sm text-[#4a1d44]/70 leading-relaxed text-left">
                  Por razones estrictas de higiene, la ropa interior no tiene cambio ni devolución, a excepción de defectos de fábrica comprobables al momento de recibir.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 mt-2 opacity-60">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Pago Seguro y Protegido</span>
            <div className="flex gap-4">
              <span className="text-xs font-black italic">Wompi</span>
              <span className="text-xs font-black italic">PSE</span>
              <span className="text-xs font-black italic">Nequi</span>
            </div>
          </div>

        </div>
      </div>

      {/* SECCIÓN RELACIONADOS */}
      {relacionados.length > 0 && (
        <div className="mt-20 md:mt-32 pt-10 border-t border-[#4a1d44]/10 w-full max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs md:text-sm font-black uppercase tracking-widest opacity-50">También te puede gustar</h3>
            <div className="flex gap-2">
              <button onClick={() => scroll('left')} className="p-2 bg-[#fdf8f6] hover:bg-[#4a1d44]/10 rounded-full transition"><ChevronLeft size={20} /></button>
              <button onClick={() => scroll('right')} className="p-2 bg-[#fdf8f6] hover:bg-[#4a1d44]/10 rounded-full transition"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-6 snap-x items-stretch"
          >
            {relacionados.map((prod) => (
              <div
                key={prod.id}
                className="min-w-[200px] max-w-[200px] md:min-w-[250px] md:max-w-[250px] snap-start shrink-0 flex"
              >
                <div className="transform md:scale-95 origin-top transition-transform hover:scale-100 w-full h-full [&>div]:h-full">
                  <ProductoCard producto={prod} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
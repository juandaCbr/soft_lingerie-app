"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/app/lib/supabase';
import { ShoppingCart, ArrowLeft, Loader2, Check, ChevronLeft, ChevronRight, ChevronDown, ShieldCheck, Heart, Truck, Ruler, Plus, Minus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';
import ProductoCard from '@/components/ProductoCard';
import SizeGuideModal from '@/components/SizeGuideModal';

export default function ProductoDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [variantes, setVariantes] = useState<any[]>([]);
  const [varianteActiva, setVarianteActiva] = useState<any>(null);
  const [tallasDisponibles, setTallasDisponibles] = useState<any[]>([]);
  const [tallaSeleccionada, setTallaSeleccionada] = useState<any>(null);
  const [cantidad, setCantidad] = useState(1);
  const [relacionados, setRelacionados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tallasLoading, setTallasLoading] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

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
        await fetchTallas(productoPrincipal.id);

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

  const fetchTallas = async (productoId: any) => {
    setTallasLoading(true);
    const { data: tallasRel, error: errorTallas } = await supabase
      .from('producto_tallas')
      .select('*, tallas(*)')
      .eq('producto_id', productoId);
    
    if (!errorTallas && tallasRel) {
      const tallasConStock = tallasRel.map(r => ({
        ...r.tallas,
        stock: r.stock_talla || 0
      })).sort((a, b) => a.orden - b.orden);
      
      setTallasDisponibles(tallasConStock);
      
      const primeraDisponible = tallasConStock.find(t => t.stock > 0);
      setTallaSeleccionada(primeraDisponible || null);
      setCantidad(1);
    }
    setTallasLoading(false);
  };

  const handleVarianteChange = async (v: any) => {
    if (v.id === varianteActiva.id) return;
    setVarianteActiva(v);
    setCurrentImg(0);
    setTallaSeleccionada(null);
    setCantidad(1);
    await fetchTallas(v.id);
  };

  const handleAddToCart = () => {
    if (tallasDisponibles.length > 0 && !tallaSeleccionada) {
      toast.error("Por favor selecciona una talla disponible");
      return;
    }
    if (tallaSeleccionada && (tallaSeleccionada.stock <= 0 || cantidad > tallaSeleccionada.stock)) {
      toast.error("No hay suficiente stock para la cantidad seleccionada");
      return;
    }
    addToCart(varianteActiva, tallaSeleccionada, cantidad);
    toast.success('¡Añadido al carrito!');
  };

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
      <div className="-mt-2 mb-6 max-w-5xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity text-[10px] font-bold uppercase tracking-[0.2em] py-1">
          <ArrowLeft size={14} /> Volver al catálogo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 lg:gap-12 max-w-5xl mx-auto items-start">

        {/* COLUMNA IZQUIERDA: GALERÍA */}
        <div className="space-y-4 w-full max-w-[360px] md:max-w-[420px] mx-auto md:mx-0 flex flex-col">
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
              <Image
                key={`${varianteActiva.id}-${index}`}
                src={img}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={index === 0}
                className={`object-cover transition-opacity duration-700 ease-in-out ${index === currentImg ? 'opacity-100' : 'opacity-0'}`}
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
                <Image src={img} fill sizes="64px" className="object-cover" alt="miniatura" />
              </button>
            ))}
          </div>
        </div>

        {/* COLUMNA DERECHA: INFORMACIÓN */}
        <div className="flex flex-col gap-6 md:sticky md:top-28 w-full max-w-[420px] mx-auto md:mx-0">
          <div className="space-y-2">
            <div className="hidden md:block">
              <span className="text-sm font-black uppercase tracking-[0.2em] opacity-40 block mb-2">
                {varianteActiva.categoria?.nombre || varianteActiva.categoria || 'Colección'}
              </span>
              <h1 className="text-5xl font-black font-playfair leading-tight text-[#4a1d44] mb-4">
                {varianteActiva.nombre}
              </h1>
            </div>
            <p className="text-2xl md:text-2xl font-black opacity-90 text-left">
              ${Number(varianteActiva.precio).toLocaleString('es-CO')} COP
            </p>

            {/* Selector de colores movido aquí */}
            {variantes.length > 1 && (
              <div className="py-2 flex flex-col items-start">
                <h3 className="text-[9px] font-bold uppercase tracking-widest mb-3 opacity-50">Colores Disponibles</h3>
                <div className="flex gap-3">
                  {variantes.map((v) => {
                    let color = v.producto_colores?.[0]?.colores;
                    const isSelected = varianteActiva.id === v.id;
                    
                    // Override manual para asegurar que los colores se vean bien
                    let colorHex = color?.hex || '#ccc';
                    const nombreBajo = color?.nombre?.toLowerCase() || "";
                    if (nombreBajo.includes('vino tinto')) colorHex = '#6B1324';
                    if (nombreBajo === 'amarillo') colorHex = '#FDE047';
                    if (nombreBajo === 'azul celeste') colorHex = '#BAE6FD';
                    if (nombreBajo === 'lila') colorHex = '#D8B4FE';
                    if (nombreBajo === 'amarillo pastel') colorHex = '#FEF9C3';

                    return (
                      <button
                        key={v.id}
                        onClick={() => handleVarianteChange(v)}
                        className={`relative w-9 h-9 rounded-full border border-black/10 transition-all duration-300 ${isSelected ? 'ring-2 ring-offset-2 ring-[#4a1d44] scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: colorHex }}
                        title={color?.nombre}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="text-left space-y-3">
            <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-50">Descripción</h3>
            <p className="text-base leading-relaxed text-[#4a1d44]/80">
              {varianteActiva.descripcion || "Diseño exclusivo de Soft Lingerie. Confeccionado con materiales premium para garantizar suavidad, comodidad y elegancia en todo momento."}
            </p>
          </div>

          {/* Selector de Tallas con Agotados */}
          <div className="py-2 flex flex-col items-start w-full min-h-[110px]">
            <div className="flex justify-between items-center w-full mb-3">
              <h3 className="text-[9px] font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
                <Ruler size={12} /> Selecciona tu Talla
              </h3>
              <button 
                onClick={() => setIsSizeGuideOpen(true)}
                className="text-[9px] font-black uppercase tracking-widest text-[#4a1d44] border-b border-[#4a1d44]/20 pb-0.5 hover:border-[#4a1d44] transition-all"
              >
                Guía de Tallas
              </button>
            </div>

            {tallasLoading ? (
              <div className="flex gap-2 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-12 h-10 bg-gray-100 rounded-xl" />
                ))}
              </div>
            ) : tallasDisponibles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tallasDisponibles.map((t) => {
                  const agotado = t.stock <= 0;
                  return (
                    <button
                      key={t.id}
                      disabled={agotado}
                      onClick={() => { setTallaSeleccionada(t); setCantidad(1); }}
                      className={`min-w-[50px] px-3 py-2.5 rounded-xl text-xs font-black transition-all duration-300 border relative overflow-hidden ${
                        tallaSeleccionada?.id === t.id
                          ? 'bg-[#4a1d44] text-white border-[#4a1d44] shadow-lg scale-105 z-10'
                          : agotado
                            ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-[#4a1d44] border-[#4a1d44]/10 hover:border-[#4a1d44]/30'
                      }`}
                    >
                      <span className={agotado ? 'opacity-50' : ''}>{t.nombre}</span>
                      {agotado && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-[1.5px] bg-gray-300 -rotate-45" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Sin stock disponible</p>
            )}

            <div className="h-6 mt-3">
              {tallaSeleccionada && (
                <p className="text-[10px] font-bold text-[#4a1d44]/40 uppercase tracking-widest animate-in fade-in slide-in-from-top-1 duration-300">
                  {tallaSeleccionada.stock > 0 
                    ? 'Disponible en stock' 
                    : 'Agotado'}
                </p>
              )}
            </div>
          </div>

          {/* Selector de Cantidad - Siempre presente para evitar saltos */}
          <div className="py-2 flex flex-col items-start min-h-[80px]">
            <h3 className="text-[9px] font-bold uppercase tracking-widest mb-3 opacity-50">Cantidad</h3>
            <div className={`flex items-center bg-white border border-[#4a1d44]/10 rounded-xl overflow-hidden shadow-sm transition-opacity duration-300 ${!tallaSeleccionada || tallaSeleccionada.stock <= 0 ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <button 
                onClick={() => setCantidad(prev => Math.max(1, prev - 1))}
                className="p-3 hover:bg-[#4a1d44]/5 transition-colors text-[#4a1d44]"
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-black text-sm">{cantidad}</span>
              <button 
                onClick={() => setCantidad(prev => Math.min(tallaSeleccionada?.stock || 1, prev + 1))}
                className="p-3 hover:bg-[#4a1d44]/5 transition-colors text-[#4a1d44]"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-row gap-6 pt-2 justify-start items-center">
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest opacity-60">
              <Check size={14} className="text-[#4a1d44]" /> Compra Segura
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest opacity-60">
              <Check size={14} className="text-[#4a1d44]" /> Envíos Nacionales
            </div>
          </div>

          <div className="pt-2 min-h-[64px]">
            <button
              onClick={handleAddToCart}
              disabled={tallasLoading || !tallaSeleccionada || tallaSeleccionada.stock <= 0}
              className="w-full bg-[#4a1d44] text-white py-4 rounded-xl text-[11px] font-black tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl hover:bg-[#5c2454] active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              {tallasLoading ? <Loader2 className="animate-spin" size={18} /> : <ShoppingCart size={18} />} 
              AÑADIR AL CARRITO
            </button>
          </div>

          {/* Acordeones */}
          <div className="mt-4 border border-[#4a1d44]/10 rounded-2xl overflow-hidden bg-[#fdf8f6]/50">
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
          <div ref={scrollRef} className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-6 snap-x items-stretch">
            {relacionados.map((prod) => (
              <div key={prod.id} className="min-w-[200px] max-w-[200px] md:min-w-[250px] md:max-w-[250px] snap-start shrink-0 flex">
                <div className="transform md:scale-95 origin-top transition-transform hover:scale-100 w-full h-full [&>div]:h-full">
                  <ProductoCard producto={prod} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Modal Guía de Tallas */}
      <SizeGuideModal 
        isOpen={isSizeGuideOpen} 
        onClose={() => setIsSizeGuideOpen(false)} 
      />
    </main>
  );
}
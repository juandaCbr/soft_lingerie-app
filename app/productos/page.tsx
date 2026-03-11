"use client";

import { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from '@/app/lib/supabase';
import {
  Heart,
  Search,
  ChevronDown,
  Palette,
  SlidersHorizontal,
  ArrowUpDown,
  MessageCircle,
  ArrowUp
} from 'lucide-react';
import ProductoCard from '@/components/ProductoCard';

// Fetcher para SWR
const fetcher = async () => {
  const { data, error } = await supabase
    .from('productos')
    .select(`
      *,
      producto_colores!left (
        colores (nombre, hex)
      ),
      producto_tallas!left (
        stock_talla,
        tallas (nombre, id, orden)
      )
    `)
    .eq('activo', true);
  if (error) throw error;
  return data;
};

export default function CatalogoPage() {
  const { data: rawData, mutate, isLoading } = useSWR('productos-activos', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const [productos, setProductos] = useState<any[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [colorSeleccionado, setColorSeleccionado] = useState('Todos');
  const [tallaSeleccionada, setTallaSeleccionada] = useState('Todas');
  const [ordenarPor, setOrdenarPor] = useState('novedades');
  const [busqueda, setBusqueda] = useState('');

  const [isColorFilterOpen, setIsColorFilterOpen] = useState(false);
  const [isTallaFilterOpen, setIsTallaFilterOpen] = useState(false);
  const [isCatFilterOpen, setIsCatFilterOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [productosVisibles, setProductosVisibles] = useState(12);

  const numeroWhatsApp = "573118897646";

  useEffect(() => {
    if (rawData) {
      const tempGrupos: any = {};
      rawData.forEach(item => {
        const gid = item.grupo_id || `item-${item.id}`;
        if (!tempGrupos[gid]) {
          tempGrupos[gid] = { ...item, variantes: [item] };
        } else {
          tempGrupos[gid].variantes.push(item);
        }
      });
      setProductos(Object.values(tempGrupos));
    }
  }, [rawData]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setProductosVisibles(12);
  }, [categoriaSeleccionada, colorSeleccionado, tallaSeleccionada, busqueda, ordenarPor]);

  const { categoriasDisponibles, coloresDisponibles, tallasDisponibles } = useMemo(() => {
    const cats = new Set<string>();
    const cols = new Map<string, string>();
    const tals = new Map<string, {nombre: string, orden: number}>();

    productos.forEach(p => {
      const catNombre = typeof p.categoria === 'object' ? p.categoria?.nombre : p.categoria;
      if (catNombre) cats.add(String(catNombre).trim());

      p.variantes.forEach((v: any) => {
        // Quitamos la restricción de stock > 0 para que los filtros muestren todo lo activo
        v.producto_colores?.forEach((pc: any) => {
          if (pc.colores) cols.set(pc.colores.nombre, pc.colores.hex);
        });
        v.producto_tallas?.forEach((pt: any) => {
          if (pt.tallas) {
            tals.set(pt.tallas.nombre, { nombre: pt.tallas.nombre, orden: pt.tallas.orden || 0 });
          }
        });
      });
    });

    return {
      categoriasDisponibles: Array.from(cats).sort(),
      coloresDisponibles: Array.from(cols.entries()).map(([nombre, hex]) => ({ nombre, hex })),
      tallasDisponibles: Array.from(tals.values()).sort((a, b) => a.orden - b.orden)
    };
  }, [productos]);

  const productosFinales = useMemo(() => {
    const query = busqueda.toLowerCase().trim();
    let resultado = productos.filter(p => {
      const catProd = typeof p.categoria === 'object' ? p.categoria?.nombre : p.categoria;
      const catString = String(catProd || "").toLowerCase();
      const nombreString = (p.nombre || "").toLowerCase();

      const matchSearch = query === "" || nombreString.includes(query) || catString.includes(query);
      const matchCat = categoriaSeleccionada === 'Todas' || String(catProd).trim() === categoriaSeleccionada;
      const matchColor = colorSeleccionado === 'Todos' || p.variantes.some((v: any) =>
        v.producto_colores?.some((pc: any) => pc.colores?.nombre === colorSeleccionado)
      );
      const matchTalla = tallaSeleccionada === 'Todas' || p.variantes.some((v: any) =>
        v.producto_tallas?.some((pt: any) => pt.tallas?.nombre === tallaSeleccionada && pt.stock_talla > 0)
      );

      return matchSearch && matchCat && matchColor && matchTalla;
    });

    return [...resultado].sort((a, b) => {
      if (ordenarPor === 'precio-menor') return a.precio - b.precio;
      if (ordenarPor === 'precio-mayor') return b.precio - a.precio;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [productos, busqueda, categoriaSeleccionada, colorSeleccionado, tallaSeleccionada, ordenarPor]);

  if (isLoading && productos.length === 0) return <CatalogoSkeleton />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 text-[#4a1d44] min-h-screen relative">
      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-8 right-8 z-50 p-4 bg-[#4a1d44] text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-90">
          <ArrowUp size={20} />
        </button>
      )}

      <header className="text-center mb-16">
        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-[#4a1d44]/20 mb-4 block">Colecciones de Lujo</span>
        <h1 className="text-5xl md:text-7xl font-black font-playfair uppercase italic leading-none">Catálogo Soft</h1>
        <div className="h-[2px] w-16 bg-[#4a1d44]/10 mx-auto mt-8" />
      </header>

      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-white/40 p-6 rounded-[2.5rem] border border-[#4a1d44]/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#fdf8f6] rounded-2xl"><SlidersHorizontal size={18} className="opacity-40" /></div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest block opacity-30">Disponibilidad</span>
            <span className="text-xs font-black uppercase tracking-widest">{productosFinales.length} Diseños Disponibles</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:min-w-[280px]">
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full bg-white py-4 pl-6 pr-14 rounded-2xl outline-none text-xs font-bold border border-[#4a1d44]/5 focus:border-[#4a1d44]/20 transition-all shadow-sm" 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)} 
            />
            <Search size={18} className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20" />
          </div>

          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border border-[#4a1d44]/5 shadow-sm">
            <ArrowUpDown size={14} className="opacity-30" />
            <select value={ordenarPor} onChange={(e) => setOrdenarPor(e.target.value)} className="bg-transparent text-xs font-black uppercase tracking-widest outline-none cursor-pointer">
              <option value="novedades">Novedades</option>
              <option value="precio-menor">Menor Precio</option>
              <option value="precio-mayor">Mayor Precio</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-start relative mb-24">
        <aside className="w-full lg:w-[260px] lg:sticky lg:top-24 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-[#4a1d44]/10 p-8 shadow-sm">
            
            {/* CATEGORÍAS */}
            <div className="mb-10">
              <button onClick={() => setIsCatFilterOpen(!isCatFilterOpen)} className="w-full flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 hover:opacity-100 transition-all">
                Categoría <ChevronDown size={14} className={isCatFilterOpen ? "rotate-180" : ""} />
              </button>
              {isCatFilterOpen && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <button onClick={() => setCategoriaSeleccionada('Todas')} className={`text-left px-4 py-2.5 rounded-xl text-xs transition-all ${categoriaSeleccionada === 'Todas' ? 'bg-[#4a1d44] text-white font-bold' : 'hover:bg-[#fdf8f6]'}`}>Ver Todo</button>
                  {categoriasDisponibles.map(cat => (
                    <button key={cat} onClick={() => setCategoriaSeleccionada(cat)} className={`text-left px-4 py-2.5 rounded-xl text-xs transition-all ${categoriaSeleccionada === cat ? 'bg-[#4a1d44] text-white font-bold' : 'hover:bg-[#fdf8f6]'}`}>{cat}</button>
                  ))}
                </div>
              )}
            </div>

            {/* TALLAS */}
            <div className="mb-10">
              <button onClick={() => setIsTallaFilterOpen(!isTallaFilterOpen)} className="w-full flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 hover:opacity-100 transition-all">
                Talla <ChevronDown size={14} className={isTallaFilterOpen ? "rotate-180" : ""} />
              </button>
              {isTallaFilterOpen && (
                <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                  <button onClick={() => setTallaSeleccionada('Todas')} className={`py-3 rounded-xl text-[9px] font-black border transition-all ${tallaSeleccionada === 'Todas' ? 'bg-[#4a1d44] text-white border-[#4a1d44]' : 'bg-white border-[#4a1d44]/10 hover:border-[#4a1d44]/30'}`}>ALL</button>
                  {tallasDisponibles.map(t => (
                    <button key={t.nombre} onClick={() => setTallaSeleccionada(t.nombre)} className={`py-3 rounded-xl text-[9px] font-black border transition-all ${tallaSeleccionada === t.nombre ? 'bg-[#4a1d44] text-white border-[#4a1d44]' : 'bg-white border-[#4a1d44]/10 hover:border-[#4a1d44]/30'}`}>{t.nombre}</button>
                  ))}
                </div>
              )}
            </div>

            {/* COLORES */}
            <div className="mb-6">
              <button onClick={() => setIsColorFilterOpen(!isColorFilterOpen)} className="w-full flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 hover:opacity-100 transition-all">
                Color <ChevronDown size={14} className={isColorFilterOpen ? "rotate-180" : ""} />
              </button>
              {isColorFilterOpen && (
                <div className="grid grid-cols-4 gap-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-500">
                  <button onClick={() => setColorSeleccionado('Todos')} className={`w-10 h-10 rounded-full border text-[8px] font-black flex items-center justify-center border-[#4a1d44]/10 ${colorSeleccionado === 'Todos' ? 'bg-[#4a1d44] text-white' : 'bg-white'}`}>TODO</button>
                  {coloresDisponibles.map(col => {
                    let colorHex = col.hex;
                    const nombreBajo = col.nombre.toLowerCase();
                    if (nombreBajo.includes('vino tinto')) colorHex = '#6B1324';
                    if (nombreBajo === 'amarillo') colorHex = '#FDE047';
                    if (nombreBajo === 'azul celeste') colorHex = '#BAE6FD';
                    if (nombreBajo === 'lila') colorHex = '#D8B4FE';
                    if (nombreBajo === 'amarillo pastel') colorHex = '#FEF9C3';
                    
                    return (
                      <button 
                        key={col.nombre} 
                        title={col.nombre} 
                        onClick={() => setColorSeleccionado(col.nombre)} 
                        className={`w-10 h-10 rounded-full border transition-all hover:scale-110 ${colorSeleccionado === col.nombre ? 'border-[#4a1d44] ring-2 ring-offset-2 ring-[#4a1d44]/20 scale-110' : 'border-black/10'}`} 
                        style={{ backgroundColor: colorHex }} 
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {(busqueda || categoriaSeleccionada !== 'Todas' || colorSeleccionado !== 'Todos' || tallaSeleccionada !== 'Todas') && (
              <button onClick={() => { setBusqueda(''); setCategoriaSeleccionada('Todas'); setColorSeleccionado('Todos'); setTallaSeleccionada('Todas'); }} className="mt-12 w-full py-4 text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-50 rounded-2xl hover:bg-red-50 transition-all">Limpiar</button>
            )}
          </div>
        </aside>

        <div className="flex-1 w-full">
          {productosFinales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 opacity-40">
              <Heart size={44} className="mb-5" />
              <p className="text-[10px] font-black uppercase tracking-widest">No hay resultados</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16">
                {productosFinales.slice(0, productosVisibles).map(prod => (
                  <ProductoCard key={prod.id} producto={prod} colorFiltro={colorSeleccionado} priority={productosFinales.indexOf(prod) < 4} />
                ))}
              </div>
              {productosVisibles < productosFinales.length && (
                <div className="mt-20 flex justify-center">
                  <button onClick={() => setProductosVisibles(prev => prev + 12)} className="px-10 py-4 bg-white border border-[#4a1d44]/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#4a1d44] hover:text-white transition-all shadow-sm">Ver más diseños</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <section className="bg-[#4a1d44] text-white p-10 md:p-16 rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="max-w-xl">
          <h2 className="text-3xl md:text-5xl font-black font-playfair italic mb-4">¿Dudas con tu talla?</h2>
          <p className="opacity-70">Asesoría personalizada por WhatsApp.</p>
        </div>
        <a href={`https://wa.me/${numeroWhatsApp}`} target="_blank" className="flex items-center gap-4 bg-white text-[#4a1d44] px-10 py-5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#f2e1d9] transition-all">
          <MessageCircle /> Chatear ahora
        </a>
      </section>
    </main>
  );
}

function CatalogoSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 animate-pulse">
      <div className="h-16 w-80 bg-gray-100 rounded-full mx-auto mb-20" />
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="w-full lg:w-[260px] h-96 bg-gray-50 rounded-[2.5rem]" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-10 flex-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-6">
              <div className="aspect-[3/4] bg-gray-100 rounded-[2.5rem]" />
              <div className="h-4 w-3/4 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

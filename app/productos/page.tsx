"use client";

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  Heart,
  Search,
  ChevronDown,
  Palette,
  SlidersHorizontal,
  ArrowUpDown,
  MessageCircle,
  ArrowUp,
  Ruler
} from 'lucide-react';
import ProductoCard from '@/components/ProductoCard';

export default function CatalogoPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de configuracion
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [colorSeleccionado, setColorSeleccionado] = useState('Todos');
  const [tallaSeleccionada, setTallaSeleccionada] = useState('Todas');
  const [ordenarPor, setOrdenarPor] = useState('novedades');
  const [busqueda, setBusqueda] = useState('');

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isColorFilterOpen, setIsColorFilterOpen] = useState(false);
  const [isTallaFilterOpen, setIsTallaFilterOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [productosVisibles, setProductosVisibles] = useState(12);

  const numeroWhatsApp = "573118897646";

  useEffect(() => {
    fetchData();
    // ... (rest of useEffect remains same)

    const canalCatalogo = supabase
      .channel('catalogo-premium-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        () => fetchData()
      )
      .subscribe();

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      supabase.removeChannel(canalCatalogo);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  async function fetchData() {
    try {
      const { data: prodData, error: prodError } = await supabase
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

      if (prodError) throw prodError;

      if (prodData) {
        const tempGrupos: any = {};
        prodData.forEach(item => {
          const gid = item.grupo_id || `item-${item.id}`;
          if (!tempGrupos[gid]) {
            tempGrupos[gid] = { ...item, variantes: [item] };
          } else {
            tempGrupos[gid].variantes.push(item);
          }
        });
        setProductos(Object.values(tempGrupos));
      }
    } catch (err) {
      console.error("Error al sincronizar catalogo:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setProductosVisibles(12);
  }, [categoriaSeleccionada, colorSeleccionado, tallaSeleccionada, busqueda, ordenarPor]);

  // --- LÓGICA DE FILTROS DINÁMICOS (SOLO LO DISPONIBLE) ---
  
  const { categoriasDisponibles, coloresDisponibles, tallasDisponibles } = useMemo(() => {
    const cats = new Set<string>();
    const cols = new Map<string, string>(); // nombre -> hex
    const tals = new Map<string, {nombre: string, orden: number}>();

    productos.forEach(p => {
      // Categorías
      const catNombre = typeof p.categoria === 'object' ? p.categoria?.nombre : p.categoria;
      if (catNombre) cats.add(String(catNombre).trim());

      // Colores y Tallas de las variantes que tengan stock
      p.variantes.forEach((v: any) => {
        const tieneStockTotal = (v.stock || 0) > 0;
        
        if (tieneStockTotal) {
          // Colores disponibles
          v.producto_colores?.forEach((pc: any) => {
            if (pc.colores) {
              cols.set(pc.colores.nombre, pc.colores.hex);
            }
          });

          // Tallas disponibles (solo las que tienen stock_talla > 0)
          v.producto_tallas?.forEach((pt: any) => {
            if (pt.tallas && pt.stock_talla > 0) {
              tals.set(pt.tallas.nombre, { nombre: pt.tallas.nombre, orden: pt.tallas.orden || 0 });
            }
          });
        }
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

  if (loading) return <CatalogoSkeleton />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 text-[#4a1d44] min-h-screen relative">

      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-8 right-8 z-50 p-4 bg-[#4a1d44] text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-90 animate-in fade-in zoom-in">
          <ArrowUp size={20} />
        </button>
      )}

      <header className="text-center mb-12 flex flex-col items-center">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#4a1d44]/30 mb-4">Colecciones Exclusivas</span>
        <h1 className="text-4xl md:text-6xl font-black font-playfair uppercase text-[#4a1d44] tracking-tight italic">Catálogo Soft</h1>
        <div className="h-[2px] w-12 bg-[#4a1d44]/20 mt-6" />
      </header>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white/60 p-5 rounded-[2rem] border border-[#4a1d44]/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f2e1d9] flex items-center justify-center"><SlidersHorizontal size={14} className="text-[#4a1d44]" /></div>
          <span className="text-[10px] font-black uppercase tracking-widest">{productosFinales.length} Diseños Disponibles</span>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-2xl border border-[#4a1d44]/5 shadow-sm w-full md:min-w-[200px]">
            <ArrowUpDown size={14} className="opacity-40" />
            <select value={ordenarPor} onChange={(e) => setOrdenarPor(e.target.value)} className="bg-transparent text-xs font-bold outline-none cursor-pointer w-full text-[#4a1d44]">
              <option value="novedades">Ultimas Novedades</option>
              <option value="precio-menor">Precio: Mas Bajo</option>
              <option value="precio-mayor">Precio: Mas Alto</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start relative mb-20">
        <aside className="w-full lg:w-[260px] flex-shrink-0 lg:sticky lg:top-24 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-[#4a1d44]/10 p-7 shadow-sm">
            <div className="mb-8">
              <div className="relative group">
                <input type="text" placeholder="Buscar estilo..." className="w-full bg-[#fdf8f6] border border-transparent focus:border-[#4a1d44]/10 py-4 pl-5 pr-12 rounded-2xl outline-none text-sm font-medium transition-all" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                <Search size={18} className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* CATEGORÍAS DISPONIBLES */}
            <div className="mb-8">
              <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="w-full flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-4 opacity-50 hover:opacity-100 transition-all">
                Categoría <ChevronDown size={14} className={isFiltersOpen ? "rotate-180" : ""} />
              </button>
              {isFiltersOpen && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <button onClick={() => setCategoriaSeleccionada('Todas')} className={`text-left px-4 py-2.5 rounded-xl text-xs transition-all ${categoriaSeleccionada === 'Todas' ? 'bg-[#4a1d44] text-white font-bold' : 'hover:bg-[#fdf8f6]'}`}>Ver Todo</button>
                  {categoriasDisponibles.map((cat) => (
                    <button key={cat} onClick={() => setCategoriaSeleccionada(cat)} className={`text-left px-4 py-2.5 rounded-xl text-xs transition-all ${categoriaSeleccionada === cat ? 'bg-[#4a1d44] text-white font-bold' : 'hover:bg-[#fdf8f6]'}`}>{cat}</button>
                  ))}
                </div>
              )}
            </div>

            {/* TALLAS DISPONIBLES */}
            <div className="mb-8">
              <button onClick={() => setIsTallaFilterOpen(!isTallaFilterOpen)} className="w-full flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-4 opacity-50 hover:opacity-100 transition-all">
                Talla <ChevronDown size={14} className={isTallaFilterOpen ? "rotate-180" : ""} />
              </button>
              {isTallaFilterOpen && (
                <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <button onClick={() => setTallaSeleccionada('Todas')} className={`px-2 py-2 rounded-xl text-[9px] font-black border transition-all ${tallaSeleccionada === 'Todas' ? 'bg-[#4a1d44] text-white border-[#4a1d44]' : 'bg-white border-[#4a1d44]/10 hover:border-[#4a1d44]/30'}`}>ALL</button>
                  {tallasDisponibles.map((t) => (
                    <button key={t.nombre} onClick={() => setTallaSeleccionada(t.nombre)} className={`px-2 py-2 rounded-xl text-[9px] font-black border transition-all ${tallaSeleccionada === t.nombre ? 'bg-[#4a1d44] text-white border-[#4a1d44]' : 'bg-white border-[#4a1d44]/10 hover:border-[#4a1d44]/30'}`}>{t.nombre}</button>
                  ))}
                </div>
              )}
            </div>

            {/* COLORES DISPONIBLES */}
            <div className="mb-4">
              <button onClick={() => setIsColorFilterOpen(!isColorFilterOpen)} className="w-full flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-4 opacity-50 hover:opacity-100 transition-all">
                Gama de Colores <ChevronDown size={14} className={isColorFilterOpen ? "rotate-180" : ""} />
              </button>
              {isColorFilterOpen && (
                <div className="grid grid-cols-5 gap-2.5 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <button onClick={() => setColorSeleccionado('Todos')} className={`w-9 h-9 rounded-full border flex items-center justify-center text-[8px] font-black ${colorSeleccionado === 'Todos' ? 'border-[#4a1d44] bg-[#4a1d44] text-white shadow-lg' : 'border-gray-100 hover:bg-gray-50'}`}>TODO</button>
                  {coloresDisponibles.map((col) => {
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
                        className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 active:scale-90 ${colorSeleccionado === col.nombre ? 'border-[#4a1d44] scale-110 shadow-md' : 'border-transparent shadow-sm'}`} 
                        style={{ backgroundColor: colorHex }} 
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {(busqueda || categoriaSeleccionada !== 'Todas' || colorSeleccionado !== 'Todos' || tallaSeleccionada !== 'Todas') && (
              <button onClick={() => { setBusqueda(''); setCategoriaSeleccionada('Todas'); setColorSeleccionado('Todos'); setTallaSeleccionada('Todas'); }} className="mt-10 w-full py-3.5 text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-50 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all">Limpiar Selección</button>
            )}
          </div>
        </aside>

        <div className="flex-1 w-full">
          {productosFinales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 bg-white/40 rounded-[3.5rem] border border-dashed border-[#4a1d44]/10 backdrop-blur-sm">
              <Heart size={44} className="opacity-10 mb-5" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">No encontramos coincidencias</p>
              <p className="text-xs opacity-30">Prueba con otros filtros o busca un término general.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16">
                {productosFinales.slice(0, productosVisibles).map((prod) => (
                  <ProductoCard key={prod.id} producto={prod} colorFiltro={colorSeleccionado} />
                ))}
              </div>
              
              {productosVisibles < productosFinales.length && (
                <div className="mt-20 flex justify-center">
                  <button 
                    onClick={() => setProductosVisibles(prev => prev + 12)}
                    className="px-10 py-4 bg-white border border-[#4a1d44]/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#4a1d44] hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    Ver más diseños
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <section className="mt-10 mb-20 bg-[#4a1d44] text-white p-10 md:p-16 rounded-[3.5rem] shadow-2xl relative overflow-hidden text-center md:text-left">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-5xl font-black font-playfair italic mb-4 leading-tight">¿Dudas con tu talla o modelo?</h2>
            <p className="text-sm md:text-lg opacity-70 font-medium leading-relaxed">No te preocupes, estamos aquí para asesorarte de forma personalizada por WhatsApp. ¡Escríbenos y encuentra tu conjunto ideal!</p>
          </div>
          <a href={`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent("¡Hola! Estoy viendo el catálogo y necesito asesoría con una prenda.")}`} target="_blank" className="group flex items-center gap-4 bg-white text-[#4a1d44] px-10 py-5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#f2e1d9] transition-all shadow-xl whitespace-nowrap active:scale-95">
            <MessageCircle className="group-hover:rotate-12 transition-transform" /> Chatear ahora
          </a>
        </div>
      </section>
    </main>
  );
}

function CatalogoSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-20">
      <div className="h-16 w-80 bg-gray-100 rounded-full mx-auto mb-20 animate-pulse" />
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="w-full lg:w-[260px] h-96 bg-gray-50 rounded-[2.5rem] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-10 flex-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-6">
              <div className="aspect-[3/4] bg-gray-100 rounded-[2.5rem] animate-pulse" />
              <div className="h-5 w-3/4 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-50 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
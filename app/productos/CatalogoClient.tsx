"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import {
  Heart,
  Search,
  ChevronDown,
  SlidersHorizontal,
  ArrowUpDown,
  MessageCircle,
  ArrowUp,
} from "lucide-react";
import ProductoCard from "@/components/ProductoCard";
import type {
  ProductoCatalogoGrupo,
  ProductoCatalogoVariante,
} from "@/app/lib/catalog-types";
import { getColorInfo } from "@/app/lib/catalog-helpers";

type CatalogoClientProps = {
  rawDataInicial: ProductoCatalogoVariante[];
};

const CATALOGO_PRODUCTOS_SELECT = `
  id,
  nombre,
  descripcion,
  precio,
  stock,
  created_at,
  grupo_id,
  categoria,
  imagenes_urls,
  imagenes_locales,
  producto_colores!left (
    colores (nombre, hex)
  ),
  producto_tallas!left (
    stock_talla,
    tallas (nombre, id, orden)
  )
`;

const fetcher = async (): Promise<ProductoCatalogoVariante[]> => {
  const { data, error } = await supabase
    .from("productos")
    .select(CATALOGO_PRODUCTOS_SELECT)
    .eq("activo", true);
  if (error) throw error;
  return (data || []) as unknown as ProductoCatalogoVariante[];
};

/** Estado de filtros derivado de la URL (única fuente de verdad) para que «atrás» restaure el catálogo. */
type CatalogoFiltrosUrl = {
  q: string;
  categoriaSeleccionada: string;
  colorSeleccionado: string;
  tallaSeleccionada: string;
  ordenarPor: string;
  mostrarAgotados: boolean;
};

function parseCatalogSearchParams(sp: URLSearchParams): CatalogoFiltrosUrl {
  const orden = sp.get("orden") ?? "novedades";
  return {
    q: sp.get("q") ?? "",
    categoriaSeleccionada: sp.get("cat") ?? "Todas",
    colorSeleccionado: sp.get("color") ?? "Todos",
    tallaSeleccionada: sp.get("talla") ?? "Todas",
    ordenarPor: ["novedades", "precio-menor", "precio-mayor"].includes(orden) ? orden : "novedades",
    mostrarAgotados: sp.get("agotados") === "1",
  };
}

function buildCatalogSearchParams(f: CatalogoFiltrosUrl): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.categoriaSeleccionada !== "Todas") p.set("cat", f.categoriaSeleccionada);
  if (f.colorSeleccionado !== "Todos") p.set("color", f.colorSeleccionado);
  if (f.tallaSeleccionada !== "Todas") p.set("talla", f.tallaSeleccionada);
  if (f.ordenarPor === "precio-menor" || f.ordenarPor === "precio-mayor") p.set("orden", f.ordenarPor);
  if (f.mostrarAgotados) p.set("agotados", "1");
  return p.toString();
}

export default function CatalogoClient({ rawDataInicial }: CatalogoClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filtros = useMemo(() => parseCatalogSearchParams(searchParams), [searchParams]);
  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  /** Texto de búsqueda en vivo (la URL puede ir un tick detrás al escribir rápido). */
  const [busquedaLive, setBusquedaLive] = useState(() => parseCatalogSearchParams(searchParams).q);
  useEffect(() => {
    setBusquedaLive(filtros.q);
  }, [filtros.q]);

  const patchFiltros = useCallback(
    (patch: Partial<CatalogoFiltrosUrl>) => {
      const next: CatalogoFiltrosUrl = { ...filtrosRef.current, ...patch };
      const qs = buildCatalogSearchParams(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // Hidrata con datos del servidor para evitar "pantalla vacía" al primer render.
  const { data: rawData, mutate, isLoading } = useSWR("productos-catalogo-v2", fetcher, {
    fallbackData: rawDataInicial,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("catalogo-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "productos" }, () => {
        mutate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  const [productos, setProductos] = useState<ProductoCatalogoGrupo[]>([]);
  const { categoriaSeleccionada, colorSeleccionado, tallaSeleccionada, ordenarPor, mostrarAgotados } =
    filtros;

  const [isColorFilterOpen, setIsColorFilterOpen] = useState(false);
  const [isTallaFilterOpen, setIsTallaFilterOpen] = useState(false);
  const [isCatFilterOpen, setIsCatFilterOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [productosVisibles, setProductosVisibles] = useState(12);

  const numeroWhatsApp = "573118897646";

  const getSafeTimestamp = (value?: string) => {
    const ts = new Date(value || "").getTime();
    return Number.isFinite(ts) ? ts : 0;
  };

  const toNumericId = (id: string | number) => {
    const n = Number(id);
    return Number.isFinite(n) ? n : 0;
  };

  useEffect(() => {
    if (rawData) {
      const tempGrupos: Record<string, ProductoCatalogoGrupo> = {};
      rawData.forEach((item) => {
        const gid = String(item.grupo_id || `item-${item.id}`);
        const existing = tempGrupos[gid];
        if (!existing) {
          tempGrupos[gid] = { ...item, variantes: [item] };
        } else {
          existing.variantes.push(item);
        }
      });
      const gruposFinales = Object.values(tempGrupos).filter(
        (g) => g.variantes.length > 0,
      );
      setProductos(gruposFinales);
    } else {
      setProductos([]);
    }
  }, [rawData]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setProductosVisibles(12);
  }, [searchParams]);

  const { categoriasDisponibles, coloresDisponibles, tallasDisponibles } = useMemo(() => {
    const cats = new Set<string>();
    const cols = new Map<string, string>();
    const tals = new Map<string, { nombre: string; orden: number }>();

    productos.forEach((p) => {
      const catNombre = typeof p.categoria === "object" ? p.categoria?.nombre : p.categoria;
      if (catNombre) cats.add(String(catNombre).trim());

      p.variantes.forEach((v) => {
        v.producto_colores?.forEach((pc) => {
          const ci = getColorInfo(pc);
          if (ci) cols.set(ci.nombre, ci.hex ?? "");
        });
        v.producto_tallas?.forEach((pt) => {
          if (pt.tallas) {
            tals.set(pt.tallas.nombre, { nombre: pt.tallas.nombre, orden: pt.tallas.orden || 0 });
          }
        });
      });
    });

    return {
      categoriasDisponibles: Array.from(cats).sort(),
      coloresDisponibles: Array.from(cols.entries()).map(([nombre, hex]) => ({ nombre, hex })),
      tallasDisponibles: Array.from(tals.values()).sort((a, b) => a.orden - b.orden),
    };
  }, [productos]);

  const productosFinales = useMemo(() => {
    const query = busquedaLive.toLowerCase().trim();
    const resultado = productos.filter((p) => {
      const catProd = typeof p.categoria === "object" ? p.categoria?.nombre : p.categoria;
      const catString = String(catProd || "").toLowerCase();
      const nombreString = (p.nombre || "").toLowerCase();

      const matchSearch = query === "" || nombreString.includes(query) || catString.includes(query);
      const matchCat = categoriaSeleccionada === "Todas" || String(catProd).trim() === categoriaSeleccionada;
      const matchColor =
        colorSeleccionado === "Todos" ||
        p.variantes.some((v) =>
          v.producto_colores?.some((pc) => getColorInfo(pc)?.nombre === colorSeleccionado),
        );
      const matchTalla =
        tallaSeleccionada === "Todas" ||
        p.variantes.some((v) =>
          v.producto_tallas?.some(
            (pt) => pt.tallas?.nombre === tallaSeleccionada && Number(pt.stock_talla ?? 0) > 0,
          ),
        );

      const varianteTieneStock = (v: ProductoCatalogoVariante): boolean => {
        if (Number(v.stock ?? 0) > 0) return true;
        return (v.producto_tallas ?? []).some((pt) => Number(pt.stock_talla ?? 0) > 0);
      };
      const tieneStock = p.variantes.some(varianteTieneStock);
      const matchStock = mostrarAgotados || tieneStock;

      return matchSearch && matchCat && matchColor && matchTalla && matchStock;
    });

    return [...resultado].sort((a, b) => {
      if (ordenarPor === "precio-menor") return Number(a.precio) - Number(b.precio);
      if (ordenarPor === "precio-mayor") return Number(b.precio) - Number(a.precio);
      const diffFecha = getSafeTimestamp(b.created_at) - getSafeTimestamp(a.created_at);
      if (diffFecha !== 0) return diffFecha;
      return toNumericId(b.id) - toNumericId(a.id);
    });
  }, [
    productos,
    busquedaLive,
    categoriaSeleccionada,
    colorSeleccionado,
    tallaSeleccionada,
    ordenarPor,
    mostrarAgotados,
  ]);

  if (isLoading && productos.length === 0) return <CatalogoSkeleton />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 text-[#4a1d44] min-h-screen relative">
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 z-50 p-4 bg-[#4a1d44] text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-90"
        >
          <ArrowUp size={20} />
        </button>
      )}

      <header className="text-center mb-16">
        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-[#4a1d44]/20 mb-4 block">
          Colecciones de Lujo
        </span>
        <h1 className="text-5xl md:text-7xl font-black font-playfair uppercase italic leading-none">
          Catálogo Soft
        </h1>
        <div className="h-[2px] w-16 bg-[#4a1d44]/10 mx-auto mt-8" />
      </header>

      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-white/40 p-6 rounded-[2.5rem] border border-[#4a1d44]/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#fdf8f6] rounded-2xl">
            <SlidersHorizontal size={18} className="opacity-40" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest block opacity-30">
              Disponibilidad
            </span>
            <span className="text-xs font-black uppercase tracking-widest">
              {productosFinales.length} Diseños Disponibles
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:min-w-[280px]">
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full bg-white py-4 pl-6 pr-14 rounded-2xl outline-none text-xs font-bold border border-[#4a1d44]/5 focus:border-[#4a1d44]/20 transition-all shadow-sm"
              value={busquedaLive}
              onChange={(e) => {
                const v = e.target.value;
                setBusquedaLive(v);
                patchFiltros({ q: v });
              }}
            />
            <Search size={18} className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20" />
          </div>

          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border border-[#4a1d44]/5 shadow-sm">
            <ArrowUpDown size={14} className="opacity-30" />
            <select
              value={ordenarPor}
              onChange={(e) => patchFiltros({ ordenarPor: e.target.value })}
              className="bg-transparent text-xs font-black uppercase tracking-widest outline-none cursor-pointer"
            >
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
            <div className="mb-10">
              <button
                onClick={() => setIsCatFilterOpen(!isCatFilterOpen)}
                className="w-full flex justify-between items-center text-[12px] font-black uppercase tracking-widest mb-6 opacity-60 hover:opacity-100 transition-all"
              >
                Categoría <ChevronDown size={14} className={isCatFilterOpen ? "rotate-180" : ""} />
              </button>
              {isCatFilterOpen && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <button
                    onClick={() => patchFiltros({ categoriaSeleccionada: "Todas" })}
                    className={`text-left px-4 py-2.5 rounded-xl text-xs transition-all ${categoriaSeleccionada === "Todas" ? "bg-[#4a1d44] text-white font-bold" : "hover:bg-[#fdf8f6]"}`}
                  >
                    Ver Todo
                  </button>
                  {categoriasDisponibles.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => patchFiltros({ categoriaSeleccionada: cat })}
                      className={`text-left px-4 py-2.5 rounded-xl text-xs transition-all ${categoriaSeleccionada === cat ? "bg-[#4a1d44] text-white font-bold" : "hover:bg-[#fdf8f6]"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-10">
              <button
                onClick={() => setIsTallaFilterOpen(!isTallaFilterOpen)}
                className="w-full flex justify-between items-center text-[12px] font-black uppercase tracking-widest mb-6 opacity-60 hover:opacity-100 transition-all"
              >
                Talla <ChevronDown size={14} className={isTallaFilterOpen ? "rotate-180" : ""} />
              </button>
              {isTallaFilterOpen && (
                <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                  <button
                    onClick={() => patchFiltros({ tallaSeleccionada: "Todas" })}
                    className={`py-3 rounded-xl text-[9px] font-black border transition-all ${tallaSeleccionada === "Todas" ? "bg-[#4a1d44] text-white border-[#4a1d44]" : "bg-white border-[#4a1d44]/10 hover:border-[#4a1d44]/30"}`}
                  >
                    ALL
                  </button>
                  {tallasDisponibles.map((t) => (
                    <button
                      key={t.nombre}
                      onClick={() => patchFiltros({ tallaSeleccionada: t.nombre })}
                      className={`py-3 rounded-xl text-[9px] font-black border transition-all ${tallaSeleccionada === t.nombre ? "bg-[#4a1d44] text-white border-[#4a1d44]" : "bg-white border-[#4a1d44]/10 hover:border-[#4a1d44]/30"}`}
                    >
                      {t.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <button
                onClick={() => setIsColorFilterOpen(!isColorFilterOpen)}
                className="w-full flex justify-between items-center text-[12px] font-black uppercase tracking-widest mb-6 opacity-60 hover:opacity-100 transition-all"
              >
                Color <ChevronDown size={14} className={isColorFilterOpen ? "rotate-180" : ""} />
              </button>
              {isColorFilterOpen && (
                <div className="grid grid-cols-4 gap-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-500">
                  <button
                    onClick={() => patchFiltros({ colorSeleccionado: "Todos" })}
                    className={`w-10 h-10 rounded-full border text-[8px] font-black flex items-center justify-center border-[#4a1d44]/10 ${colorSeleccionado === "Todos" ? "bg-[#4a1d44] text-white" : "bg-white"}`}
                  >
                    TODO
                  </button>
                  {coloresDisponibles.map((col) => {
                    let colorHex = col.hex;
                    const nombreBajo = col.nombre.toLowerCase();
                    if (nombreBajo.includes("vino tinto")) colorHex = "#6B1324";
                    if (nombreBajo === "amarillo") colorHex = "#FDE047";
                    if (nombreBajo === "azul celeste") colorHex = "#BAE6FD";
                    if (nombreBajo === "lila") colorHex = "#D8B4FE";
                    if (nombreBajo === "amarillo pastel") colorHex = "#FEF9C3";

                    return (
                      <button
                        key={col.nombre}
                        title={col.nombre}
                        onClick={() => patchFiltros({ colorSeleccionado: col.nombre })}
                        className={`w-10 h-10 rounded-full border transition-all hover:scale-110 ${colorSeleccionado === col.nombre ? "border-[#4a1d44] ring-2 ring-offset-2 ring-[#4a1d44]/20 scale-110" : "border-black/10"}`}
                        style={{ backgroundColor: colorHex }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[#4a1d44]/5 mt-2">
              <button
                type="button"
                onClick={() => patchFiltros({ mostrarAgotados: !mostrarAgotados })}
                className="w-full flex items-center justify-between gap-3 group"
              >
                <span className="text-[12px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-all">
                  Ver agotados
                </span>
                <div
                  className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${mostrarAgotados ? "bg-[#4a1d44]" : "bg-[#4a1d44]/10"}`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${mostrarAgotados ? "left-5" : "left-0.5"}`}
                  />
                </div>
              </button>
            </div>

            {(busquedaLive.trim() ||
              categoriaSeleccionada !== "Todas" ||
              colorSeleccionado !== "Todos" ||
              tallaSeleccionada !== "Todas" ||
              mostrarAgotados) && (
              <button
                onClick={() => router.replace(pathname, { scroll: false })}
                className="mt-6 w-full py-4 text-[12px] font-black uppercase tracking-widest bg-red-50 text-red-400 border border-red-100 rounded-2xl hover:bg-red-100 transition-all"
              >
                Limpiar
              </button>
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
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-4 sm:gap-y-10 md:gap-x-6 md:gap-y-12 lg:gap-x-7 lg:gap-y-14 xl:gap-x-8 xl:gap-y-16">
                {productosFinales.slice(0, productosVisibles).map((prod) => (
                  <ProductoCard
                    key={prod.id}
                    producto={prod}
                    colorFiltro={colorSeleccionado}
                    priority={productosFinales.indexOf(prod) < 4}
                    returnCatalogQuery={searchParams.toString() || undefined}
                  />
                ))}
              </div>
              {productosVisibles < productosFinales.length && (
                <div className="mt-20 flex justify-center">
                  <button
                    onClick={() => setProductosVisibles((prev) => prev + 12)}
                    className="px-10 py-4 bg-white border border-[#4a1d44]/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#4a1d44] hover:text-white transition-all shadow-sm"
                  >
                    Ver más diseños
                  </button>
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
        <a
          href={`https://wa.me/${numeroWhatsApp}`}
          target="_blank"
          className="flex items-center gap-4 bg-white text-[#4a1d44] px-10 py-5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#f2e1d9] transition-all"
        >
          <MessageCircle /> Chatear ahora
        </a>
      </section>
    </main>
  );
}

export function CatalogoSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 animate-pulse">
      <div className="h-16 w-80 bg-gray-100 rounded-full mx-auto mb-20" />
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="w-full lg:w-[260px] h-96 bg-gray-50 rounded-[2.5rem]" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-10 flex-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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

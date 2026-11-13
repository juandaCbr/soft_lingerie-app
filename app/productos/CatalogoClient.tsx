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
import { HomeCloud } from "@/components/home/HomeCloud";
import { CieloRosa } from "@/components/ui/CieloRosa";
import { LogoMarca } from "@/components/ui/LogoMarca";
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

  const numeroWhatsApp = "573208716919";

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

  const hayFiltrosActivos =
    !!busquedaLive.trim() ||
    categoriaSeleccionada !== "Todas" ||
    colorSeleccionado !== "Todos" ||
    tallaSeleccionada !== "Todas" ||
    mostrarAgotados;

  const chip = (activo: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
      activo ? "bg-ink text-white" : "bg-cream text-ink/75 hover:bg-brand-accent/60 hover:text-ink"
    }`;

  const tituloFiltro =
    "flex w-full items-center justify-between py-1 text-base font-semibold text-ink transition-colors hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

  return (
    <main className="relative min-h-screen font-display text-ink">
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Volver arriba"
          className="fixed bottom-8 right-8 z-50 grid h-12 w-12 place-items-center rounded-full bg-ink text-white shadow-2xl shadow-ink/30 transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* Encabezado: el mismo cielo rosa del hero, con la palabra grande y nubes al pie */}
      <header className="px-2 sm:px-3">
        <CieloRosa banco="top-[78%]" className="px-6 pb-28 pt-14 text-center md:pb-36 md:pt-20">
          <LogoMarca className="relative mb-4" />
          <p className="relative text-sm font-semibold text-brand-dark">Colección Soft Lingerie</p>
          <h1 className="text-wordmark relative mx-auto -mb-[0.16em] mt-2 w-max max-w-full px-[0.12em] pb-[0.16em] text-[clamp(3.75rem,13vw,10rem)] font-extrabold leading-[0.85] tracking-[-0.06em]">
            Catálogo
          </h1>
          <p className="relative mt-4 font-accent text-[clamp(0.95rem,1.6vw,1.25rem)] font-semibold uppercase tracking-[0.32em] text-ink">
            {productosFinales.length} diseños disponibles
          </p>
        </CieloRosa>
      </header>

      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
        {/* Barra de búsqueda y orden */}
        <div className="relative z-10 -mt-8 mb-10 flex flex-col gap-3 rounded-[1.75rem] bg-white p-3 shadow-xl shadow-ink/10 sm:flex-row sm:items-center md:-mt-10 md:mb-14">
          <label className="relative flex-1">
            <span className="sr-only">Buscar en el catálogo</span>
            <Search size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              placeholder="Buscar conjuntos, bodies, babydolls…"
              className="w-full rounded-full bg-cream py-3.5 pl-12 pr-5 text-[15px] font-medium text-ink outline-none transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
              value={busquedaLive}
              onChange={(e) => {
                const v = e.target.value;
                setBusquedaLive(v);
                patchFiltros({ q: v });
              }}
            />
          </label>

          <label className="flex items-center gap-2 rounded-full bg-cream px-5 py-3.5">
            <ArrowUpDown size={16} className="text-ink/45" aria-hidden />
            <span className="sr-only">Ordenar por</span>
            <select
              value={ordenarPor}
              onChange={(e) => patchFiltros({ ordenarPor: e.target.value })}
              className="cursor-pointer bg-transparent text-[15px] font-semibold text-ink outline-none"
            >
              <option value="novedades">Novedades</option>
              <option value="precio-menor">Menor precio</option>
              <option value="precio-mayor">Mayor precio</option>
            </select>
          </label>
        </div>

        <div className="relative mb-24 flex flex-col items-start gap-8 lg:flex-row lg:gap-10">
          {/* Filtros */}
          <aside className="w-full lg:sticky lg:top-28 lg:w-[270px]">
            <div className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-ink/5">
              <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-brand-dark">
                <SlidersHorizontal size={16} aria-hidden /> Filtrar
              </div>

              <div className="border-t border-ink/5 py-4">
                <button onClick={() => setIsCatFilterOpen(!isCatFilterOpen)} aria-expanded={isCatFilterOpen} className={tituloFiltro}>
                  Categoría <ChevronDown size={18} className={`transition-transform duration-300 ${isCatFilterOpen ? "rotate-180" : ""}`} />
                </button>
                {isCatFilterOpen && (
                  <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <button onClick={() => patchFiltros({ categoriaSeleccionada: "Todas" })} className={chip(categoriaSeleccionada === "Todas")}>
                      Ver todo
                    </button>
                    {categoriasDisponibles.map((cat) => (
                      <button key={cat} onClick={() => patchFiltros({ categoriaSeleccionada: cat })} className={chip(categoriaSeleccionada === cat)}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-ink/5 py-4">
                <button onClick={() => setIsTallaFilterOpen(!isTallaFilterOpen)} aria-expanded={isTallaFilterOpen} className={tituloFiltro}>
                  Talla <ChevronDown size={18} className={`transition-transform duration-300 ${isTallaFilterOpen ? "rotate-180" : ""}`} />
                </button>
                {isTallaFilterOpen && (
                  <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <button onClick={() => patchFiltros({ tallaSeleccionada: "Todas" })} className={chip(tallaSeleccionada === "Todas")}>
                      Todas
                    </button>
                    {tallasDisponibles.map((t) => (
                      <button key={t.nombre} onClick={() => patchFiltros({ tallaSeleccionada: t.nombre })} className={chip(tallaSeleccionada === t.nombre)}>
                        {t.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-ink/5 py-4">
                <button onClick={() => setIsColorFilterOpen(!isColorFilterOpen)} aria-expanded={isColorFilterOpen} className={tituloFiltro}>
                  Color <ChevronDown size={18} className={`transition-transform duration-300 ${isColorFilterOpen ? "rotate-180" : ""}`} />
                </button>
                {isColorFilterOpen && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <button onClick={() => patchFiltros({ colorSeleccionado: "Todos" })} className={chip(colorSeleccionado === "Todos")}>
                      Todos
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
                          aria-label={col.nombre}
                          onClick={() => patchFiltros({ colorSeleccionado: col.nombre })}
                          className={`h-9 w-9 rounded-full border transition-transform hover:scale-110 ${colorSeleccionado === col.nombre ? "scale-110 border-ink ring-2 ring-brand-primary ring-offset-2" : "border-ink/10"}`}
                          style={{ backgroundColor: colorHex }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-ink/5 pt-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={mostrarAgotados}
                  onClick={() => patchFiltros({ mostrarAgotados: !mostrarAgotados })}
                  className="group flex w-full items-center justify-between gap-3"
                >
                  <span className="text-base font-semibold text-ink">Ver agotados</span>
                  <span className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${mostrarAgotados ? "bg-ink" : "bg-brand-primary/50"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-300 ${mostrarAgotados ? "left-[1.375rem]" : "left-0.5"}`} />
                  </span>
                </button>
              </div>

              {hayFiltrosActivos && (
                <button
                  onClick={() => router.replace(pathname, { scroll: false })}
                  className="mt-6 w-full rounded-full border border-ink/20 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </aside>

          {/* Prendas */}
          <div className="w-full flex-1">
            {productosFinales.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[1.75rem] bg-white px-6 py-32 text-center">
                <Heart size={40} className="mb-5 text-brand-primary" aria-hidden />
                <p className="text-xl font-semibold text-ink">No encontramos prendas con esos filtros</p>
                <p className="mt-2 text-ink/60">Prueba con otra talla, color o categoría.</p>
                {hayFiltrosActivos && (
                  <button
                    onClick={() => router.replace(pathname, { scroll: false })}
                    className="mt-6 rounded-full bg-ink px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12 lg:grid-cols-3 2xl:grid-cols-4">
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
                  <div className="mt-16 flex flex-col items-center gap-3">
                    <p className="text-sm text-ink/55">
                      Viendo {Math.min(productosVisibles, productosFinales.length)} de {productosFinales.length}
                    </p>
                    <button
                      onClick={() => setProductosVisibles((prev) => prev + 12)}
                      className="rounded-full bg-ink px-9 py-4 text-sm font-bold text-white shadow-xl shadow-ink/20 transition-colors hover:bg-brand-dark active:scale-[0.98]"
                    >
                      Ver más diseños
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Asesoría: mismo cierre vino con nubes que la home */}
        <section className="relative mb-4 overflow-hidden rounded-[2rem] bg-ink px-6 pb-32 pt-14 text-white md:rounded-[3rem] md:px-16 md:pb-44 md:pt-20">
          <div className="relative z-[1] flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-brand-accent">Asesoría personalizada</p>
              <h2 className="mt-3 text-4xl font-bold leading-[0.95] tracking-[-0.04em] md:text-6xl">¿Dudas con tu talla?</h2>
              <p className="mt-4 text-white/70">Te acompañamos por WhatsApp a encontrar la prenda perfecta.</p>
            </div>
            <a
              href={`https://wa.me/${numeroWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[56px] shrink-0 items-center gap-3 rounded-full bg-brand-accent px-9 text-sm font-bold text-ink transition-colors hover:bg-white"
            >
              <MessageCircle size={18} aria-hidden /> Chatear ahora
            </a>
          </div>
          <HomeCloud sizes="(max-width: 1280px) 100vw, 1280px" className="inset-x-[-30%] -bottom-[18%] h-[50%] md:inset-x-[-6%] md:-bottom-[30%] md:h-[70%]" />
        </section>
      </div>
    </main>
  );
}

export function CatalogoSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="px-2 sm:px-3">
        <div className="h-[22rem] rounded-[1.75rem] bg-brand-primary/40 md:h-[26rem] md:rounded-[2.75rem]" />
      </div>
      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
        <div className="-mt-10 mb-14 h-[4.5rem] rounded-[1.75rem] bg-white" />
        <div className="flex flex-col gap-10 lg:flex-row">
          <div className="h-96 w-full rounded-[1.75rem] bg-white lg:w-[270px]" />
          <div className="grid flex-1 grid-cols-2 gap-6 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <div className="aspect-[4/5] rounded-[1.75rem] bg-blush/70" />
                <div className="h-4 w-3/4 rounded-full bg-blush/70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, ArrowLeft, Check, ChevronLeft, ChevronRight, ChevronDown, ShieldCheck, Heart, Truck, Ruler, Plus, Minus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';
import ProductoCard from '@/components/ProductoCard';
import { FlechasCarrusel } from '@/components/ui/FlechasCarrusel';
import SizeGuideModal from '@/components/SizeGuideModal';
import {
  getProductoImage,
  getProductoImageCount,
  toAbsolutePublicUrl,
  PLACEHOLDER_IMAGE,
} from '@/app/lib/image-helper';
import { slugify } from '@/app/lib/utils';
import { getSiteUrl } from '@/app/lib/site-url';
import { toMetaDescription } from '@/app/lib/seo-text';

function subscribeCatalogReturnQuery() {
  return () => {};
}

function getCatalogReturnQueryClient(): string | null {
  return new URLSearchParams(window.location.search).get('cv');
}

function getCatalogReturnQueryServer(): null {
  return null;
}

export default function ProductClient({ producto, variantesIniciales, relacionadosIniciales, tallasPorVarianteIniciales }: { 
  producto: any, 
  variantesIniciales: any[], 
  relacionadosIniciales: any[],
  tallasPorVarianteIniciales: Record<string, any[]>
}) {
  const router = useRouter();
  /** Query string del catálogo (p. ej. `q=a&cat=b`) para volver con filtros si no hay historial. */
  const catalogReturnQuery = useSyncExternalStore(
    subscribeCatalogReturnQuery,
    getCatalogReturnQueryClient,
    getCatalogReturnQueryServer,
  );
  const { addToCart, cart } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [variantes] = useState<any[]>(variantesIniciales);
  const [varianteActiva, setVarianteActiva] = useState<any>(producto);
  const getTallasOrdenadas = (productoId: any): any[] => {
    const ordenTallas: Record<string, number> = {
      XS: 1, xs: 1,
      S: 2, s: 2,
      M: 3, m: 3,
      L: 4, l: 4,
      XL: 5, xl: 5,
      XXL: 6, xxl: 6,
      'Única': 10, UNICA: 10, Unica: 10,
    };
    const lista = tallasPorVarianteIniciales[String(productoId)] || [];
    return [...lista].sort((a: any, b: any) => {
      const nombreA = a.nombre?.trim() || "";
      const nombreB = b.nombre?.trim() || "";
      return (ordenTallas[nombreA] || 99) - (ordenTallas[nombreB] || 99);
    });
  };

  const [tallasDisponibles, setTallasDisponibles] = useState<any[]>(() => getTallasOrdenadas(producto.id));
  const [tallaSeleccionada, setTallaSeleccionada] = useState<any>(() => {
    const iniciales = getTallasOrdenadas(producto.id);
    return iniciales.find((t: any) => t.stock > 0) || null;
  });
  const [cantidad, setCantidad] = useState(1);
  const [relacionados] = useState<any[]>(relacionadosIniciales);
  const [currentImg, setCurrentImg] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [acordeonAbierto, setAcordeonAbierto] = useState<string | null>(null);

  const cantidadReservadaParaSeleccion = (cart as any[]).reduce((acc, item) => {
    if (item.id !== varianteActiva.id) return acc;
    if (tallaSeleccionada?.id) {
      if (item.talla_id === tallaSeleccionada.id || !item.talla_id) {
        return acc + Number(item.quantity || 0);
      }
      return acc;
    }
    if (!item.talla_id) return acc + Number(item.quantity || 0);
    return acc;
  }, 0);

  const stockSeleccion = Number(tallaSeleccionada?.stock ?? varianteActiva.stock ?? 0);
  const restanteParaAgregar = Math.max(0, stockSeleccion - cantidadReservadaParaSeleccion);

  useEffect(() => {
    // Si cambia el carrito (se vacía o se quitan ítems), reacomoda cantidad al nuevo cupo real.
    if (!tallaSeleccionada) {
      setCantidad(1);
      return;
    }
    if (restanteParaAgregar <= 0) {
      setCantidad(1);
      return;
    }
    setCantidad((prev) => Math.min(Math.max(1, prev), restanteParaAgregar));
  }, [tallaSeleccionada?.id, restanteParaAgregar]);

  const toggleAcordeon = (seccion: string) => {
    setAcordeonAbierto(prev => prev === seccion ? null : seccion);
  };

  useEffect(() => {
    // Si cambia el producto base por navegación interna, re-hidrata tallas sin roundtrip.
    const tallasIniciales = getTallasOrdenadas(producto.id);
    setTallasDisponibles(tallasIniciales);
    setTallaSeleccionada(tallasIniciales.find((t: any) => t.stock > 0) || null);
    setCantidad(1);
  }, [producto.id]);

  const handleVarianteChange = (v: any) => {
    if (v.id === varianteActiva.id) return;
    setVarianteActiva(v);
    setCurrentImg(0);
    setImgErrors({});
    // Cambio instantáneo: toma tallas ya precargadas desde el servidor.
    const tallasDeVariante = getTallasOrdenadas(v.id);
    setTallasDisponibles(tallasDeVariante);
    setTallaSeleccionada(tallasDeVariante.find((t: any) => t.stock > 0) || null);
    setCantidad(1);
  };

  const handleAddToCart = async () => {
    if (tallasDisponibles.length > 0 && !tallaSeleccionada) {
      toast.error("Por favor selecciona una talla disponible");
      return;
    }
    if (tallaSeleccionada && (tallaSeleccionada.stock <= 0 || cantidad > restanteParaAgregar)) {
      toast.error("No hay suficiente stock para la cantidad seleccionada");
      return;
    }
    const agregado = await addToCart(varianteActiva, tallaSeleccionada, cantidad);
    if (agregado) {
      toast.success('¡Añadido al carrito!');
    } else {
      toast.error('No hay más stock disponible para agregar.');
    }
  };


  const handleBack = () => {
    // Historial típico: catálogo filtrado → producto (atrás restaura URL y scroll).
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    // Entrada directa o pestaña nueva: usar `cv` si vino desde el listado con filtros.
    if (catalogReturnQuery) {
      router.push(`/productos?${catalogReturnQuery}`);
      return;
    }
    router.push('/productos');
  };

  const imageCount = Math.max(1, getProductoImageCount(varianteActiva));
  const imagenes = Array.from({ length: imageCount }, (_, i) =>
    getProductoImage(varianteActiva, i, 'detail'),
  );

  // Variante completamente agotada: sin tallas asignadas con stock > 0,
  // o columna stock = 0 cuando no hay tallas configuradas.
  const isVarianteAgotada =
    tallasDisponibles.length === 0
      ? Number(varianteActiva.stock ?? 0) <= 0
      : tallasDisponibles.every((t: any) => t.stock <= 0);
  const canonicalProductUrl = `${getSiteUrl()}/productos/${slugify(varianteActiva.nombre)}-${varianteActiva.id}`;
  const baseUrl = getSiteUrl();
  /** Descripción larga para schema Product (Google recomienda texto completo; meta del servidor sigue ~160). */
  const descPlain = toMetaDescription(
    varianteActiva.descripcion,
    `Compra ${varianteActiva.nombre} en Soft Lingerie. Lencería en Valledupar con envíos a Colombia.`,
    5000,
  );

  /**
   * JSON-LD en el cliente pero renderizado en SSR: BreadcrumbList + Product.
   * - Migas: ayudan a entender jerarquía Inicio → Catálogo → Producto.
   * - Product + Offer: precio, moneda COP, disponibilidad acorde a tallas/stock, SKU = id interno.
   * Debe coincidir con la URL canónica y con generateMetadata del servidor.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Inicio",
            "item": baseUrl,
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Catálogo",
            "item": `${baseUrl}/productos`,
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": varianteActiva.nombre,
            "item": canonicalProductUrl,
          },
        ],
      },
      {
        "@type": "Product",
        "name": varianteActiva.nombre,
        "sku": String(varianteActiva.id),
        "image": imagenes.map((src) => toAbsolutePublicUrl(src)),
        "description": descPlain,
        "brand": {
          "@type": "Brand",
          "name": "Soft Lingerie",
        },
        "offers": {
          "@type": "Offer",
          "url": canonicalProductUrl,
          "priceCurrency": "COP",
          "price": String(varianteActiva.precio),
          "availability": isVarianteAgotada
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
          "itemCondition": "https://schema.org/NewCondition",
        },
      },
    ],
  };

  const categoriaNombre = varianteActiva.categoria?.nombre || varianteActiva.categoria || "Colección";
  const agotadoParaAgregar = isVarianteAgotada || restanteParaAgregar <= 0;

  return (
    <main className="mx-auto max-w-[96rem] px-4 pb-20 pt-6 font-display text-ink sm:px-6 md:pt-10 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Volver + migas */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 md:mb-10">
        <button
          onClick={handleBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-ink/10 transition-colors hover:bg-ink hover:text-white"
        >
          <ArrowLeft size={16} /> Volver al catálogo
        </button>
        <nav aria-label="Migas de pan" className="hidden text-sm text-ink/55 sm:block">
          <Link href="/" className="hover:text-ink">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/productos" className="hover:text-ink">Catálogo</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{varianteActiva.nombre}</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-12 md:gap-10 lg:gap-14">
        {/* COLUMNA IZQUIERDA: GALERÍA */}
        {/* Ancho limitado por el alto de la pantalla: la foto (4:5) nunca supera la ventana */}
        <div className="mx-auto flex w-full max-w-[min(34rem,calc((100svh-15rem)*0.8))] flex-col gap-4 md:col-span-6 md:mr-0">
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-blush shadow-xl shadow-ink/10 md:rounded-[2rem]">
              {imagenes.map((img: string, index: number) => {
                const imgKey = `${varianteActiva.id}-${index}`;
                return (
                  <Image
                    key={imgKey}
                    src={imgErrors[imgKey] ? PLACEHOLDER_IMAGE : img}
                    fill
                    sizes="(max-width: 768px) 100vw, 544px"
                    priority={index === 0}
                    className={`object-cover transition-opacity duration-700 ease-in-out ${index === currentImg ? 'opacity-100' : 'opacity-0'} ${isVarianteAgotada ? 'grayscale-[0.5]' : ''}`}
                    alt={varianteActiva.nombre}
                    onError={() => setImgErrors(prev => ({ ...prev, [imgKey]: true }))}
                  />
                );
              })}

              {/* Overlay agotado sobre la galería */}
              {isVarianteAgotada && (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-cream/40">
                  <div className="rounded-full bg-ink px-7 py-3 text-white shadow-2xl shadow-ink/30">
                    <span className="text-sm font-semibold">Agotado</span>
                  </div>
                </div>
              )}

              {imagenes.length > 1 && (
                <>
                  <div className="absolute inset-x-3 top-1/2 z-10 flex -translate-y-1/2 justify-between">
                    <button
                      aria-label="Foto anterior"
                      onClick={() => setCurrentImg((prev) => (prev - 1 + imagenes.length) % imagenes.length)}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink shadow-lg transition-transform active:scale-90"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      aria-label="Foto siguiente"
                      onClick={() => setCurrentImg((prev) => (prev + 1) % imagenes.length)}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink shadow-lg transition-transform active:scale-90"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center gap-1.5">
                    {imagenes.map((_: string, i: number) => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === currentImg ? 'w-8 bg-white' : 'w-3 bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {imagenes.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto px-1 py-1 scrollbar-hide">
              {imagenes.map((img: string, i: number) => {
                const thumbKey = `${varianteActiva.id}-${i}`;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentImg(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className={`relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-2xl transition-all duration-300 ${i === currentImg ? 'ring-2 ring-ink ring-offset-2 ring-offset-cream' : 'opacity-50 hover:opacity-100'}`}
                  >
                    <Image
                      src={imgErrors[thumbKey] ? PLACEHOLDER_IMAGE : img}
                      fill
                      sizes="80px"
                      className="object-cover"
                      alt={`${varianteActiva.nombre} — vista ${i + 1}`}
                      onError={() => setImgErrors(prev => ({ ...prev, [thumbKey]: true }))}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: INFORMACIÓN Y COMPRA */}
        <div className="flex w-full max-w-xl flex-col gap-7 md:sticky md:top-28 md:col-span-6">
          {/* Un solo <h1> por URL (mejor para SEO que duplicar título en móvil/desktop). */}
          <div>
            <span className="inline-block rounded-full bg-brand-accent px-3 py-1 text-sm font-semibold text-ink">
              {categoriaNombre}
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[0.95] tracking-[-0.04em] text-ink md:text-5xl lg:text-6xl">
              {varianteActiva.nombre}
            </h1>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">
                ${Number(varianteActiva.precio).toLocaleString('es-CO')}
              </span>
              <span className="text-sm font-medium text-ink/50">COP</span>
            </p>
          </div>

          {/* Selector de colores (también si solo hay una variante con color asignado) */}
          {(variantes.length > 1 ||
            Boolean(varianteActiva?.producto_colores?.[0]?.colores)) && (
            <div>
              <h3 className="mb-3 text-base font-semibold">
                {variantes.length > 1 ? 'Colores disponibles' : 'Color'}
                <span className="ml-2 font-normal text-ink/55">{varianteActiva?.producto_colores?.[0]?.colores?.nombre}</span>
              </h3>
              <div className="flex w-full max-w-full flex-wrap gap-3 p-1">
                {variantes.map((v) => {
                  let color = v.producto_colores?.[0]?.colores;
                  const isSelected = varianteActiva.id === v.id;
                  let colorHex = color?.hex || '#ccc';
                  const nombreBajo = color?.nombre?.toLowerCase() || "";
                  if (nombreBajo.includes('vino tinto')) colorHex = '#6B1324';
                  if (nombreBajo === 'amarillo') colorHex = '#FDE047';
                  if (nombreBajo === 'azul celeste') colorHex = '#BAE6FD';
                  if (nombreBajo === 'lila') colorHex = '#D8B4FE';
                  if (nombreBajo === 'amarillo pastel') colorHex = '#FEF9C3';

                  // Variante sin stock en ninguna de sus tallas
                  const vTallas = tallasPorVarianteIniciales[String(v.id)] || [];
                  const vAgotada =
                    vTallas.length === 0
                      ? Number(v.stock ?? 0) <= 0
                      : vTallas.every((t: any) => t.stock <= 0);

                  return (
                    <div key={v.id} className="relative">
                      <button
                        onClick={() => handleVarianteChange(v)}
                        aria-label={`${color?.nombre ?? 'Color'}${vAgotada ? ' (agotado)' : ''}`}
                        className={`relative h-10 w-10 rounded-full border transition-transform duration-300 ${isSelected ? 'scale-110 border-ink/20 ring-2 ring-brand-primary ring-offset-2 ring-offset-cream' : 'border-ink/10 hover:scale-110'} ${vAgotada ? 'opacity-40' : ''}`}
                        style={{ backgroundColor: colorHex }}
                        title={`${color?.nombre ?? ''}${vAgotada ? ' (Agotado)' : ''}`}
                      />
                      {vAgotada && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-[1.5px] w-[130%] -rotate-45 rounded-full bg-ink/40" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tallas */}
          <div className="flex w-full flex-col items-start">
            <div className="mb-3 flex w-full items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Ruler size={16} className="text-brand-dark" aria-hidden /> Selecciona tu talla
              </h3>
              <button onClick={() => setIsSizeGuideOpen(true)} className="text-sm font-semibold text-brand-dark underline decoration-brand-primary decoration-2 underline-offset-4 transition-colors hover:text-ink">
                Guía de tallas
              </button>
            </div>

            {tallasDisponibles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tallasDisponibles.map((t) => {
                  const agotado = t.stock <= 0;
                  return (
                    <button
                      key={t.id}
                      disabled={agotado}
                      onClick={() => { setTallaSeleccionada(t); setCantidad(1); }}
                      className={`min-w-[56px] rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                        tallaSeleccionada?.id === t.id
                          ? 'border-ink bg-ink text-white'
                          : agotado
                            ? 'cursor-not-allowed border-transparent bg-blush/60 text-ink/30 line-through'
                            : 'border-ink/15 bg-white text-ink hover:border-ink/40'
                      }`}
                    >
                      {t.nombre}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm font-semibold text-brand-dark">No disponible</p>
            )}
          </div>

          {/* Cantidad + añadir */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className={`flex w-fit items-center overflow-hidden rounded-full border border-ink/15 bg-white transition-opacity duration-300 ${!tallaSeleccionada || restanteParaAgregar <= 0 ? 'pointer-events-none opacity-30' : 'opacity-100'}`}>
              <button aria-label="Quitar una" onClick={() => setCantidad(prev => Math.max(1, prev - 1))} className="grid h-14 w-12 place-items-center text-ink transition-colors hover:bg-brand-accent/50"><Minus size={16} /></button>
              <span className="w-10 text-center text-base font-semibold tabular-nums">{cantidad}</span>
              <button aria-label="Agregar una" onClick={() => setCantidad(prev => Math.min(restanteParaAgregar || 1, prev + 1))} className="grid h-14 w-12 place-items-center text-ink transition-colors hover:bg-brand-accent/50"><Plus size={16} /></button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!tallaSeleccionada || restanteParaAgregar <= 0}
              className={`flex min-h-14 flex-1 items-center justify-center gap-3 rounded-full px-6 text-base font-bold transition-colors active:scale-[0.98] disabled:pointer-events-none ${
                agotadoParaAgregar
                  ? 'bg-blush text-ink/40'
                  : 'bg-ink text-white shadow-xl shadow-ink/25 hover:bg-brand-dark disabled:opacity-30'
              }`}
            >
              <ShoppingCart size={19} />
              {agotadoParaAgregar ? 'Agotado' : 'Añadir al carrito'}
            </button>
          </div>

          {/* Confianza */}
          <ul className="grid grid-cols-1 gap-2 rounded-[1.5rem] bg-white p-4 text-sm font-medium text-ink/75 ring-1 ring-ink/5 sm:grid-cols-3">
            <li className="flex items-center gap-2"><ShieldCheck size={18} className="shrink-0 text-brand-dark" aria-hidden /> Compra segura</li>
            <li className="flex items-center gap-2"><Truck size={18} className="shrink-0 text-brand-dark" aria-hidden /> Envíos nacionales</li>
            <li className="flex items-center gap-2"><Check size={18} className="shrink-0 text-brand-dark" aria-hidden /> Empaque discreto</li>
          </ul>

          {/* Descripción del producto */}
          <div>
            <h3 className="mb-2 text-base font-semibold">Descripción</h3>
            <p className="text-base leading-relaxed text-ink/75">
              {varianteActiva.descripcion || "Diseño exclusivo de Soft Lingerie. Confeccionado con materiales premium para garantizar suavidad, comodidad y elegancia en todo momento."}
            </p>
          </div>

          {/* Acordeones */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-ink/5">
            <button onClick={() => toggleAcordeon('cuidado')} aria-expanded={acordeonAbierto === 'cuidado'} className="flex w-full items-center justify-between p-5 text-base font-semibold transition-colors hover:bg-brand-accent/30">
              <span className="flex items-center gap-3"><Heart size={18} className="text-brand-dark" aria-hidden /> Cuidado de la prenda</span>
              <ChevronDown size={18} className={`transition-transform duration-300 ${acordeonAbierto === 'cuidado' ? 'rotate-180' : ''}`} />
            </button>
            {acordeonAbierto === 'cuidado' && <div className="px-5 pb-5 text-left text-[15px] leading-relaxed text-ink/70">Recomendamos lavar a mano con jabón suave y agua fría...</div>}
          </div>
        </div>
      </div>

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <section className="mx-auto mt-24 w-full md:mt-32">
          <div className="relative mb-10 flex items-end justify-between gap-6">
            <span
              aria-hidden
              className="text-wordmark-blush pointer-events-none absolute -top-14 left-[-0.04em] w-max select-none whitespace-nowrap pr-[0.14em] text-[clamp(5rem,13vw,11rem)] font-extrabold leading-[0.8] tracking-[-0.06em] md:-top-24"
            >
              Más
            </span>
            <div className="relative">
              <p className="text-sm font-semibold text-brand-dark">Para completar tu look</p>
              <h2 className="mt-2 text-4xl font-bold leading-[0.95] tracking-[-0.04em] md:text-5xl">También te puede gustar</h2>
            </div>
          </div>
          <div className="relative">
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto pb-6 scrollbar-hide md:gap-6"
          >
            {relacionados.map((prod) => (
              <div key={prod.id} className="w-[200px] min-w-[200px] shrink-0 snap-start md:w-[280px] md:min-w-[280px]">
                <ProductoCard
                  producto={prod}
                  returnCatalogQuery={catalogReturnQuery ?? undefined}
                  hideAvailabilityQuantity
                />
              </div>
            ))}
          </div>
          <FlechasCarrusel scrollRef={scrollRef} />
          </div>
        </section>
      )}
      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </main>
  );
}

"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { slugify } from "./lib/utils";
import { getProductoImage, withSupabaseListThumbnailParams, PLACEHOLDER_IMAGE } from "./lib/image-helper";

type HomeClientProps = {
  productosIniciales: any[];
  ventasIniciales: any[];
};

export default function HomeClient({ productosIniciales, ventasIniciales }: HomeClientProps) {
  // Datos llegan del servidor (ISR) para mejorar LCP/SEO y reducir trabajo en cliente.
  const [productos] = useState<any[]>(productosIniciales);
  const [ventas] = useState<any[]>(ventasIniciales);

  const scrollNovedades = useRef<HTMLDivElement>(null);
  const scrollFavoritos = useRef<HTMLDivElement>(null);

  const novedades = useMemo(() => {
    return [...productos]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [productos]);

  const masVendidos = useMemo(() => {
    const conteo: { [key: string]: number } = {};

    ventas.forEach((v) => {
      if (v && Array.isArray(v.detalle_compra)) {
        v.detalle_compra.forEach((item: any) => {
          const id = item.id;
          if (id) {
            conteo[id] = (conteo[id] || 0) + (Number(item.quantity) || 1);
          }
        });
      }
    });

    const conVentas = [...productos]
      .filter((p) => conteo[p.id] && conteo[p.id] > 0)
      .sort((a, b) => conteo[b.id] - conteo[a.id]);

    if (conVentas.length === 0) {
      return [...productos]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8);
    }

    return conVentas.slice(0, 8);
  }, [productos, ventas]);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      ref.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-[#fdf8f6] min-h-screen w-full overflow-x-hidden">
      <section className="relative h-[80vh] w-full bg-[#4a1d44] overflow-hidden flex items-center justify-center text-center px-4">
        <div className="absolute inset-0 opacity-40">
          <img
            src="/home.jpg"
            className="w-full h-full object-cover"
            alt="Soft Lingerie Valledupar - Lencería Exclusiva"
          />
        </div>
        <div className="relative z-10 max-w-4xl">
          <span className="text-white/80 text-[12px] md:text-base font-black uppercase tracking-[0.4em] mb-4 block">
            Boutique Exclusiva
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1] font-playfair italic">
            Lencería <br className="hidden md:block" /> <span className="text-white">en Valledupar</span>
          </h1>
          <p className="text-violet-100 text-sm md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            Elegancia y diseños exclusivos que resaltan tu belleza natural. Envíos seguros a todo Colombia.
          </p>
          <Link
            href="/productos"
            className="bg-white text-[#4a1d44] px-10 py-5 rounded-full font-bold text-xs md:text-sm hover:bg-[#f2e1d9] transition-all shadow-2xl inline-flex items-center gap-3 uppercase tracking-widest active:scale-95"
          >
            Explorar Catálogo <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto py-20 px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-[#4a1d44]" size={16} />
              <span className="text-[12px] font-black uppercase tracking-widest text-[#4a1d44]/60">
                Recién Llegado
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#4a1d44] font-playfair italic tracking-tighter">
              Novedades
            </h2>
          </div>

          <div className="hidden md:flex gap-2">
            <button
              onClick={() => scroll(scrollNovedades, "left")}
              className="p-3 bg-white rounded-full border border-[#4a1d44]/5 hover:bg-[#4a1d44] hover:text-white transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => scroll(scrollNovedades, "right")}
              className="p-3 bg-white rounded-full border border-[#4a1d44]/5 hover:bg-[#4a1d44] hover:text-white transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          ref={scrollNovedades}
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {novedades.length > 0 ? (
            novedades.map((prod) => <ProductCard key={prod.id} prod={prod} etiqueta="NUEVO" />)
          ) : (
            <div className="w-full text-center py-20 opacity-30 italic font-medium">
              Próximamente nuevas prendas...
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-24 px-4 border-y border-[#4a1d44]/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="flex items-center gap-2 mb-4">
              <Star className="text-amber-500 fill-amber-500" size={16} />
              <span className="font-black tracking-[0.3em] text-[#4a1d44]/60 text-[12px] uppercase">
                Best Sellers
              </span>
              <Star className="text-amber-500 fill-amber-500" size={16} />
            </div>
            <h2 className="text-4xl md:text-6xl font-bold font-playfair text-[#4a1d44] italic tracking-tighter">
              Favoritos
            </h2>
            <p className="text-[#4a1d44]/60 text-xs md:text-lg max-w-xl mt-4 font-medium uppercase tracking-widest">
              Las prendas más deseadas por nuestras clientas.
            </p>
          </div>

          <div className="relative">
            <div
              ref={scrollFavoritos}
              className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-5"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {masVendidos.length > 0 ? (
                masVendidos.map((prod) => (
                  <ProductCard key={prod.id} prod={prod} etiqueta="TENDENCIA" />
                ))
              ) : (
                <div className="w-full text-center py-20 opacity-30 italic font-medium">
                  Descubre nuestra colección...
                </div>
              )}
            </div>

            {masVendidos.length > 0 && (
              <div className="hidden md:flex justify-center gap-4 mt-10">
                <button
                  onClick={() => scroll(scrollFavoritos, "left")}
                  className="p-4 bg-[#fdf8f6] rounded-full text-[#4a1d44] border border-[#4a1d44]/10 hover:bg-[#4a1d44] hover:text-white transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => scroll(scrollFavoritos, "right")}
                  className="p-4 bg-[#fdf8f6] rounded-full text-[#4a1d44] border border-[#4a1d44]/10 hover:bg-[#4a1d44] hover:text-white transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="py-12 bg-[#fdf8f6] text-center">
        <p className="text-[14px] font-black uppercase tracking-[0.5em] text-[#4a1d44]/60">
          Soft Lingerie © 2026
        </p>
      </footer>
    </div>
  );
}

function ProductCard({ prod, etiqueta }: { prod: any; etiqueta: string }) {
  const fotoUrl = withSupabaseListThumbnailParams(getProductoImage(prod, 0, "thumb"));
  const [imgSrc, setImgSrc] = useState(fotoUrl);
  const slug = slugify(prod.nombre);

  useEffect(() => {
    setImgSrc(withSupabaseListThumbnailParams(getProductoImage(prod, 0, "thumb")));
  }, [prod.id]);

  return (
    <Link
      href={`/productos/${slug}-${prod.id}`}
      className="w-[45vw] md:w-[280px] flex-shrink-0 snap-start group flex flex-col"
    >
      <div className="relative aspect-[3/4] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden mb-4 shadow-sm bg-white border border-[#4a1d44]/5">
        <Image
          src={imgSrc}
          alt={prod.nombre}
          fill
          sizes="(max-width: 768px) 45vw, 280px"
          className="object-cover group-hover:scale-110 transition duration-700 ease-in-out"
          onError={() => setImgSrc(PLACEHOLDER_IMAGE)}
        />

        {prod.categoria && (
          <span className="absolute top-3 left-3 md:top-4 md:left-4 bg-white/90 backdrop-blur-md text-[#4a1d44] text-[7px] md:text-[9px] font-black uppercase tracking-widest px-2 py-1 md:px-3 md:py-1.5 rounded-full shadow-sm z-10">
            {typeof prod.categoria === "object" ? prod.categoria.nombre : prod.categoria}
          </span>
        )}

        <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 bg-[#4a1d44] px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[7px] md:text-[8px] font-black text-white z-10 tracking-widest">
          {etiqueta}
        </div>
      </div>

      <div className="px-1 md:px-2">
        <h3 className="font-bold text-[11px] md:text-base text-[#4a1d44] truncate uppercase tracking-tight">
          {prod.nombre}
        </h3>
        <p className="text-[#4a1d44]/50 text-[10px] md:text-sm font-black mt-0.5">
          ${Number(prod.precio).toLocaleString("es-CO")}
        </p>
      </div>
    </Link>
  );
}

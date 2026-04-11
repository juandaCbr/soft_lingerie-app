"use client";

import { RefObject } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeProducto } from "@/app/lib/home-types";
import { HomeProductCard } from "./HomeProductCard";

type HomeFavoritosSectionProps = {
  masVendidos: HomeProducto[];
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: (direction: "left" | "right") => void;
};

export function HomeFavoritosSection({ masVendidos, scrollRef, onScroll }: HomeFavoritosSectionProps) {
  return (
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
            ref={scrollRef}
            className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {masVendidos.length > 0 ? (
              masVendidos.map((prod) => (
                <HomeProductCard key={prod.id} prod={prod} etiqueta="TENDENCIA" />
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
                type="button"
                onClick={() => onScroll("left")}
                className="p-4 bg-[#fdf8f6] rounded-full text-[#4a1d44] border border-[#4a1d44]/10 hover:bg-[#4a1d44] hover:text-white transition-all"
                aria-label="Desplazar favoritos a la izquierda"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={() => onScroll("right")}
                className="p-4 bg-[#fdf8f6] rounded-full text-[#4a1d44] border border-[#4a1d44]/10 hover:bg-[#4a1d44] hover:text-white transition-all"
                aria-label="Desplazar favoritos a la derecha"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

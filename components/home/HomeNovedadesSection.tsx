"use client";

import { RefObject } from "react";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeProducto } from "@/app/lib/home-types";
import { HomeProductCard } from "./HomeProductCard";

type HomeNovedadesSectionProps = {
  novedades: HomeProducto[];
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: (direction: "left" | "right") => void;
};

export function HomeNovedadesSection({ novedades, scrollRef, onScroll }: HomeNovedadesSectionProps) {
  return (
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
            type="button"
            onClick={() => onScroll("left")}
            className="p-3 bg-white rounded-full border border-[#4a1d44]/5 hover:bg-[#4a1d44] hover:text-white transition-all"
            aria-label="Desplazar novedades a la izquierda"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => onScroll("right")}
            className="p-3 bg-white rounded-full border border-[#4a1d44]/5 hover:bg-[#4a1d44] hover:text-white transition-all"
            aria-label="Desplazar novedades a la derecha"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {novedades.length > 0 ? (
          novedades.map((prod) => <HomeProductCard key={prod.id} prod={prod} etiqueta="NUEVO" />)
        ) : (
          <div className="w-full text-center py-20 opacity-30 italic font-medium">
            Próximamente nuevas prendas...
          </div>
        )}
      </div>
    </section>
  );
}

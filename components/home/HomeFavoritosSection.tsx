"use client";

import { Star } from "lucide-react";
import type { HomeProducto } from "@/app/lib/home-types";
import { HomeProductCard } from "./HomeProductCard";

type HomeFavoritosSectionProps = {
  favoritos: Array<{
    prod: HomeProducto;
    etiqueta: string;
  }>;
};

export function HomeFavoritosSection({ favoritos }: HomeFavoritosSectionProps) {
  return (
    <section className="bg-white py-16 sm:py-20 md:py-24 px-3 sm:px-4 border-y border-[#4a1d44]/5">
      <div className="max-w-7xl mx-auto w-full min-w-0">
        <div className="flex flex-col items-center text-center mb-16">
          <div className="flex items-center gap-2 mb-4">
            <Star className="text-amber-500 fill-amber-500" size={16} />
            <span className="font-black tracking-[0.3em] text-[#4a1d44]/60 text-[12px] uppercase">
              Best Sellers
            </span>
            <Star className="text-amber-500 fill-amber-500" size={16} />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold font-playfair text-[#4a1d44] italic tracking-tighter px-1">
            Favoritos
          </h2>
          <p className="text-[#4a1d44]/60 text-[10px] sm:text-xs md:text-lg max-w-xl mt-3 sm:mt-4 font-medium uppercase tracking-widest px-2">
            Las prendas más deseadas por nuestras clientas.
          </p>
        </div>

        {favoritos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-2 gap-y-6 sm:gap-x-4 sm:gap-y-8 md:gap-x-6 md:gap-y-10 lg:gap-x-6 lg:gap-y-12">
            {favoritos.map(({ prod, etiqueta }) => (
              <HomeProductCard key={prod.id} prod={prod} etiqueta={etiqueta} layout="grid" />
            ))}
          </div>
        ) : (
          <div className="w-full text-center py-20 opacity-30 italic font-medium">
            Descubre nuestra colección...
          </div>
        )}
      </div>
    </section>
  );
}

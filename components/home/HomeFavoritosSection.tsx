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

        {favoritos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12">
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

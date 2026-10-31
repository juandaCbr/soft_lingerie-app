"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HomeProducto } from "@/app/lib/home-types";
import { HomeProductCard } from "./HomeProductCard";
import { HomeSectionHeader } from "./HomeSectionHeader";

type HomeFavoritosSectionProps = {
  favoritos: Array<{
    prod: HomeProducto;
    etiqueta: string;
  }>;
};

/** Prendas pequeñas junto a la destacada: con la tarjeta del catálogo completan un bloque de 2×2 */
const MAX_RESTO = 3;

/** El más vendido en grande + bloque de 2×2 a su lado (tres prendas y la tarjeta hacia el catálogo). */
export function HomeFavoritosSection({ favoritos }: HomeFavoritosSectionProps) {
  const [destacado, ...otros] = favoritos;
  const resto = otros.slice(0, MAX_RESTO);

  return (
    <section id="favoritos" className="scroll-mt-24 bg-cream px-4 py-24 sm:px-6 md:py-32 lg:px-8">
      <div className="mx-auto w-full min-w-0 max-w-7xl">
        <HomeSectionHeader
          watermark="Deseo"
          eyebrow="Más vendidos"
          title="Favoritos"
          description="Las prendas más deseadas por nuestras clientas."
        />

        {destacado ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4 lg:gap-y-12">
            <HomeProductCard prod={destacado.prod} etiqueta={destacado.etiqueta} variant="feature" />
            {resto.map(({ prod, etiqueta }) => (
              <HomeProductCard key={prod.id} prod={prod} etiqueta={etiqueta} variant="grid" />
            ))}
            <Link
              href="/productos"
              data-reveal-card
              className="group flex aspect-[3/4] flex-col justify-between rounded-[1.5rem] bg-ink p-5 text-white transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink md:p-6"
            >
              <span className="text-sm font-semibold text-white/60">Catálogo</span>
              <span>
                <span className="block font-display text-2xl font-bold leading-[0.95] tracking-[-0.03em] md:text-3xl xl:text-4xl">
                  Descubre toda
                </span>
                <span className="block font-display text-2xl font-bold leading-[0.95] tracking-[-0.03em] text-brand-accent md:text-4xl">la colección</span>
                <span className="mt-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink transition-transform duration-500 group-hover:translate-x-2">
                  <ArrowRight size={18} aria-hidden />
                </span>
              </span>
            </Link>
          </div>
        ) : (
          <p className="w-full py-20 text-center font-display text-lg font-medium text-ink/40">Descubre nuestra colección...</p>
        )}
      </div>
    </section>
  );
}

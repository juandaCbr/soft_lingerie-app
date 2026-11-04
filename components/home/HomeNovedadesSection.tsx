"use client";

import { RefObject } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { HomeProducto } from "@/app/lib/home-types";
import { HomeProductCard } from "./HomeProductCard";
import { HomeOrnament } from "./HomeOrnament";

type HomeNovedadesSectionProps = {
  novedades: HomeProducto[];
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: (direction: "left" | "right") => void;
};

const arrowClass =
  "grid h-12 w-12 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * Panel vino: título con contador a la izquierda y prendas en arco a la derecha.
 * En escritorio (con movimiento) el panel se fija y las prendas avanzan en horizontal con el
 * scroll; si no, es un carrusel nativo con flechas. Se fija un div interno (no la <section>)
 * para que React siga siendo dueño de los nodos que monta.
 */
export function HomeNovedadesSection({ novedades, scrollRef, onScroll }: HomeNovedadesSectionProps) {
  const total = String(novedades.length).padStart(2, "0");

  return (
    <section id="novedades" className="scroll-mt-24 bg-cream">
      <div data-hscroll className="px-2 py-6 sm:px-4 lg:flex lg:h-svh lg:items-center">
        <div className="grain relative mx-auto w-full overflow-hidden rounded-[2rem] bg-ink py-14 text-white md:rounded-[3rem] md:py-16 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-14">

          {/* Palabra de marca gigante y desvanecida (eco de SOFT en el hero), con parallax */}
          <span
            aria-hidden
            data-speed="-25"
            className="text-wordmark pointer-events-none absolute -bottom-8 left-4 w-max select-none whitespace-nowrap pr-[0.14em] font-display text-[10rem] font-extrabold leading-[0.8] tracking-[-0.06em] opacity-15 md:text-[17rem]"
          >
            Nuevo
          </span>

          {/* Columna de texto */}
          <div className="relative z-[3] px-6 sm:px-10 lg:col-span-4 lg:pl-14 lg:pr-0">
            <HomeOrnament className="text-brand-accent" />
            <p data-reveal className="mt-5 text-sm font-semibold text-brand-accent">
              Recién llegado
            </p>
            <h2 data-reveal-lines className="mt-3 font-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-6xl lg:text-[clamp(2.75rem,4.4vw,4.25rem)]">
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-line className="block">
                  Novedades
                </span>
              </span>
            </h2>
            <p data-reveal className="mt-4 max-w-xs text-base font-medium leading-relaxed text-white/70">
              Las últimas prendas que llegaron a la boutique.
            </p>

            {/* Contador + progreso (escritorio, con el scroll horizontal) */}
            <div aria-hidden className="mt-10 hidden items-center gap-4 group-data-[hscroll=on]/home:lg:flex">
              <span className="font-display text-4xl font-semibold tabular-nums">
                <span data-hscroll-count>01</span>
                <span className="text-white/35"> / {total}</span>
              </span>
              <span className="h-px flex-1 bg-white/20">
                <span data-hscroll-progress className="block h-full origin-left scale-x-0 bg-brand-accent" />
              </span>
            </div>

            <div data-reveal className="mt-8 flex items-center gap-3">
              <Link
                href="/productos"
                className="group inline-flex min-h-[50px] items-center gap-2 rounded-full bg-brand-accent px-7 text-sm font-bold text-ink transition hover:bg-white"
              >
                Ver todo
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                type="button"
                onClick={() => onScroll("left")}
                className={`hidden md:grid group-data-[hscroll=on]/home:md:hidden ${arrowClass}`}
                aria-label="Desplazar novedades a la izquierda"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => onScroll("right")}
                className={`hidden md:grid group-data-[hscroll=on]/home:md:hidden ${arrowClass}`}
                aria-label="Desplazar novedades a la derecha"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Pista de prendas */}
          <div className="relative z-[3] mt-12 lg:col-span-8 lg:mt-0">
            <div
              ref={scrollRef}
              data-hscroll-viewport
              className="snap-x snap-mandatory scroll-px-6 overflow-x-auto px-6 pb-2 scrollbar-hide sm:scroll-px-10 sm:px-10 lg:px-0 group-data-[hscroll=on]/home:snap-none group-data-[hscroll=on]/home:overflow-hidden"
            >
              <div data-hscroll-track className="flex w-max gap-5 md:gap-7 lg:pr-14">
                {novedades.length > 0 ? (
                  novedades.map((prod) => <HomeProductCard key={prod.id} prod={prod} etiqueta="Nuevo" variant="arch" />)
                ) : (
                  <p className="py-20 font-display text-lg font-medium text-white/60">Próximamente nuevas prendas...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

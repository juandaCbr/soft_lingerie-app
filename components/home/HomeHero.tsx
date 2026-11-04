import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { HomeCloud, HomeCloudBank } from "./HomeCloud";
import { HomeOrnament } from "./HomeOrnament";

const WORD = "SOFT";

/**
 * Hero en escenario: un cielo rosa con la marca al centro (SOFT gigante y LINGERIE debajo)
 * entre bancos de nubes. Entrada en CSS (corre desde el primer pintado); parallax con el
 * mouse y con el scroll los añade useHomeMotion sobre los data-attributes.
 */
export function HomeHero() {
  return (
    <section data-hero className="bg-cream px-2 pb-2 sm:px-3 sm:pb-3">
      <div
        data-hero-stage
        className="relative isolate h-[calc(100svh-4.5rem)] min-h-[34rem] overflow-hidden rounded-[1.75rem] bg-cielo md:h-[calc(100svh-5.75rem)] md:rounded-[2.75rem]"
      >
        {/* Cielo: nubes lejanas que se mueven poco */}
        <div data-hero-layer="sky" className="absolute inset-0 -z-10">
          <div data-depth="0.45" className="absolute inset-0">
            <HomeCloud fade sizes="20vw" className="left-[-6%] top-[5%] aspect-[2/1] w-[30%] opacity-60 md:w-[13%]" />
            <HomeCloud fade flip sizes="16vw" className="right-[-4%] top-[3%] aspect-[2/1] w-[26%] opacity-50 md:w-[11%]" />
          </div>
        </div>

        {/* Marca: SOFT gigante y LINGERIE debajo, centrados sobre las nubes */}
        <div data-hero-layer="word" className="absolute inset-0 z-[2] flex flex-col items-center justify-center pb-[18%] will-change-transform md:pb-[10%]">
          <div data-depth="-0.2">
            <h1 className="flex flex-col items-center font-display">
              <span className="sr-only">Soft Lingerie, lencería en Valledupar</span>
              <span aria-hidden className="flex overflow-hidden px-[0.1em] pb-[0.06em] pt-[0.14em] text-[clamp(6rem,min(33vw,40svh),34rem)] font-extrabold leading-[0.8] tracking-[-0.06em]">
                {WORD.split("").map((letter, i) => (
                  <span
                    key={letter}
                    // El degradado del texto solo pinta dentro de la caja de cada letra: el padding (con margen
                    // negativo para no mover nada) agranda la caja para que la letra no se corte
                    className="text-wordmark -mx-[0.08em] -mt-[0.14em] inline-block px-[0.08em] pt-[0.14em] motion-safe:animate-letter-rise"
                    style={{ animationDelay: `${120 + i * 70}ms` }}
                  >
                    {letter}
                  </span>
                ))}
              </span>
              {/* pl igual al tracking: compensa el espacio que queda tras la última letra y la centra */}
              <span
                aria-hidden
                className="mt-[clamp(0.5rem,1.2vw,1.25rem)] pl-[0.42em] font-accent text-[clamp(1.4rem,min(5vw,6.5svh),5rem)] font-semibold uppercase leading-none tracking-[0.42em] text-ink motion-safe:animate-fade-up"
                style={{ animationDelay: "450ms" }}
              >
                Lingerie
              </span>
              <HomeOrnament className="mt-[clamp(1rem,2vw,2rem)] text-ink motion-safe:animate-fade-up" />
            </h1>
          </div>

          {/* Acción principal, centrada bajo el logo para que se vea de inmediato (pedido de la clienta) */}
          <Link
            href="/productos"
            className="group mt-[clamp(1.5rem,4svh,2.75rem)] inline-flex min-h-16 items-center gap-3 rounded-full bg-ink px-9 text-base font-bold text-white shadow-2xl shadow-ink/35 ring-4 ring-white/60 transition-colors duration-300 hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink active:scale-[0.98] motion-safe:animate-fade-up md:min-h-[4.5rem] md:px-12 md:text-lg"
            style={{ animationDelay: "650ms" }}
          >
            Explorar catálogo
            <ArrowRight size={20} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Banco de nubes trasero */}
        <div data-hero-layer="back" className="absolute inset-x-0 bottom-0 top-[80%] z-[1] will-change-transform md:top-[82%]">
          <div data-depth="0.55" className="h-full w-full">
            <HomeCloudBank preload centerLobe className="inset-0" imgClassName="opacity-90 [filter:brightness(0.93)_saturate(1.15)]" />
          </div>
        </div>

        {/* Banco de nubes delantero */}
        <div data-hero-layer="front" className="absolute inset-x-0 bottom-0 top-[80%] z-[3] will-change-transform md:top-[84%]">
          <div data-depth="1" className="h-full w-full">
            <HomeCloudBank preload className="inset-0 motion-safe:animate-cloud-in" />
          </div>
        </div>

        {/* Texto y acciones */}
        <div className="pointer-events-none absolute inset-0 z-[4] mx-auto flex max-w-[96rem] flex-col justify-end px-5 pb-6 pt-6 sm:px-8 md:px-[6%] md:pb-9 md:pt-9">
          <div className="flex flex-col items-center gap-4 md:grid md:grid-cols-3 md:items-end">
            <p
              // Visible también en celular: Google indexa sobre todo la versión móvil y aquí está "Lencería en Valledupar"
              className="max-w-[20rem] text-center text-sm font-semibold leading-relaxed text-ink/85 motion-safe:animate-fade-up md:max-w-[24rem] md:text-left md:text-base md:font-medium md:text-ink/80"
              style={{ animationDelay: "800ms" }}
            >
              Lencería en Valledupar: encaje, satín y tul en diseños exclusivos, con envíos a toda Colombia.
            </p>

            <a
              href="#novedades"
              aria-label="Ver novedades"
              className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-white text-ink shadow-xl shadow-ink/15 transition-transform duration-300 hover:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink motion-safe:animate-fade-up md:justify-self-center"
              style={{ animationDelay: "950ms" }}
            >
              <ArrowDown size={20} aria-hidden />
            </a>

          </div>
        </div>
      </div>
    </section>
  );
}

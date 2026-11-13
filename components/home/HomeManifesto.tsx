import Image from "next/image";
import { getProductoImage } from "@/app/lib/image-helper";
import type { HomeProducto } from "@/app/lib/home-types";
import { HomeOrnament } from "./HomeOrnament";

const TEXTO =
  "Creemos que la lencería es un gesto íntimo de amor propio. Piezas delicadas y cómodas, pensadas para que te sientas segura, elegante y completamente tú.";

/** Palabras resaltadas en el color de marca */
const ACENTOS = new Set(["amor", "propio.", "segura,", "elegante", "tú."]);

/** Declaración de marca: las palabras se iluminan al leer y dos prendas flotan con parallax. */
export function HomeManifesto({ productos }: { productos: HomeProducto[] }) {
  const [izq, der] = productos;

  return (
    <section className="grain relative overflow-hidden bg-cream px-4 py-28 sm:px-6 md:py-40 lg:px-8">
      {/* Prendas flotantes (decorativas; las mismas están enlazadas en Novedades) */}
      {izq && (
        <div data-speed="-35" aria-hidden className="absolute left-[3%] top-[12%] hidden w-[clamp(140px,13vw,210px)] -rotate-6 lg:block">
          <div className="relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-2xl shadow-2xl shadow-ink/20 ring-[6px] ring-white">
            <Image src={getProductoImage(izq, 0, "detail")} alt="" fill sizes="210px" className="object-cover" />
          </div>
        </div>
      )}
      {der && (
        <div data-speed="-70" aria-hidden className="absolute bottom-[8%] right-[4%] hidden w-[clamp(120px,11vw,180px)] rotate-6 lg:block">
          <div className="relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-2xl shadow-2xl shadow-ink/20 ring-[6px] ring-white">
            <Image src={getProductoImage(der, 0, "detail")} alt="" fill sizes="180px" className="object-cover" />
          </div>
        </div>
      )}

      <div className="relative z-[2] mx-auto max-w-4xl text-center">
        <p data-reveal className="flex flex-col items-center gap-5 text-sm font-semibold text-ink/60">
          <HomeOrnament className="text-ink" />
          Nuestra esencia
        </p>
        <p
          data-manifesto
          className="mt-10 font-display text-3xl font-medium leading-[1.2] tracking-[-0.02em] text-ink sm:text-4xl md:text-5xl lg:text-[3.6rem]"
        >
          {TEXTO.split(" ").map((word, i) => (
            <span
              key={i}
              data-word
              className={`inline-block whitespace-pre ${ACENTOS.has(word) ? "text-brand-dark underline decoration-brand-primary decoration-[0.08em] underline-offset-[0.12em]" : ""}`}
            >
              {word}{" "}
            </span>
          ))}
        </p>
        <p data-reveal className="mt-12 text-sm font-semibold text-ink/50">
          — Soft Lingerie, Valledupar
        </p>
      </div>
    </section>
  );
}

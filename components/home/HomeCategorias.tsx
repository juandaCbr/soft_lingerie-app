import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getProductoImage } from "@/app/lib/image-helper";
import type { HomeProducto } from "@/app/lib/home-types";
import { HomeSectionHeader } from "./HomeSectionHeader";

export type HomeCategoria = {
  nombre: string;
  cantidad: number;
  producto: HomeProducto;
};

/**
 * Accesos por categoría hacia el catálogo filtrado (/productos?cat=...): enlazado interno.
 * Escritorio: paneles en arco que se expanden al pasar el mouse. Móvil: carrusel deslizable.
 */
export function HomeCategorias({ categorias }: { categorias: HomeCategoria[] }) {
  if (categorias.length < 2) return null;

  return (
    <section className="grain overflow-hidden bg-brand-primary px-4 pb-20 pt-32 sm:px-6 md:pb-28 md:pt-40 lg:px-8">
      <div className="relative z-[2] mx-auto max-w-7xl">
        <HomeSectionHeader
          watermark="Estilo"
          tone="pink"
          eyebrow="Compra por categoría"
          title="Encuentra lo tuyo"
          description="Explora la colección por tipo de prenda."
          action={
            <Link
              href="/productos"
              className="group inline-flex min-h-[52px] items-center gap-2 rounded-full bg-ink px-7 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              Ver todo el catálogo
              <ArrowUpRight size={16} className="transition-transform group-hover:rotate-45" />
            </Link>
          }
        />

        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:-mx-6 sm:px-6 lg:mx-0 lg:h-[36rem] lg:overflow-visible lg:px-0">
          {categorias.map((cat) => (
            <li
              key={cat.nombre}
              data-reveal-card
              className="w-[68vw] shrink-0 snap-start sm:w-[40vw] lg:w-auto lg:min-w-0 lg:flex-1 lg:transition-[flex-grow] lg:duration-700 lg:ease-[cubic-bezier(0.16,1,0.3,1)] lg:hover:flex-[2.4]"
            >
              <Link
                href={`/productos?cat=${encodeURIComponent(cat.nombre)}`}
                className="group relative flex aspect-[3/4.3] h-full flex-col justify-end overflow-hidden rounded-t-[999px] rounded-b-[2rem] bg-ink p-2 text-white shadow-2xl shadow-ink/25 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink lg:aspect-auto"
              >
                <Image
                  src={getProductoImage(cat.producto, 0, "detail")}
                  alt={`${cat.nombre} - Soft Lingerie`}
                  fill
                  sizes="(max-width: 1024px) 68vw, 40vw"
                  className="object-cover opacity-85 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/15 to-transparent" />
                {/* Marco interior en arco */}
                <span aria-hidden className="absolute inset-2.5 rounded-t-[999px] rounded-b-[1.6rem] border border-white/35" />
                <span className="relative flex flex-col items-center p-5 text-center md:p-6">
                  <span className="block break-words font-display text-2xl font-bold leading-tight tracking-[-0.02em] md:text-3xl lg:text-2xl lg:group-hover:text-3xl">
                    {cat.nombre}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-white/75">
                    {cat.cantidad} {cat.cantidad === 1 ? "prenda" : "prendas"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

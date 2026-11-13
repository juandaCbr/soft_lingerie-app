import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CieloRosa } from "@/components/ui/CieloRosa";
import { LogoMarca } from "@/components/ui/LogoMarca";
import { getTallasDisponibles } from "@/app/lib/catalogo-tallas";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Catálogo por tallas",
  description: "Elige tu talla y mira solo las prendas disponibles en Soft Lingerie.",
  alternates: { canonical: "/tallas" },
};

/** Índice de tallas: un botón grande por talla con cuántas prendas hay disponibles. */
export default async function TallasPage() {
  const tallas = await getTallasDisponibles();

  return (
    <main className="px-2 pb-6 font-display text-ink sm:px-3">
      <CieloRosa variante="pagina" banco="top-[82%]" className="flex min-h-[calc(100svh-6rem)] flex-col items-center justify-center px-5 pb-36 pt-14 text-center">
        <LogoMarca className="mb-4" />
        <p className="text-sm font-semibold text-brand-dark">Soft Lingerie</p>
        <h1 className="mt-2 text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-7xl">Catálogo por tallas</h1>
        <p className="mx-auto mt-4 max-w-md text-base text-ink/70 md:text-lg">
          Toca tu talla y mira solo lo que tenemos disponible para ti.
        </p>

        {tallas.length > 0 ? (
          <ul className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
            {tallas.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tallas/${t.slug}`}
                  className="group flex h-full flex-col items-center justify-center gap-1 rounded-[1.75rem] bg-white px-4 py-6 shadow-xl shadow-ink/10 transition-[translate,background-color] duration-300 hover:-translate-y-1 hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                >
                  <span
                    className={`whitespace-nowrap font-extrabold tracking-[-0.05em] ${t.tallas.length > 1 ? "text-4xl md:text-5xl" : "text-5xl md:text-6xl"}`}
                  >
                    {t.nombre}
                  </span>
                  <span className="text-sm font-medium text-ink/60 group-hover:text-white/70">
                    {t.cantidad} {t.cantidad === 1 ? "prenda" : "prendas"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 rounded-[1.5rem] bg-white px-6 py-4 font-medium">Pronto tendremos prendas disponibles.</p>
        )}

        <Link
          href="/productos"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-white decoration-2 underline-offset-4"
        >
          Ver todo el catálogo <ArrowRight size={16} aria-hidden />
        </Link>
      </CieloRosa>
    </main>
  );
}

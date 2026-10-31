import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { CieloRosa } from "@/components/ui/CieloRosa";
import { TallaTitulo } from "@/components/tallas/TallaTitulo";
import { FiltroTallasJuntas, SelectorTallas } from "@/components/tallas/SelectorTallas";
import { PrendaTallaCard } from "@/components/tallas/PrendaTallaCard";
import { TallaVacia } from "@/components/tallas/TallaVacia";
import { getCatalogoTalla, getTallasDisponibles } from "@/app/lib/catalogo-tallas";
import { getSiteUrl } from "@/app/lib/site-url";

/** Igual que el catálogo: se regenera cada 60 s, así lo que cambie en el panel aparece solo. */
export const revalidate = 60;

type Params = { params: Promise<{ talla: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { talla: slug } = await params;
  const data = await getCatalogoTalla(slug);
  if (!data) return { title: "Talla no disponible" };
  const { talla, prendas } = data;
  const titulo = `Catálogo Talla ${talla.nombre}`;
  const descripcion = `${talla.cantidad} ${talla.cantidad === 1 ? "prenda disponible" : "prendas disponibles"} en talla ${talla.nombre}. Pide la tuya por WhatsApp.`;
  // Vista previa en WhatsApp: la foto de la prenda más nueva de esa talla (o la imagen general del sitio)
  // (pasa por el optimizador de Next: a WhatsApp le entrega JPG en vez de WebP)
  const imagen = prendas[0]
    ? prendas[0].imagen.startsWith("http")
      ? prendas[0].imagen
      : `${getSiteUrl()}/_next/image?url=${encodeURIComponent(prendas[0].imagen)}&w=1200&q=75`
    : `${getSiteUrl()}/home.jpg`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `/tallas/${talla.slug}` },
    openGraph: {
      title: `${titulo} — Soft Lingerie`,
      description: descripcion,
      url: `/tallas/${talla.slug}`,
      siteName: "Soft Lingerie",
      locale: "es_CO",
      type: "website",
      images: [{ url: imagen, alt: titulo }],
    },
    twitter: { card: "summary_large_image", title: `${titulo} — Soft Lingerie`, description: descripcion, images: [imagen] },
  };
}

export default async function CatalogoTallaPage({ params }: Params) {
  const { talla: slug } = await params;
  const [data, tallas] = await Promise.all([getCatalogoTalla(slug), getTallasDisponibles()]);
  if (!data) notFound();
  const { talla, prendas, junta } = data;

  return (
    <main className="pb-20 font-display text-ink">
      {/* Encabezado: cielo rosa con "Catálogo Talla M" */}
      <div className="px-2 sm:px-3">
        <CieloRosa variante="pagina" className="px-5 pb-32 pt-12 text-center md:pb-40 md:pt-16">
          <TallaTitulo talla={talla} />
          <p className="mt-3 text-base text-ink/75 md:text-lg">
            {prendas.length} {prendas.length === 1 ? "prenda disponible" : "prendas disponibles"} en tu talla
          </p>

          <SelectorTallas tallas={tallas} actual={talla} junta={junta?.talla} />
          {junta && <FiltroTallasJuntas junta={junta.talla} separadas={junta.separadas} actual={talla} />}

          {prendas.length > 0 && (
            <a
              href={`/tallas/${talla.slug}/pdf`}
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink shadow-lg shadow-ink/10 transition-colors hover:bg-ink hover:text-white"
            >
              <Download size={16} aria-hidden /> Descargar catálogo en PDF
            </a>
          )}
        </CieloRosa>
      </div>

      <div className="mx-auto max-w-[96rem] px-4 pt-10 sm:px-6 md:pt-14 lg:px-8">
        {prendas.length === 0 ? (
          <TallaVacia talla={talla.nombre} />
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
            {prendas.map((p, i) => (
              <PrendaTallaCard key={p.id} prenda={p} tallaPorDefecto={talla.nombre} prioridad={i < 4} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

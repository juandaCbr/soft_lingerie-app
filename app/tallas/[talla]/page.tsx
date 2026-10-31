import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, MessageCircle, ArrowUpRight, Heart } from "lucide-react";
import { HomeCloud, HomeCloudBank } from "@/components/home/HomeCloud";
import {
  formatoPrecio,
  getCatalogoTalla,
  getTallasDisponibles,
  whatsappPedidoHref,
} from "@/app/lib/catalogo-tallas";
import { contactWhatsAppHref } from "@/app/lib/contacto";
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
  const { talla, prendas } = data;

  return (
    <main className="pb-20 font-display text-ink">
      {/* Encabezado: cielo rosa con "Catálogo Talla M" */}
      <div className="px-2 sm:px-3">
        <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-[radial-gradient(130%_90%_at_50%_0%,#d7a9c7_0%,#e5bed7_38%,#f2cbe2_72%,#f6d6e9_100%)] px-5 pb-32 pt-12 text-center md:rounded-[2.75rem] md:pb-40 md:pt-16">
          <HomeCloud fade sizes="20vw" className="left-[-5%] top-[8%] -z-10 aspect-[2/1] w-[40%] opacity-60 md:w-[16%]" />
          <HomeCloud fade flip sizes="16vw" className="right-[-4%] top-[4%] -z-10 aspect-[2/1] w-[34%] opacity-50 md:w-[13%]" />

          <p className="font-accent text-[clamp(0.9rem,1.6vw,1.2rem)] font-semibold uppercase tracking-[0.32em]">Catálogo</p>
          <h1 className="mt-1 flex items-baseline justify-center gap-[0.25em] font-extrabold leading-[0.85] tracking-[-0.05em]">
            <span className="text-[clamp(2.5rem,7vw,5.5rem)]">Talla</span>
            <span className="text-wordmark w-max px-[0.12em] text-[clamp(5rem,16vw,12rem)]">{talla.nombre}</span>
          </h1>
          <p className="mt-3 text-base text-ink/75 md:text-lg">
            {prendas.length} {prendas.length === 1 ? "prenda disponible" : "prendas disponibles"} en tu talla
          </p>

          {/* Cambiar de talla */}
          <nav aria-label="Otras tallas" className="mt-6 flex flex-wrap justify-center gap-2">
            {tallas.map((t) => {
              const activa = t.slug === talla.slug;
              return (
                <Link
                  key={t.slug}
                  href={`/tallas/${t.slug}`}
                  aria-current={activa ? "page" : undefined}
                  className={`grid h-12 min-w-12 place-items-center rounded-full px-4 text-base font-bold transition-colors ${
                    activa ? "bg-ink text-white" : "bg-white/85 text-ink hover:bg-white"
                  }`}
                >
                  {t.nombre}
                </Link>
              );
            })}
          </nav>

          {prendas.length > 0 && (
            <a
              href={`/tallas/${talla.slug}/pdf`}
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink shadow-lg shadow-ink/10 transition-colors hover:bg-ink hover:text-white"
            >
              <Download size={16} aria-hidden /> Descargar catálogo en PDF
            </a>
          )}

          <HomeCloudBank className="inset-x-0 bottom-0 top-[80%] -z-10" />
        </div>
      </div>

      <div className="mx-auto max-w-[96rem] px-4 pt-10 sm:px-6 md:pt-14 lg:px-8">
        {prendas.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-[2rem] bg-white px-6 py-20 text-center ring-1 ring-ink/5">
            <Heart size={40} className="mb-4 text-brand-primary" aria-hidden />
            <p className="text-xl font-semibold">Por ahora no hay prendas en talla {talla.nombre}</p>
            <p className="mt-2 text-ink/60">Escríbenos y te avisamos apenas llegue algo para ti.</p>
            <a
              href={contactWhatsAppHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-7 text-sm font-bold text-white"
            >
              <MessageCircle size={17} aria-hidden /> Escríbenos por WhatsApp
            </a>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
            {prendas.map((p, i) => (
              <li key={p.id} className="flex flex-col">
                <Link
                  href={p.href}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-blush md:rounded-[1.75rem]"
                >
                  <Image
                    src={p.imagen}
                    alt={p.nombre}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    priority={i < 4}
                    className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                  />
                  {/* La talla queda en la foto: si la clienta toma captura, ya sale */}
                  <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white md:left-4 md:top-4 md:text-sm">
                    Talla {talla.nombre}
                  </span>
                </Link>

                <div className="mt-3 flex flex-1 flex-col px-1">
                  {p.categoria && <p className="text-xs font-semibold text-ink/50">{p.categoria}</p>}
                  <h2 className="mt-0.5 text-base font-semibold leading-snug md:text-lg">{p.nombre}</h2>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {formatoPrecio(p.precio)} <span className="text-xs font-medium text-ink/45">COP</span>
                  </p>
                  {p.colores.length > 0 && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
                      {p.colores.map((c) => (
                        <span key={c.nombre} className="inline-flex items-center gap-1">
                          <span aria-hidden className="h-3 w-3 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: c.hex || "#ccc" }} />
                          {c.nombre}
                        </span>
                      ))}
                    </p>
                  )}

                  <div className="mt-auto flex flex-col gap-2 pt-4">
                    <a
                      href={whatsappPedidoHref(p, talla.nombre)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3 text-[13px] font-bold text-white shadow-lg shadow-ink/20 transition-colors hover:bg-brand-dark active:scale-[0.98] sm:gap-2 sm:px-4 sm:text-sm"
                    >
                      <MessageCircle size={16} aria-hidden className="shrink-0" /> Pedir por WhatsApp
                    </a>
                    <Link
                      href={p.href}
                      className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-ink/60 transition-colors hover:text-ink"
                    >
                      Ver detalle <ArrowUpRight size={15} aria-hidden />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { Suspense } from "react";
import CatalogoClient, { CatalogoSkeleton } from "./CatalogoClient";
import { getSiteUrl } from "@/app/lib/site-url";
import type { ProductoCatalogoVariante } from "@/app/lib/catalog-types";

export const revalidate = 60;

const siteUrl = getSiteUrl();

/**
 * Metadatos del listado /productos: título corto para combinar con template del layout
 * ("Catálogo de Lencería | Soft Lingerie"), canonical, OG/Twitter con imagen fija en /public,
 * robots index/follow. Las keywords apoyan búsquedas de intención comercial locales.
 */
export const metadata: Metadata = {
  title: "Catálogo de Lencería",
  description:
    "Explora el catálogo de Soft Lingerie: conjuntos, babydolls, ligueros y más. Filtra por talla, color y precio para encontrar tu diseño ideal.",
  keywords: [
    "catálogo lencería",
    "conjuntos de encaje",
    "lencería Valledupar",
    "comprar ropa interior Colombia",
    "Soft Lingerie",
  ],
  alternates: {
    canonical: "/productos",
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Catálogo de Lencería | Soft Lingerie",
    description:
      "Encuentra tu diseño ideal en nuestro catálogo de lencería con filtros por talla, color y precio.",
    url: `${siteUrl}/productos`,
    siteName: "Soft Lingerie",
    locale: "es_CO",
    type: "website",
    images: [{ url: `${siteUrl}/home.jpg`, alt: "Soft Lingerie — catálogo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Catálogo de Lencería | Soft Lingerie",
    description:
      "Catálogo completo con filtros por talla, color y precio.",
    images: [`${siteUrl}/home.jpg`],
  },
};

const CATALOGO_PRODUCTOS_SELECT = `
  id,
  nombre,
  descripcion,
  precio,
  stock,
  created_at,
  grupo_id,
  categoria,
  imagenes_urls,
  imagenes_locales,
  producto_colores!left (
    colores (nombre, hex)
  ),
  producto_tallas!left (
    stock_talla,
    tallas (nombre, id, orden)
  )
`;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export default async function CatalogoPage() {
  // Lista inicial desde servidor + ISR para mejorar render inicial y SEO.
  // Query mínima: trae solo campos usados por filtros/cards para bajar latencia.
  const { data } = await supabaseAdmin
    .from("productos")
    .select(CATALOGO_PRODUCTOS_SELECT)
    .eq("activo", true);

  /**
   * CollectionPage: indica a los buscadores que esta URL es el índice del catálogo.
   * isPartOf apunta al mismo WebSite (#website) que define la home para coherencia del grafo.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Catálogo de lencería — Soft Lingerie",
    description:
      "Catálogo de conjuntos, babydolls y lencería fina con envíos a Colombia.",
    url: `${siteUrl}/productos`,
    isPartOf: { "@id": `${siteUrl}/#website` },
    inLanguage: "es-CO",
  };

  return (
    <>
      {/* JSON-LD de catálogo: complementa las meta tags con tipo de página explícito. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<CatalogoSkeleton />}>
        <CatalogoClient rawDataInicial={(data || []) as unknown as ProductoCatalogoVariante[]} />
      </Suspense>
    </>
  );
}

import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { cache } from "react";
import HomeClient from "./HomeClient";
import { getProductoImage, toAbsolutePublicUrl } from "./lib/image-helper";
import { getSiteUrl } from "./lib/site-url";
import type { HomeProducto, VentaDetalleHome } from "./lib/home-types";

/** @id estable en JSON-LD para enlazar Organization ↔ WebSite (mismo sitio que en schema.org). */
const ORGANIZATION_ID = "#organization";

export const revalidate = 60;

const HOME_PRODUCTOS_SELECT = `
  id,
  nombre,
  precio,
  categoria,
  created_at,
  grupo_id,
  destacado_home,
  imagenes_urls,
  imagenes_locales
`;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const getHomeData = cache(async () => {
  const [{ data: prods }, { data: vnts }] = await Promise.all([
    supabaseAdmin
      .from("productos")
      .select(HOME_PRODUCTOS_SELECT)
      .eq("activo", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabaseAdmin
      .from("ventas_realizadas")
      .select("detalle_compra")
      .eq("estado_pago", "APROBADO"),
  ]);

  const productos = (prods || []) as HomeProducto[];
  const ventas = (vnts || []) as VentaDetalleHome[];

  const conteo: Record<string, number> = {};
  ventas.forEach((v) => {
    if (!v || !Array.isArray(v.detalle_compra)) return;
    v.detalle_compra.forEach((item) => {
      if (item?.id == null || item.id === "") return;
      const key = String(item.id);
      conteo[key] = (conteo[key] || 0) + (Number(item.quantity) || 1);
    });
  });

  const ordenadosPorVentas = [...productos]
    .filter((p) => {
      const k = String(p.id);
      return conteo[k] && conteo[k] > 0;
    })
    .sort((a, b) => conteo[String(b.id)] - conteo[String(a.id)]);

  const fallbackNovedad = [...productos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  const heroProducto = ordenadosPorVentas[0] || fallbackNovedad || null;
  const heroImage = heroProducto ? getProductoImage(heroProducto, 0, "detail") : null;

  return { productos, ventas, heroImage };
});

/**
 * SEO página de inicio: título explícito (absolute evita duplicar el sufijo del layout),
 * canonical "/", Open Graph + Twitter con imagen (producto destacado o fallback en /public),
 * robots index/follow para indexación clara.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { heroImage } = await getHomeData();
  const absoluteHeroImage = heroImage ? toAbsolutePublicUrl(heroImage) : undefined;
  const site = getSiteUrl();
  /** Imagen OG por defecto si aún no hay hero desde catálogo (evita compartidos sin imagen). */
  const defaultOg = `${site}/home.jpg`;

  return {
    title: {
      absolute: "Soft Lingerie | Lencería Valledupar y Boutique Online",
    },
    description:
      "Descubre lencería exclusiva en Valledupar. Catálogo premium de conjuntos, bodies y prendas de seducción con envíos seguros a toda Colombia.",
    keywords: [
      "lencería Valledupar",
      "lencería Colombia",
      "ropa interior femenina",
      "boutique lencería online",
      "Soft Lingerie",
    ],
    alternates: {
      canonical: "/",
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: "Soft Lingerie | Lencería Valledupar y Boutique Online",
      description:
        "Descubre lencería exclusiva en Valledupar. Catálogo premium de conjuntos, bodies y prendas de seducción.",
      url: `${site}/`,
      siteName: "Soft Lingerie",
      locale: "es_CO",
      type: "website",
      images: absoluteHeroImage
        ? [{ url: absoluteHeroImage, alt: "Soft Lingerie — destacado" }]
        : [{ url: defaultOg, alt: "Soft Lingerie Valledupar" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Soft Lingerie | Lencería Valledupar y Boutique Online",
      description:
        "Catálogo premium de lencería con envíos seguros a toda Colombia.",
      images: absoluteHeroImage ? [absoluteHeroImage] : [defaultOg],
    },
  };
}

export default async function HomePage() {
  // Render server + ISR: evita loader inicial y entrega HTML listo desde CDN.
  // Además, seleccionamos solo columnas usadas por las cards para reducir tiempo/transferencia.
  const { productos, ventas } = await getHomeData();
  const site = getSiteUrl();
  /**
   * JSON-LD (schema.org): Organization + WebSite enlazados por @id.
   * Ayuda a Google a entender marca, URL canónica del sitio e idioma (rich results / Knowledge Graph).
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site}${ORGANIZATION_ID}`,
        name: "Soft Lingerie",
        url: site,
        description:
          "Boutique de lencería en Valledupar con envíos a toda Colombia.",
        areaServed: { "@type": "Country", name: "Colombia" },
      },
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        url: site,
        name: "Soft Lingerie",
        description:
          "Lencería exclusiva en Valledupar. Catálogo online con envíos nacionales.",
        publisher: { "@id": `${site}${ORGANIZATION_ID}` },
        inLanguage: "es-CO",
      },
    ],
  };

  return (
    <>
      {/* Datos estructurados en el HTML inicial (rastreables sin depender solo del cliente). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient productosIniciales={productos} ventasIniciales={ventas} />
    </>
  );
}
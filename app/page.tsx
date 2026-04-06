import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { cache } from "react";
import HomeClient from "./HomeClient";
import { getProductoImage, toAbsolutePublicUrl } from "./lib/image-helper";

export const revalidate = 60;

const HOME_PRODUCTOS_SELECT = `
  id,
  nombre,
  precio,
  categoria,
  created_at,
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
      .eq("activo", true),
    supabaseAdmin
      .from("ventas_realizadas")
      .select("detalle_compra")
      .eq("estado_pago", "APROBADO"),
  ]);

  const productos = prods || [];
  const ventas = vnts || [];

  const conteo: Record<string, number> = {};
  ventas.forEach((v: any) => {
    if (!v || !Array.isArray(v.detalle_compra)) return;
    v.detalle_compra.forEach((item: any) => {
      if (!item?.id) return;
      conteo[item.id] = (conteo[item.id] || 0) + (Number(item.quantity) || 1);
    });
  });

  const ordenadosPorVentas = [...productos]
    .filter((p: any) => conteo[p.id] && conteo[p.id] > 0)
    .sort((a: any, b: any) => conteo[b.id] - conteo[a.id]);

  const fallbackNovedad = [...productos].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  const heroProducto = ordenadosPorVentas[0] || fallbackNovedad || null;
  const heroImage = heroProducto ? getProductoImage(heroProducto, 0, "detail") : null;

  return { productos, ventas, heroImage };
});

export async function generateMetadata(): Promise<Metadata> {
  const { heroImage } = await getHomeData();
  const absoluteHeroImage = heroImage ? toAbsolutePublicUrl(heroImage) : undefined;

  return {
    title: "Soft Lingerie | Lencería Valledupar y Boutique Online",
    description:
      "Descubre lencería exclusiva en Valledupar. Catálogo premium de conjuntos, bodies y prendas de seducción con envíos seguros a toda Colombia.",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: "Soft Lingerie | Lencería Valledupar y Boutique Online",
      description:
        "Descubre lencería exclusiva en Valledupar. Catálogo premium de conjuntos, bodies y prendas de seducción.",
      url: "https://soft-lingerie-app.vercel.app/",
      type: "website",
      images: absoluteHeroImage ? [absoluteHeroImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: "Soft Lingerie | Lencería Valledupar y Boutique Online",
      description:
        "Catálogo premium de lencería con envíos seguros a toda Colombia.",
      images: absoluteHeroImage ? [absoluteHeroImage] : undefined,
    },
  };
}

export default async function HomePage() {
  // Render server + ISR: evita loader inicial y entrega HTML listo desde CDN.
  // Además, seleccionamos solo columnas usadas por las cards para reducir tiempo/transferencia.
  const { productos, ventas } = await getHomeData();

  return (
    <HomeClient
      productosIniciales={productos}
      ventasIniciales={ventas}
    />
  );
}
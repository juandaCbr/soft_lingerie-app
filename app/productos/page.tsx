import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import CatalogoClient from "./CatalogoClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Catálogo de Lencería | Soft Lingerie",
  description:
    "Explora el catálogo de Soft Lingerie: conjuntos, babydolls, ligueros y más. Filtra por talla, color y precio para encontrar tu diseño ideal.",
  alternates: {
    canonical: "/productos",
  },
  openGraph: {
    title: "Catálogo de Lencería | Soft Lingerie",
    description:
      "Encuentra tu diseño ideal en nuestro catálogo de lencería con filtros por talla, color y precio.",
    url: "https://soft-lingerie-app.vercel.app/productos",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Catálogo de Lencería | Soft Lingerie",
    description:
      "Catálogo completo con filtros por talla, color y precio.",
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

  return <CatalogoClient rawDataInicial={data || []} />;
}

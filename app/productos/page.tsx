import { createClient } from "@supabase/supabase-js";
import CatalogoClient from "./CatalogoClient";

export const revalidate = 60;

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

import { createClient } from "@supabase/supabase-js";
import HomeClient from "./HomeClient";

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

export default async function HomePage() {
  // Render server + ISR: evita loader inicial y entrega HTML listo desde CDN.
  // Además, seleccionamos solo columnas usadas por las cards para reducir tiempo/transferencia.
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

  return <HomeClient productosIniciales={prods || []} ventasIniciales={vnts || []} />;
}
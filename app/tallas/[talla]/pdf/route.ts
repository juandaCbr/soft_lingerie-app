import { getCatalogoTalla, slugRedirigido } from "@/app/lib/catalogo-tallas";
import { crearPdfCatalogoTalla } from "@/app/lib/pdf-catalogo-tallas";

/**
 * PDF del catálogo de una talla (regalo para la clienta). SOLO LECTURA: usa el mismo cargador
 * que /tallas/[talla]; el dibujo del PDF está en app/lib/pdf-catalogo-tallas.ts.
 */
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ talla: string }> }) {
  const { talla: slug } = await params;
  const destino = slugRedirigido(slug);
  if (destino) return Response.redirect(new URL(`/tallas/${destino}/pdf`, request.url), 308);
  const data = await getCatalogoTalla(slug);
  if (!data) return new Response("Talla no encontrada", { status: 404 });

  const bytes = await crearPdfCatalogoTalla({ ...data, origen: new URL(request.url).origin });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="catalogo-talla-${data.talla.slug}-soft-lingerie.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

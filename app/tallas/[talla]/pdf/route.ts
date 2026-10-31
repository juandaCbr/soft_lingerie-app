import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import sharp from "sharp";
import { formatoPrecio, getCatalogoTalla } from "@/app/lib/catalogo-tallas";
import { getSiteUrl } from "@/app/lib/site-url";
import { CONTACT_WHATSAPP_NUMBER } from "@/app/lib/contacto";

/**
 * PDF del catálogo de una talla (regalo para la clienta). SOLO LECTURA: usa el mismo cargador
 * que /tallas/[talla] y descarga las fotos del propio sitio para incrustarlas.
 */
export const runtime = "nodejs";

const INK = rgb(74 / 255, 29 / 255, 68 / 255);
const ROSA = rgb(229 / 255, 190 / 255, 215 / 255);
const ROSA_CLARO = rgb(255 / 255, 215 / 255, 241 / 255);
const CREMA = rgb(253 / 255, 248 / 255, 246 / 255);
const GRIS = rgb(120 / 255, 95 / 255, 115 / 255);

// A4 en puntos y rejilla de 3 x 3 prendas por página
const W = 595.28;
const H = 841.89;
const MARGEN = 36;
const COLS = 3;
const FILAS = 3;
const GAP = 14;
const CABECERA = 128;
const PIE = 40;
const CELDA_W = (W - MARGEN * 2 - GAP * (COLS - 1)) / COLS;
const CELDA_H = (H - CABECERA - PIE - MARGEN - GAP * (FILAS - 1)) / FILAS;
const FOTO = Math.min(CELDA_W, CELDA_H - 58);

/** Las fuentes estándar del PDF solo cubren Latin-1: se quitan emojis y símbolos raros. */
const limpio = (t: string) => t.normalize("NFC").replace(/[^\x20-\x7E -ÿ]/g, "").trim();

function recortar(texto: string, font: PDFFont, tamano: number, ancho: number) {
  let t = limpio(texto);
  if (font.widthOfTextAtSize(t, tamano) <= ancho) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, tamano) > ancho) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

async function fotoJpeg(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const lado = Math.round(FOTO * 2.4); // ~170 ppp: nítida al imprimir y liviana
    return await sharp(buf).resize(lado, lado, { fit: "cover", position: "attention" }).jpeg({ quality: 80 }).toBuffer();
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ talla: string }> }) {
  const { talla: slug } = await params;
  const data = await getCatalogoTalla(slug);
  if (!data) return new Response("Talla no encontrada", { status: 404 });
  const { talla, prendas } = data;

  const origen = new URL(request.url).origin;
  const absoluta = (src: string) => (src.startsWith("http") ? src : `${origen}${src.startsWith("/") ? "" : "/"}${src}`);

  // Fotos en paralelo (de a 6 para no saturar el servidor)
  const fotos: (Buffer | null)[] = new Array(prendas.length).fill(null);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (siguiente < prendas.length) {
        const i = siguiente++;
        fotos[i] = await fotoJpeg(absoluta(prendas[i].imagen));
      }
    }),
  );

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Catálogo Talla ${talla.nombre} — Soft Lingerie`);
  pdf.setAuthor("Soft Lingerie");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  const sitio = getSiteUrl().replace(/^https?:\/\//, "");
  const telefono = `+${CONTACT_WHATSAPP_NUMBER.slice(0, 2)} ${CONTACT_WHATSAPP_NUMBER.slice(2, 5)} ${CONTACT_WHATSAPP_NUMBER.slice(5, 8)} ${CONTACT_WHATSAPP_NUMBER.slice(8)}`;
  const fecha = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  const porPagina = COLS * FILAS;
  const paginas = Math.max(1, Math.ceil(prendas.length / porPagina));

  for (let p = 0; p < paginas; p++) {
    const page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREMA });

    // Cabecera: banda rosa con la marca y la talla
    page.drawRectangle({ x: 0, y: H - CABECERA + 18, width: W, height: CABECERA - 18, color: ROSA });
    page.drawText("SOFT", { x: MARGEN, y: H - 62, size: 34, font: negrita, color: INK });
    page.drawText("L I N G E R I E", { x: MARGEN + 2, y: H - 80, size: 9, font: negrita, color: INK });
    const titulo = `Talla ${talla.nombre}`;
    const tamTitulo = 40;
    page.drawText(titulo, { x: W - MARGEN - negrita.widthOfTextAtSize(titulo, tamTitulo), y: H - 70, size: tamTitulo, font: negrita, color: rgb(1, 1, 1) });
    const sub = limpio(`${prendas.length} ${prendas.length === 1 ? "prenda disponible" : "prendas disponibles"} · ${fecha}`);
    page.drawText(sub, { x: W - MARGEN - regular.widthOfTextAtSize(sub, 10), y: H - 90, size: 10, font: regular, color: INK });

    // Rejilla de prendas
    const desde = p * porPagina;
    for (let k = 0; k < porPagina && desde + k < prendas.length; k++) {
      const i = desde + k;
      const prenda = prendas[i];
      const col = k % COLS;
      const fila = Math.floor(k / COLS);
      const x = MARGEN + col * (CELDA_W + GAP);
      const yTop = H - CABECERA - fila * (CELDA_H + GAP);
      const xFoto = x + (CELDA_W - FOTO) / 2;

      page.drawRectangle({ x, y: yTop - CELDA_H, width: CELDA_W, height: CELDA_H, color: rgb(1, 1, 1) });
      const buf = fotos[i];
      if (buf) {
        const img: PDFImage = await pdf.embedJpg(buf);
        page.drawImage(img, { x: xFoto, y: yTop - FOTO, width: FOTO, height: FOTO });
      } else {
        page.drawRectangle({ x: xFoto, y: yTop - FOTO, width: FOTO, height: FOTO, color: ROSA_CLARO });
      }

      const xTexto = x + 8;
      const anchoTexto = CELDA_W - 16;
      page.drawText(recortar(prenda.nombre, negrita, 10.5, anchoTexto), { x: xTexto, y: yTop - FOTO - 16, size: 10.5, font: negrita, color: INK });
      page.drawText(`${formatoPrecio(prenda.precio)} COP`, { x: xTexto, y: yTop - FOTO - 31, size: 10, font: negrita, color: INK });
      const colores = prenda.colores.map((c) => c.nombre).join(", ");
      if (colores) {
        page.drawText(recortar(colores, regular, 8.5, anchoTexto), { x: xTexto, y: yTop - FOTO - 44, size: 8.5, font: regular, color: GRIS });
      }
    }

    // Pie: cómo pedir
    const pie = limpio(`Pide por WhatsApp ${telefono}  ·  ${sitio}/tallas/${talla.slug}`);
    page.drawText(pie, { x: (W - regular.widthOfTextAtSize(pie, 9)) / 2, y: 18, size: 9, font: regular, color: INK });
    if (paginas > 1) {
      const n = `${p + 1}/${paginas}`;
      page.drawText(n, { x: W - MARGEN - regular.widthOfTextAtSize(n, 8), y: 18, size: 8, font: regular, color: GRIS });
    }
  }

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="catalogo-talla-${talla.slug}-soft-lingerie.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

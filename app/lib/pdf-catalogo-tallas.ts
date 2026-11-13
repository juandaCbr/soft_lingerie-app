import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import { formatoPrecio, type PrendaTalla, type TallaCatalogo } from "./catalogo-tallas";
import { getSiteUrl } from "./site-url";
import { CONTACT_WHATSAPP_NUMBER } from "./contacto";

/**
 * Arma el PDF del catálogo de una talla (A4, 3 x 3 prendas por página) con la paleta de la marca.
 * Solo dibuja: recibe las prendas ya cargadas y descarga sus fotos del propio sitio.
 */

const COLOR = {
  ink: rgb(74 / 255, 29 / 255, 68 / 255),
  rosa: rgb(229 / 255, 190 / 255, 215 / 255),
  rosaClaro: rgb(255 / 255, 215 / 255, 241 / 255),
  crema: rgb(253 / 255, 248 / 255, 246 / 255),
  gris: rgb(120 / 255, 95 / 255, 115 / 255),
  blanco: rgb(1, 1, 1),
};

// A4 en puntos y rejilla de 3 x 3 prendas por página
const W = 595.28;
const H = 841.89;
const MARGEN = 36;
const COLS = 3;
const FILAS = 3;
const POR_PAGINA = COLS * FILAS;
const GAP = 14;
const CABECERA = 128;
const PIE = 40;
const CELDA_W = (W - MARGEN * 2 - GAP * (COLS - 1)) / COLS;
const CELDA_H = (H - CABECERA - PIE - MARGEN - GAP * (FILAS - 1)) / FILAS;
const FOTO = Math.min(CELDA_W, CELDA_H - 58);
/** Fotos que se descargan a la vez (para no saturar el servidor) */
const DESCARGAS_EN_PARALELO = 6;

type Fuentes = { regular: PDFFont; negrita: PDFFont };

/** Las fuentes estándar del PDF solo cubren Latin-1: se quitan emojis y símbolos raros. */
const limpio = (t: string) => t.normalize("NFC").replace(/[^\x20-\x7E -ÿ]/g, "").trim();

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

/** Descarga las fotos de las prendas (en el mismo orden); null si alguna falla. */
async function descargarFotos(prendas: PrendaTalla[], origen: string) {
  const absoluta = (src: string) => (src.startsWith("http") ? src : `${origen}${src.startsWith("/") ? "" : "/"}${src}`);
  const fotos: (Buffer | null)[] = new Array(prendas.length).fill(null);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: DESCARGAS_EN_PARALELO }, async () => {
      while (siguiente < prendas.length) {
        const i = siguiente++;
        fotos[i] = await fotoJpeg(absoluta(prendas[i].imagen));
      }
    }),
  );
  return fotos;
}

/** Banda rosa con la marca a la izquierda y la talla a la derecha. */
function dibujarCabecera(page: PDFPage, { regular, negrita }: Fuentes, talla: TallaCatalogo, subtitulo: string) {
  page.drawRectangle({ x: 0, y: H - CABECERA + 18, width: W, height: CABECERA - 18, color: COLOR.rosa });
  page.drawText("SOFT", { x: MARGEN, y: H - 62, size: 34, font: negrita, color: COLOR.ink });
  page.drawText("L I N G E R I E", { x: MARGEN + 2, y: H - 80, size: 9, font: negrita, color: COLOR.ink });
  const titulo = `Talla ${talla.nombre}`;
  const tamTitulo = 40;
  page.drawText(titulo, { x: W - MARGEN - negrita.widthOfTextAtSize(titulo, tamTitulo), y: H - 70, size: tamTitulo, font: negrita, color: COLOR.blanco });
  page.drawText(subtitulo, { x: W - MARGEN - regular.widthOfTextAtSize(subtitulo, 10), y: H - 90, size: 10, font: regular, color: COLOR.ink });
}

/** Una celda de la rejilla: foto, nombre, precio y (talla ·) colores. */
async function dibujarPrenda(
  pdf: PDFDocument,
  page: PDFPage,
  { regular, negrita }: Fuentes,
  prenda: PrendaTalla,
  foto: Buffer | null,
  posicion: number,
  mostrarTalla: boolean,
) {
  const col = posicion % COLS;
  const fila = Math.floor(posicion / COLS);
  const x = MARGEN + col * (CELDA_W + GAP);
  const yTop = H - CABECERA - fila * (CELDA_H + GAP);
  const xFoto = x + (CELDA_W - FOTO) / 2;

  page.drawRectangle({ x, y: yTop - CELDA_H, width: CELDA_W, height: CELDA_H, color: COLOR.blanco });
  if (foto) {
    const img: PDFImage = await pdf.embedJpg(foto);
    page.drawImage(img, { x: xFoto, y: yTop - FOTO, width: FOTO, height: FOTO });
  } else {
    page.drawRectangle({ x: xFoto, y: yTop - FOTO, width: FOTO, height: FOTO, color: COLOR.rosaClaro });
  }

  const xTexto = x + 8;
  const anchoTexto = CELDA_W - 16;
  page.drawText(recortar(prenda.nombre, negrita, 10.5, anchoTexto), { x: xTexto, y: yTop - FOTO - 16, size: 10.5, font: negrita, color: COLOR.ink });
  page.drawText(`${formatoPrecio(prenda.precio)} COP`, { x: xTexto, y: yTop - FOTO - 31, size: 10, font: negrita, color: COLOR.ink });
  // En el catálogo combinado (XS y S) se aclara en cuál talla hay
  const detalle = [mostrarTalla ? `Talla ${prenda.tallas.join(" y ")}` : "", prenda.colores.map((c) => c.nombre).join(", ")]
    .filter(Boolean)
    .join(" · ");
  if (detalle) {
    page.drawText(recortar(detalle, regular, 8.5, anchoTexto), { x: xTexto, y: yTop - FOTO - 44, size: 8.5, font: regular, color: COLOR.gris });
  }
}

/** Pie: cómo pedir y número de página. */
function dibujarPie(page: PDFPage, { regular }: Fuentes, texto: string, pagina: number, paginas: number) {
  page.drawText(texto, { x: (W - regular.widthOfTextAtSize(texto, 9)) / 2, y: 18, size: 9, font: regular, color: COLOR.ink });
  if (paginas > 1) {
    const n = `${pagina + 1}/${paginas}`;
    page.drawText(n, { x: W - MARGEN - regular.widthOfTextAtSize(n, 8), y: 18, size: 8, font: regular, color: COLOR.gris });
  }
}

/** Telefono de WhatsApp legible: 573001234567 → "+57 300 123 4567". */
const telefonoLegible = (n: string) => `+${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;

export async function crearPdfCatalogoTalla({
  talla,
  prendas,
  origen,
}: {
  talla: TallaCatalogo;
  prendas: PrendaTalla[];
  /** Origen del sitio (https://soft-lingerie.com) desde donde se descargan las fotos */
  origen: string;
}): Promise<Uint8Array> {
  const fotos = await descargarFotos(prendas, origen);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Catálogo Talla ${talla.nombre} — Soft Lingerie`);
  pdf.setAuthor("Soft Lingerie");
  const fuentes: Fuentes = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    negrita: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const sitio = getSiteUrl().replace(/^https?:\/\//, "");
  const fecha = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  const subtitulo = limpio(`${prendas.length} ${prendas.length === 1 ? "prenda disponible" : "prendas disponibles"} · ${fecha}`);
  const pie = limpio(`Pide por WhatsApp ${telefonoLegible(CONTACT_WHATSAPP_NUMBER)}  ·  ${sitio}/tallas/${talla.slug}`);
  const mostrarTalla = talla.tallas.length > 1;
  const paginas = Math.max(1, Math.ceil(prendas.length / POR_PAGINA));

  for (let p = 0; p < paginas; p++) {
    const page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COLOR.crema });
    dibujarCabecera(page, fuentes, talla, subtitulo);

    const desde = p * POR_PAGINA;
    for (let k = 0; k < POR_PAGINA && desde + k < prendas.length; k++) {
      await dibujarPrenda(pdf, page, fuentes, prendas[desde + k], fotos[desde + k], k, mostrarTalla);
    }

    dibujarPie(page, fuentes, pie, p, paginas);
  }

  return pdf.save();
}

/**
 * Pipeline común para thumb/detail WebP de productos (admin upload + migración).
 * - EXIF: rotate() sin ángulo antes del resize.
 * - Anchos máximos; altura proporcional (fit inside, sin deformar).
 * - Detail con tope de tamaño en bytes (calidad adaptativa).
 */
import sharp from 'sharp';

/** Ancho máximo en px; la altura la calcula Sharp manteniendo proporción. */
export const PRODUCT_IMAGE_THUMB_WIDTH = 250;
export const PRODUCT_IMAGE_DETAIL_WIDTH = 700;
export const PRODUCT_IMAGE_WEBP_QUALITY_THUMB = 78;
/** Objetivo máximo para el archivo detail (WebP). */
export const PRODUCT_IMAGE_DETAIL_MAX_BYTES = 100 * 1024;

export function pipelineOrientado(buffer: Buffer): sharp.Sharp {
  return sharp(buffer).rotate();
}

export async function webpDetailBajoTope(
  pipeline: sharp.Sharp,
  maxBytes: number,
): Promise<{ buffer: Buffer; qualityUsed: number }> {
  let q = 82;
  const minQ = 38;
  let last: Buffer | null = null;
  while (q >= minQ) {
    const buf = await pipeline.clone().webp({ quality: q, effort: 6 }).toBuffer();
    last = buf;
    if (buf.length <= maxBytes) {
      return { buffer: buf, qualityUsed: q };
    }
    q -= 4;
  }
  if (last && last.length > maxBytes) {
    console.warn(
      `[product-image-sharp] Detail > ${Math.round(maxBytes / 1024)} KB tras q=${minQ} (${(last.length / 1024).toFixed(1)} KB)`,
    );
  }
  return { buffer: last!, qualityUsed: minQ };
}

export async function generarThumbYDetailWebp(buffer: Buffer): Promise<{
  thumbBuf: Buffer;
  detailBuf: Buffer;
}> {
  const base = pipelineOrientado(buffer);
  const thumbBuf = await base
    .clone()
    .resize({
      width: PRODUCT_IMAGE_THUMB_WIDTH,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({ quality: PRODUCT_IMAGE_WEBP_QUALITY_THUMB, effort: 6 })
    .toBuffer();

  const detailSized = base.clone().resize({
    width: PRODUCT_IMAGE_DETAIL_WIDTH,
    withoutEnlargement: true,
    fit: 'inside',
  });

  const { buffer: detailBuf } = await webpDetailBajoTope(detailSized, PRODUCT_IMAGE_DETAIL_MAX_BYTES);
  return { thumbBuf, detailBuf };
}

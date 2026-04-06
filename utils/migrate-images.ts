/**
 * Migración masiva de imágenes: Supabase Storage → disco local (formato WebP thumb/detail).
 *
 * Uso:
 *   npx tsx utils/migrate-images.ts
 *
 * Variables necesarias en .env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, UPLOAD_DIR (default: ./uploads)
 *
 * Incluye todo producto con al menos una URL en `imagenes_urls` (aunque ya tenga `imagenes_locales`):
 * vuelve a descargar desde Storage, sobrescribe los WebP en disco y actualiza `imagenes_locales`.
 * Si una imagen individual falla, continúa con las restantes y lo marca como error al final.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import {
  generarThumbYDetailWebp,
  PRODUCT_IMAGE_DETAIL_MAX_BYTES,
  PRODUCT_IMAGE_DETAIL_WIDTH,
  PRODUCT_IMAGE_THUMB_WIDTH,
  PRODUCT_IMAGE_WEBP_QUALITY_THUMB,
} from '../app/lib/product-image-sharp';

// ─── Slugify (replica de app/lib/utils.ts sin imports Next) ──────────────────

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// ─── Configuración ───────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UPLOAD_DIR = (process.env.UPLOAD_DIR ?? './uploads').replace(/^\.\//, '');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const UPLOAD_ROOT = path.join(process.cwd(), UPLOAD_DIR);
const FETCH_TIMEOUT_MS = 30_000;

type ImagenLocal = { thumb: string; detail: string };
type Producto = {
  id: number;
  nombre: string;
  imagenes_urls: string[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function procesarImagen(
  buffer: Buffer,
  destDir: string,
  publicBase: string,
  slug: string,
  n: number,
): Promise<ImagenLocal> {
  const thumbName = `${slug}-${n}-thumb.webp`;
  const detailName = `${slug}-${n}-detail.webp`;

  const { thumbBuf, detailBuf } = await generarThumbYDetailWebp(buffer);

  await writeFile(path.join(destDir, thumbName), thumbBuf);
  await writeFile(path.join(destDir, detailName), detailBuf);

  return {
    thumb: `${publicBase}/${thumbName}`,
    detail: `${publicBase}/${detailName}`,
  };
}

// ─── Lógica principal ────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀  Inicio de migración de imágenes\n');
  console.log(`   UPLOAD_DIR → ${UPLOAD_ROOT}`);
  console.log(
    `   Tamaños   → thumb max ${PRODUCT_IMAGE_THUMB_WIDTH}px  |  detail max ${PRODUCT_IMAGE_DETAIL_WIDTH}px (proporcional, sin deformar)`,
  );
  console.log(
    `   Detail WebP → máx. ~${PRODUCT_IMAGE_DETAIL_MAX_BYTES / 1024} KB  |  thumb q${PRODUCT_IMAGE_WEBP_QUALITY_THUMB}`,
  );
  console.log('');

  const { data: productos, error: dbErr } = await supabase
    .from('productos')
    .select('id, nombre, imagenes_urls')
    .not('imagenes_urls', 'is', null)
    .order('id', { ascending: true });

  if (dbErr) {
    console.error('❌  Error al consultar productos:', dbErr.message);
    process.exit(1);
  }

  const candidatos: Producto[] = (productos ?? []).filter((p: Record<string, unknown>) => {
    const urls = p.imagenes_urls;
    return Array.isArray(urls) && urls.some((u) => typeof u === 'string' && u.trim().length > 0);
  });

  if (candidatos.length === 0) {
    console.log('✅  No hay productos con URLs en imagenes_urls. Nada que migrar.');
    return;
  }

  console.log(`📦  Productos a migrar: ${candidatos.length}\n`);
  console.log('─'.repeat(60));

  const errores: { id: number; nombre: string; detalle: string }[] = [];

  for (let i = 0; i < candidatos.length; i++) {
    const producto = candidatos[i]!;
    const pos = `[${i + 1}/${candidatos.length}]`;
    const tag = `${pos} #${producto.id} "${producto.nombre}"`;

    console.log(`\n⏳  Procesando ${tag}`);
    console.log(`    URLs origen: ${producto.imagenes_urls.length}`);

    try {
      const slug = slugify(producto.nombre) || `producto-${producto.id}`;
      const folderName = `${slug}-${producto.id}`;
      const destDir = path.join(UPLOAD_ROOT, 'productos', folderName);
      const publicBase = `/uploads/productos/${folderName}`;

      if (!existsSync(destDir)) {
        await mkdir(destDir, { recursive: true });
        console.log(`    📁  Carpeta creada: ${destDir}`);
      } else {
        console.log(`    📁  Carpeta existente: ${destDir}`);
      }

      const imagenesLocales: ImagenLocal[] = [];
      let erroresFoto = 0;

      for (let j = 0; j < producto.imagenes_urls.length; j++) {
        const url = producto.imagenes_urls[j]!;
        const n = j + 1;
        process.stdout.write(`    🖼   Imagen ${n}/${producto.imagenes_urls.length}... `);

        try {
          const buffer = await fetchBuffer(url);
          const local = await procesarImagen(buffer, destDir, publicBase, slug, n);
          imagenesLocales.push(local);
          console.log('✓');
        } catch (imgErr) {
          const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
          console.log(`✗ (${msg})`);
          erroresFoto++;
        }
      }

      if (imagenesLocales.length === 0) {
        throw new Error('No se pudo procesar ninguna imagen; se omite la actualización en BD.');
      }

      // Actualizar solo imagenes_locales; no tocar imagenes_urls (legado seguro)
      const { error: updErr } = await supabase
        .from('productos')
        .update({ imagenes_locales: imagenesLocales })
        .eq('id', producto.id);

      if (updErr) throw new Error(`Error al actualizar BD: ${updErr.message}`);

      const ok = imagenesLocales.length;
      const tot = producto.imagenes_urls.length;
      console.log(
        `    ✅  ${ok}/${tot} imágenes migradas correctamente${erroresFoto > 0 ? ` (${erroresFoto} con error)` : ''}`,
      );
    } catch (prodErr) {
      const detalle = prodErr instanceof Error ? prodErr.message : String(prodErr);
      console.error(`    ❌  Error en producto #${producto.id}: ${detalle}`);
      errores.push({ id: producto.id, nombre: producto.nombre, detalle });
    }
  }

  // ─── Resumen final ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('📊  RESUMEN FINAL');
  console.log('═'.repeat(60));
  console.log(`   Total procesados : ${candidatos.length}`);
  console.log(`   Con errores       : ${errores.length}`);
  console.log(`   Exitosos          : ${candidatos.length - errores.length}`);

  if (errores.length > 0) {
    console.log('\n⚠️   Productos con errores:');
    errores.forEach((e) => console.log(`   • #${e.id} "${e.nombre}" → ${e.detalle}`));
    console.log('');
    process.exit(1);
  }

  console.log('\n🎉  Migración completada sin errores.\n');
}

main().catch((e) => {
  console.error('❌  Error fatal:', e);
  process.exit(1);
});

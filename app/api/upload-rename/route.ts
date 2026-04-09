/**
 * Al cambiar el nombre del producto en el admin, el slug de archivos y carpeta debe coincidir.
 * Renombra el directorio `uploads/productos/{oldSlug}-{id}` → `{newSlug}-{id}` y prefijos en .webp.
 * Si no existe carpeta local (solo URLs legacy), responde success sin error.
 */
import { readdir, rename as fsRename } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { slugify } from '@/app/lib/utils';

export const runtime = 'nodejs';

function uploadRootDir(): string {
  const raw = process.env.UPLOAD_DIR?.trim() || 'uploads';
  const normalized = raw.replace(/^\.\//, '');
  return path.resolve(normalized);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Índice de foto N en `slug-N-thumb.webp` o `slug-N-<hash>-thumb.webp`. */
function extractSlot(filename: string, slug: string): number {
  const m = filename.match(new RegExp(`^${escapeRegex(slug)}-(\\d+)-`));
  return m ? parseInt(m[1], 10) : 99999;
}

type Body = {
  producto_id: string | number;
  nombre_anterior: string;
  nombre_nuevo: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const { producto_id, nombre_anterior, nombre_nuevo } = body;

    if (producto_id == null || String(producto_id).trim() === '') {
      return NextResponse.json({ success: false, error: 'producto_id es obligatorio' }, { status: 400 });
    }

    const id = String(producto_id).trim();
    const oldSlug = slugify(String(nombre_anterior || '').trim());
    const newSlug = slugify(String(nombre_nuevo || '').trim());

    if (!oldSlug || !newSlug) {
      return NextResponse.json(
        { success: false, error: 'Los nombres deben generar slug válido' },
        { status: 400 },
      );
    }

    if (oldSlug === newSlug) {
      return NextResponse.json({
        success: true,
        changed: false,
        imagenes_locales: null as { thumb: string; detail: string }[] | null,
      });
    }

    const root = path.join(uploadRootDir(), 'productos');
    const oldDir = path.join(root, `${oldSlug}-${id}`);
    const newDir = path.join(root, `${newSlug}-${id}`);

    if (!existsSync(oldDir)) {
      return NextResponse.json({
        success: true,
        changed: false,
        imagenes_locales: null,
        message: 'No hay carpeta local para este producto',
      });
    }

    if (existsSync(newDir)) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una carpeta con el nuevo nombre' },
        { status: 409 },
      );
    }

    await fsRename(oldDir, newDir);

    let inner = await readdir(newDir);
    for (const f of inner) {
      if (!f.endsWith('.webp')) continue;
      if (f.startsWith(`${oldSlug}-`)) {
        const rest = f.slice(oldSlug.length + 1);
        await fsRename(path.join(newDir, f), path.join(newDir, `${newSlug}-${rest}`));
      }
    }

    inner = await readdir(newDir);
    const thumbs = inner
      .filter((f) => f.includes('-thumb.webp'))
      .sort((a, b) => {
        const na = extractSlot(a, newSlug);
        const nb = extractSlot(b, newSlug);
        if (na !== nb) return na - nb;
        return a.localeCompare(b);
      });

    const publicBase = `/uploads/productos/${newSlug}-${id}`;
    const imagenes_locales: { thumb: string; detail: string }[] = [];
    for (const tf of thumbs) {
      const df = tf.replace('-thumb.webp', '-detail.webp');
      imagenes_locales.push({
        thumb: `${publicBase}/${tf}`,
        detail: `${publicBase}/${df}`,
      });
    }

    return NextResponse.json({
      success: true,
      changed: true,
      imagenes_locales,
      folder: publicBase,
    });
  } catch (e) {
    console.error('[api/upload-rename]', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al renombrar' },
      { status: 500 },
    );
  }
}

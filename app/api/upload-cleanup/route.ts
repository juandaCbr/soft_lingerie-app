/**
 * POST /api/upload-cleanup
 *
 * Sincroniza el disco con lo que quedó guardado en `imagenes_locales` tras editar un producto.
 *
 * Contexto: /api/upload solo añade pares thumb/detail; al quitar fotos en el admin, la BD
 * se actualiza pero los .webp viejos seguían en uploads/productos/{slug}-{id}/. Esta ruta
 * borra cualquier archivo .webp en esa carpeta que NO esté referenciado en el array
 * `imagenes_locales` que acabamos de persistir (fuente de verdad = lo que envía el formulario).
 *
 * Se llama después de un UPDATE exitoso en `productos` para no dejar huérfanos si falla el guardado.
 * Si falla la limpieza, el producto ya está bien en BD; solo quedan archivos sobrantes en disco.
 */
import { readdir, unlink } from 'fs/promises';
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

function basenameFromPublicPath(u: string): string | null {
  const s = String(u || '').trim();
  if (!s) return null;
  const parts = s.split('/').filter(Boolean);
  const name = parts[parts.length - 1];
  return name || null;
}

type Body = {
  producto_id: string | number;
  nombre_producto: string;
  imagenes_locales: { thumb: string; detail: string }[] | null | undefined;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const { producto_id, nombre_producto, imagenes_locales } = body;

    if (producto_id == null || String(producto_id).trim() === '') {
      return NextResponse.json({ success: false, error: 'producto_id es obligatorio' }, { status: 400 });
    }

    const id = String(producto_id).trim();
    const slug = slugify(String(nombre_producto || '').trim());
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'nombre_producto no genera un slug válido' },
        { status: 400 },
      );
    }

    // Nombres de archivo a conservar (thumb + detail por cada entrada del array).
    const keep = new Set<string>();
    const list = Array.isArray(imagenes_locales) ? imagenes_locales : [];
    for (const row of list) {
      if (!row || typeof row !== 'object') continue;
      const t = basenameFromPublicPath((row as { thumb?: string }).thumb || '');
      const d = basenameFromPublicPath((row as { detail?: string }).detail || '');
      if (t) keep.add(t);
      if (d) keep.add(d);
    }

    const dir = path.join(uploadRootDir(), 'productos', `${slug}-${id}`);
    if (!existsSync(dir)) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        skipped: true,
        message: 'No hay carpeta local; nada que limpiar',
      });
    }

    const entries = await readdir(dir);
    const removed: string[] = [];
    // Solo .webp gestionados por esta app; otros tipos no se tocan.
    for (const name of entries) {
      if (!name.endsWith('.webp')) continue;
      if (keep.has(name)) continue;
      await unlink(path.join(dir, name));
      removed.push(name);
    }

    return NextResponse.json({
      success: true,
      deleted: removed.length,
      removed,
    });
  } catch (e) {
    console.error('[api/upload-cleanup]', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Error al limpiar archivos' },
      { status: 500 },
    );
  }
}

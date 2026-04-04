import { mkdir, readdir, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { slugify } from '@/app/lib/utils';

/** sharp requiere runtime Node (no Edge). */
export const runtime = 'nodejs';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);

type FileError = { index: number; message: string };

function uploadRootDir(): string {
  const raw = process.env.UPLOAD_DIR?.trim() || 'uploads';
  const normalized = raw.replace(/^\.\//, '');
  return path.join(process.cwd(), normalized);
}

/**
 * POST multipart → guarda en disco en uploads/productos/{slug}-{producto_id}/
 * Campos: nombre_producto, producto_id, files; opcional indice_inicio (default 1).
 *
 * No elimina archivos previos: al quitar/reemplazar fotos en el admin, el borrado en disco lo hace
 * POST /api/upload-cleanup tras guardar el producto (sincroniza carpeta con imagenes_locales).
 */
export async function POST(request: NextRequest) {
  let destDir: string | null = null;
  let createdNewFolder = false;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type debe ser multipart/form-data' },
        { status: 415 },
      );
    }

    const formData = await request.formData();
    const nombreRaw = formData.get('nombre_producto');
    const productoIdRaw = formData.get('producto_id');

    if (typeof nombreRaw !== 'string' || !nombreRaw.trim()) {
      return NextResponse.json(
        { success: false, error: 'nombre_producto es obligatorio' },
        { status: 400 },
      );
    }

    if (productoIdRaw == null || String(productoIdRaw).trim() === '') {
      return NextResponse.json(
        { success: false, error: 'producto_id es obligatorio' },
        { status: 400 },
      );
    }

    const productoId = String(productoIdRaw).trim();
    const indiceInicioRaw = formData.get('indice_inicio');
    let indiceInicio = 1;
    if (typeof indiceInicioRaw === 'string' && indiceInicioRaw.trim() !== '') {
      const parsed = parseInt(indiceInicioRaw, 10);
      if (!Number.isNaN(parsed) && parsed >= 1) {
        indiceInicio = parsed;
      }
    }

    const files = formData.getAll('files').filter((x): x is File => x instanceof File);
    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere al menos una imagen en el campo files',
        },
        { status: 400 },
      );
    }

    const fileErrors: FileError[] = [];
    const buffers: Buffer[] = [];

    for (let i = 0; i < files.length; i++) {
      const index = i + 1;
      const file = files[i];

      if (!(file instanceof File)) {
        fileErrors.push({ index, message: 'La entrada no es un archivo válido' });
        continue;
      }

      if (file.size === 0) {
        fileErrors.push({ index, message: 'El archivo está vacío' });
        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        fileErrors.push({
          index,
          message: `El archivo supera el límite de ${MAX_FILE_BYTES / (1024 * 1024)}MB`,
        });
        continue;
      }

      const mime = (file.type || '').toLowerCase();
      if (!mime || !ALLOWED_MIME.has(mime)) {
        fileErrors.push({
          index,
          message: 'Tipo no permitido (use JPEG, PNG, GIF, WebP o AVIF)',
        });
        continue;
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const meta = await sharp(buffer).metadata();
        if (!meta.width || !meta.height) {
          fileErrors.push({
            index,
            message: 'Imagen inválida: no se pudieron obtener dimensiones',
          });
          continue;
        }
        buffers.push(buffer);
      } catch {
        fileErrors.push({
          index,
          message: 'No se pudo leer la imagen (archivo corrupto o no válido)',
        });
      }
    }

    if (fileErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Uno o más archivos no superaron la validación',
          errors: fileErrors,
        },
        { status: 400 },
      );
    }

    const slug = slugify(nombreRaw.trim());
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'nombre_producto no genera un slug válido para la URL' },
        { status: 400 },
      );
    }

    const folderName = `${slug}-${productoId}`;
    destDir = path.join(uploadRootDir(), 'productos', folderName);
    if (!existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
      createdNewFolder = true;
    }

    const publicBase = `/uploads/productos/${folderName}`;
    const imagenesLocales: { thumb: string; detail: string }[] = [];

    for (let i = 0; i < buffers.length; i++) {
      const n = indiceInicio + i;
      const thumbName = `${slug}-${n}-thumb.webp`;
      const detailName = `${slug}-${n}-detail.webp`;
      const buffer = buffers[i]!;

      try {
        const thumbBuf = await sharp(buffer)
          .resize({ width: 350, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();

        const detailBuf = await sharp(buffer)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();

        await writeFile(path.join(destDir, thumbName), thumbBuf);
        await writeFile(path.join(destDir, detailName), detailBuf);

        imagenesLocales.push({
          thumb: `${publicBase}/${thumbName}`,
          detail: `${publicBase}/${detailName}`,
        });
      } catch (perFileErr) {
        if (createdNewFolder && indiceInicio === 1) {
          await rm(destDir!, { recursive: true, force: true }).catch(() => {});
        }
        const detail =
          perFileErr instanceof Error ? perFileErr.message : 'Error desconocido';
        console.error('[api/upload] process index', n, perFileErr);
        return NextResponse.json(
          {
            success: false,
            error: `Falló el procesamiento de la imagen en la posición ${n}`,
            failedIndex: n,
            detail,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      imagenes_locales: imagenesLocales,
      folder: publicBase,
    });
  } catch (err) {
    if (destDir && createdNewFolder) {
      await rm(destDir, { recursive: true, force: true }).catch(() => {});
    }
    console.error('[api/upload]', err);
    const message = err instanceof Error ? err.message : 'Error interno al procesar la subida';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

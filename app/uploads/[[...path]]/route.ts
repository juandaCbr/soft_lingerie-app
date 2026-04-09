import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

function uploadRootDir(): string {
  const raw = process.env.UPLOAD_DIR?.trim() || 'uploads';
  const normalized = raw.replace(/^\.\//, '');
  return path.resolve(process.cwd(), normalized);
}

/**
 * Sirve archivos bajo UPLOAD_DIR para URLs /uploads/...
 * Sin este handler, /uploads/* devuelve 404 (la carpeta no está en public/).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!segments?.length) {
    return new Response('Not Found', { status: 404 });
  }

  const root = uploadRootDir();
  const resolvedRoot = path.resolve(root);
  const requested = path.resolve(path.join(root, ...segments));

  const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
  if (requested !== resolvedRoot && !requested.startsWith(rootWithSep)) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const buf = await readFile(requested);
    const ext = path.extname(requested).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Sin `immutable`: al reemplazar una imagen en el mismo slot, la URL en BD cambia (sufijo único
        // en /api/upload); si algún cliente aún pidiera la misma ruta, puede revalidar.
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}

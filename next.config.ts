import type { NextConfig } from 'next';

/**
 * /uploads/* no vive en public/: lo sirve `app/uploads/[[...path]]/route.ts` leyendo UPLOAD_DIR.
 * next/image con optimización puede pedir la imagen al mismo host; localhost y SITE_URL deben estar permitidos.
 */
const remotePatterns: Array<{
  protocol: 'http' | 'https';
  hostname: string;
  port: string;
  pathname: string;
}> = [
  {
    protocol: 'https',
    hostname: '**.supabase.co',
    port: '',
    pathname: '/storage/v1/object/public/**',
  },
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '3000',
    pathname: '/uploads/**',
  },
  {
    protocol: 'http',
    hostname: '127.0.0.1',
    port: '3000',
    pathname: '/uploads/**',
  },
];

if (process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SITE_URL);
    remotePatterns.push({
      protocol: u.protocol === 'https:' ? 'https' : 'http',
      hostname: u.hostname,
      port: u.port || '',
      pathname: '/uploads/**',
    });
  } catch {
    /* ignore */
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    localPatterns: [
      { pathname: '/images/**', search: '' },
      { pathname: '/uploads/**', search: '' },
    ],
  },
};

export default nextConfig;

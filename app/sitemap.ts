import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { slugify } from './lib/utils'
import { getSiteUrl } from './lib/site-url'
import { getTallasDisponibles } from './lib/catalogo-tallas'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()

  // 1. Obtener todos los productos activos para generar sus URLs.
  // Ojo: `productos` no tiene columna updated_at; pedirla hacía fallar la consulta y el sitemap
  // quedaba sin ningún producto. Se usa created_at.
  const { data: productos, error } = await supabaseAdmin
    .from('productos')
    .select('id, nombre, created_at')
    .eq('activo', true)
  if (error) console.error('[sitemap] productos:', error.message)

  const productUrls = (productos || []).map((prod) => ({
    url: `${baseUrl}/productos/${slugify(prod.nombre)}-${prod.id}`,
    lastModified: new Date(prod.created_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // 2. Páginas estáticas principales
  const staticUrls = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/productos`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/rastreo`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contacto`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ]

  // 3. Catálogo por tallas: /tallas y una página por talla con prendas disponibles
  const tallas = await getTallasDisponibles().catch(() => [])
  const tallaUrls = [
    { url: `${baseUrl}/tallas`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 },
    ...tallas.map((t) => ({
      url: `${baseUrl}/tallas/${t.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ]

  return [...staticUrls, ...tallaUrls, ...productUrls]
}

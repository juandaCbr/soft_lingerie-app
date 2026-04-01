import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { slugify } from './lib/utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://soft-lingerie-app.vercel.app'

  // 1. Obtener todos los productos activos para generar sus URLs
  const { data: productos } = await supabaseAdmin
    .from('productos')
    .select('id, nombre, updated_at')
    .eq('activo', true)

  const productUrls = (productos || []).map((prod) => ({
    url: `${baseUrl}/productos/${slugify(prod.nombre)}-${prod.id}`,
    lastModified: new Date(prod.updated_at || new Date()),
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

  return [...staticUrls, ...productUrls]
}

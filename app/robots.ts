import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/login',
        '/verificar',
        '/gracias'
      ],
    },
    sitemap: 'https://soft-lingerie-app.vercel.app/sitemap.xml',
  }
}

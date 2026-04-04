# Soft Lingerie App

Tienda en línea construida con Next.js: catálogo, carrito, checkout con Wompi y panel administrativo.

**Autor:** Juan David Cabrera Salas — [juandacabrera178@gmail.com](mailto:juandacabrera178@gmail.com)

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior (recomendado)
- npm (incluido con Node)
- Cuenta [Supabase](https://supabase.com/) y proyecto configurado
- Cuenta [Wompi](https://wompi.co/) para pagos (claves de prueba o producción)

## Instalación

1. Clona el repositorio e instala dependencias:

```bash
git clone <url-del-repositorio>
cd soft_lingerie-app
npm install
```

2. Crea el archivo de entorno a partir del ejemplo:

**Windows (PowerShell)**

```powershell
Copy-Item .env_example .env
```

**macOS / Linux**

```bash
cp .env_example .env
```

3. Abre `.env` y sustituye cada valor placeholder por tus credenciales reales (Supabase, Wompi, etc.). Las variables están comentadas en `.env_example` para orientarte.

4. En el panel de Supabase, en **Authentication → URL Configuration**, añade la URL de tu app (por ejemplo `http://localhost:3000` y la de producción) en **Redirect URLs** si usas recuperación de contraseña o registro desde checkout.

## Variables de entorno (resumen)

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo servidor: APIs checkout, admin) |
| `NEXT_PUBLIC_WOMPI_*`, `WOMPI_*` | Integración de pagos Wompi |
| `PUSHOVER_*` | Notificaciones (opcional) |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio |
| `UPLOAD_DIR` | Ruta local para subidas de imágenes |

No subas `.env` al repositorio; solo `.env_example` sirve como plantilla.

## Scripts

```bash
npm run dev    # Servidor de desarrollo → http://localhost:3000
npm run build  # Compilación de producción
npm run start  # Ejecutar build en producción
npm run lint   # ESLint
```

## Despliegue

Genera un build con `npm run build`, configura las mismas variables de entorno en tu proveedor (Vercel, etc.) y asegúrate de que `NEXT_PUBLIC_SITE_URL` apunte al dominio público.

## Licencia

Privado / según el repositorio.

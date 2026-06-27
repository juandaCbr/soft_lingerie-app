# AGENTS.md — Soft Lingerie App

Guía de contexto para agentes de IA que trabajen en este repositorio. Describe el stack, la arquitectura, flujos críticos y convenciones del proyecto.

---

## Resumen del producto

**Soft Lingerie** es una tienda en línea de lencería (Valledupar, Colombia) con:

- Catálogo público con filtros
- Carrito (invitado o autenticado)
- Checkout en dos pasos con pasarela **Wompi** (Colombia)
- Panel administrativo (`/admin`) para productos, pedidos, colores y estadísticas
- Rastreo de pedidos y notificaciones push al admin tras ventas

Idioma de la UI y contenido: **español (Colombia, `es_CO`)**. Moneda: **COP**.

---

## Stack tecnológico

| Capa           | Tecnología                                                  |
| -------------- | ----------------------------------------------------------- |
| Framework      | **Next.js 16** (App Router)                                 |
| UI             | **React 19**, **Tailwind CSS 4**                            |
| Lenguaje       | **TypeScript**                                              |
| Backend / DB   | **Supabase** (PostgreSQL + Auth + Realtime + Storage)       |
| Pagos          | **Wompi** (Colombia)                                        |
| Estado cliente | **React Context** (`CartContext`) + **SWR** (donde aplique) |
| Imágenes       | **sharp** (procesamiento local), `next/image`               |
| Notificaciones | **Pushover** y/o **ntfy** (opcional)                        |
| Analytics      | **Google Analytics** (`NEXT_PUBLIC_GA_ID`)                  |
| Iconos         | **lucide-react**                                            |
| Toasts         | **react-hot-toast**                                         |

**Runtime:** Node.js 20+. Scripts: `npm run dev`, `build`, `start`, `lint`, `migrate:images`.

---

## Estructura del proyecto

```
soft_lingerie-app/
├── app/                    # App Router (páginas, layouts, API routes)
│   ├── page.tsx            # Home (SSR + ISR revalidate=60)
│   ├── layout.tsx          # Layout raíz: Navbar, Footer, CartProvider, Wompi widget
│   ├── globals.css
│   ├── productos/          # Catálogo y detalle de producto
│   ├── carrito/
│   ├── checkout/           # Checkout de 2 pasos (cliente)
│   ├── gracias/            # Confirmación post-pago
│   ├── rastreo/            # Consulta de pedidos
│   ├── contacto/
│   ├── login/ | registro/ | verificar/
│   ├── admin/              # Panel admin (protegido por proxy.ts)
│   ├── api/                # Route Handlers (pagos, Wompi, admin, upload, cron)
│   ├── lib/                # Utilidades compartidas (Supabase helpers, catálogo, Wompi, imágenes)
│   └── uploads/[[...path]]/ # Sirve imágenes locales desde UPLOAD_DIR
├── components/             # Componentes reutilizables
│   ├── checkout/           # Sub-componentes del checkout
│   ├── home/               # Secciones de la home
│   └── admin/              # UI admin (paginación, etc.)
├── context/
│   └── CartContext.tsx     # Carrito global
├── public/                 # Assets estáticos
├── scripts/                # Utilidades puntuales
├── utils/                  # Migración de imágenes
├── proxy.ts                # Protección /admin + refresh sesión Supabase SSR
├── next.config.ts
└── .env_example            # Plantilla de variables (copiar a .env)
```

**Alias de imports:** `@/` apunta a la raíz del proyecto (`tsconfig.json`).

---

## Páginas (rutas)

### Públicas (tienda)

| Ruta              | Descripción                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| `/`               | Home: hero, favoritos, novedades. Datos server-side con ISR.                         |
| `/productos`      | Catálogo con filtros (talla, color, precio, categoría). `CatalogoClient`.            |
| `/productos/[id]` | Detalle de producto: variantes por color, tallas, stock, guía de tallas.             |
| `/carrito`        | Resumen del carrito antes del checkout.                                              |
| `/checkout`       | **Checkout en 2 pasos** (envío → pago). Ver sección dedicada.                        |
| `/gracias`        | Página de éxito; limpia carrito y llama `/api/wompi/confirm` si viene de PSE/hosted. |
| `/rastreo`        | Busca pedidos por referencia Wompi, guía o email en `ventas_realizadas`.             |
| `/contacto`       | Formulario/información de contacto.                                                  |
| `/login`          | Auth Supabase (`signInWithPassword`).                                                |
| `/registro`       | Registro + fila en `perfiles`.                                                       |
| `/verificar`      | Verificación de email post-registro.                                                 |

### Admin (requiere `perfiles.es_admin = true`)

| Ruta                           | Descripción                                                    |
| ------------------------------ | -------------------------------------------------------------- |
| `/admin`                       | Dashboard con KPIs y Realtime sobre `ventas_realizadas`.       |
| `/admin/productos`             | Listado, duplicar, eliminar productos.                         |
| `/admin/productos/nuevo`       | Crear producto (colores, tallas, imágenes).                    |
| `/admin/productos/editar/[id]` | Editar producto existente.                                     |
| `/admin/pedidos`               | Gestión de ventas (marcar pagada, eliminar pendientes, envío). |
| `/admin/colores`               | CRUD de colores.                                               |
| `/admin/estadisticas`          | Estadísticas de ventas.                                        |

**Protección:** `proxy.ts` (convención Next.js 16, sustituye `middleware.ts`) redirige a `/login` si no hay sesión y a `/` si el usuario no es admin.

---

## Componentes principales

### Layout global

- `components/Navbar.tsx` — Navegación, carrito, auth, enlace admin.
- `components/SiteFooter.tsx` — Pie de sitio.
- `components/GoogleAnalytics.tsx` — GA condicional.
- `components/AdminButton.tsx` — Botón admin visible solo si `perfiles.es_admin`.

### Catálogo y producto

- `components/ProductoCard.tsx` — Tarjeta de producto (variantes agrupadas por `grupo_id`).
- `components/SizeGuideModal.tsx` — Guía de tallas.
- `app/productos/CatalogoClient.tsx` — Cliente del catálogo con filtros.
- `app/productos/[id]/ProductClient.tsx` — Detalle interactivo.

### Home

- `components/home/HomeHero.tsx`, `HomeFavoritosSection.tsx`, `HomeNovedadesSection.tsx`, `HomeProductCard.tsx`, `HomePageClosing.tsx`.
- `app/HomeClient.tsx` — Orquestador cliente de la home.

### Checkout (modular)

- `components/checkout/CheckoutPageHeader.tsx`
- `components/checkout/CheckoutShippingForm.tsx` — Paso 1: datos de envío.
- `components/checkout/CheckoutPaymentStep.tsx` — Paso 2: selección de método + `BotonWompi`.
- `components/checkout/CheckoutOrderSummary.tsx` — Resumen lateral.
- `components/checkout/CheckoutPaymentTrustBar.tsx`
- `components/checkout/CheckoutPaymentDetailPanels.tsx` — Campos por método (tarjeta, Nequi, PSE).
- `components/BotonWompi.tsx` — Orquesta pago, polling, Realtime y confirmación.

### Admin

- `components/admin/AdminPaginationBar.tsx`
- `app/hooks/useAdminListPagination.ts`

---

## Integración con Supabase

### Clientes Supabase (3 contextos)

1. **Browser** — `app/lib/supabase.ts`  
   `createBrowserClient` de `@supabase/ssr`. Usado en componentes cliente (carrito, checkout, admin UI, auth).

2. **Server (proxy)** — `proxy.ts`  
   `createServerClient` con cookies `getAll`/`setAll` para refrescar sesión en rutas `/admin`.

3. **Service role (servidor)** — Route Handlers y páginas server  
   `createClient(url, SUPABASE_SERVICE_ROLE_KEY)` en APIs sensibles (`/api/pagos`, `/api/wompi/*`, home SSR, sitemap, etc.).

### Tablas PostgreSQL usadas en la app

| Tabla               | Uso                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `productos`         | Catálogo: nombre, precio, stock, categoría, `grupo_id`, `imagenes_locales`, `imagenes_urls`, `activo`, `destacado_home`.                                            |
| `producto_colores`  | Relación producto ↔ color.                                                                                                                                          |
| `producto_tallas`   | Stock por talla (`stock_talla`).                                                                                                                                    |
| `colores`           | Paleta de colores (`nombre`, `hex`, `activo`).                                                                                                                      |
| `tallas`            | Tallas ordenadas (`orden`).                                                                                                                                         |
| `categorias`        | Categorías de producto.                                                                                                                                             |
| `carrito`           | Ítems por `user_id` (solo usuarios autenticados).                                                                                                                   |
| `ventas_realizadas` | Pedidos: cliente, envío, `monto_total`, `estado_pago`, `referencia_wompi`, `detalle_compra` (JSON), logística (`estado_logistico`, `numero_guia`, `empresa_envio`). |
| `perfiles`          | Perfil de usuario; campo `es_admin` para acceso admin.                                                                                                              |

### Auth

- Registro/login con Supabase Auth.
- Perfil en tabla `perfiles` (no solo metadata de auth).
- Redirect URLs configuradas en Supabase Dashboard para local/producción.

### Realtime

- `BotonWompi`: escucha `UPDATE` en `ventas_realizadas` para confirmación instantánea de pago.
- Dashboard admin: escucha cambios en `ventas_realizadas`.

### Storage

- Bucket `productos` en Supabase Storage (usado en edición de productos admin).
- Imágenes principales del catálogo: **`imagenes_locales`** en disco local (`UPLOAD_DIR`) servidas vía `/uploads/*`.

---

## Pasarela de pago: Wompi

**Proveedor:** [Wompi Colombia](https://wompi.co/) — pagos en COP.

### Variables de entorno

```
NEXT_PUBLIC_WOMPI_PUBLIC_KEY
NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET
NEXT_PUBLIC_WOMPI_API_URL          # https://api.wompi.co/v1
WOMPI_PRIVATE_KEY                  # Solo servidor
WOMPI_EVENTS_SECRET                # Validación webhook
```

### Métodos de pago soportados

| Método               | Flujo                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| **Tarjeta** (`CARD`) | Tokenización en cliente → transacción vía API (`POST /api/pagos` → Wompi `/transactions`). |
| **Nequi** (`NEQUI`)  | Push a la app Nequi → polling cada 3s hasta `APPROVED`.                                    |
| **PSE** (`PSE`)      | **Checkout Web Hosted** de Wompi: redirección a `checkout.wompi.co/p/...`.                 |
| **Bancolombia**      | Mismo flujo hosted que PSE (si se habilita en UI).                                         |

El widget `https://checkout.wompi.co/widget.js` se carga en `app/layout.tsx` (`beforeInteractive`).

### Flujo de confirmación de pago (triple vía)

1. **Webhook** — `POST /api/wompi/webhook`  
   Evento `transaction.updated` con `status === APPROVED`. Valida checksum con `WOMPI_EVENTS_SECRET`.

2. **Confirmación cliente** — `POST /api/wompi/confirm`  
   Fallback cuando el webhook falla o tarda. Consulta transacción en Wompi y procesa idempotentemente.

3. **Realtime + polling** — En `BotonWompi`: suscripción Supabase + polling a Wompi API.

**Procesamiento central:** `app/lib/procesar-pedido-wompi-aprobado.ts`

- Marca `estado_pago: APROBADO` (solo si estaba `PENDIENTE`)
- Descuenta stock (`app/lib/ventas-detalle-stock.ts`)
- Notifica admin (ntfy / Pushover)
- Idempotente: re-ejecuciones no duplican descuento de stock

---

## Tipo de checkout

**Modelo:** Checkout **custom de 2 pasos en una sola página** (`/checkout`), no checkout alojado completo de Wompi (excepto PSE/Bancolombia).

### Paso 1 — Datos de envío (`CheckoutShippingForm`)

- Nombre, email, teléfono, departamento/ciudad (datos Colombia en `app/lib/colombia.ts`).
- Dirección, barrio, apartamento.
- Método de envío: `INCLUIDO` (cobra envío) u otro según UI.
- **Costos de envío:** Valledupar $6.000 COP; resto de ciudades $18.000 COP.
- Al enviar: inserta/actualiza fila en `ventas_realizadas` con `estado_pago: PENDIENTE` y `referencia_wompi` única (`SOFT-{timestamp}-{random}`).

### Paso 2 — Pago (`CheckoutPaymentStep` + `BotonWompi`)

- Usuario elige método (tarjeta, PSE, Nequi).
- `BotonWompi` llama `POST /api/pagos` con referencia, monto, datos de cliente.
- Éxito → redirect a `/gracias?ref=...&city=...` y vaciado de carrito.

### Detalle del pedido

Guardado como JSON en `ventas_realizadas.detalle_compra`: líneas de producto (id, nombre, precio, quantity, talla, color, imágenes) + línea de envío (`es_envio: true`).

### Carrito

- **Invitado:** `localStorage` key `soft_cart`.
- **Autenticado:** tabla `carrito` en Supabase sincronizada con estado local.
- Validación de stock por `producto_tallas.stock_talla`.

---

## API Routes

| Ruta                                  | Método | Propósito                                                     |
| ------------------------------------- | ------ | ------------------------------------------------------------- |
| `/api/pagos`                          | POST   | Crear transacción Wompi (tarjeta, Nequi, URL hosted PSE).     |
| `/api/wompi/webhook`                  | POST   | Webhook de eventos Wompi.                                     |
| `/api/wompi/confirm`                  | POST   | Confirmación manual/fallback de pago aprobado.                |
| `/api/upload`                         | POST   | Subida de imágenes de producto (sharp → thumb + detail WebP). |
| `/api/upload-rename`                  | POST   | Renombrar archivos de imagen.                                 |
| `/api/upload-cleanup`                 | POST   | Sincronizar carpeta de imágenes con DB.                       |
| `/api/admin/producto-delete`          | POST   | Eliminar producto (admin).                                    |
| `/api/admin/producto-duplicate`       | POST   | Duplicar producto.                                            |
| `/api/admin/venta-marcar-pagada`      | POST   | Marcar venta como pagada manualmente.                         |
| `/api/admin/venta-eliminar-pendiente` | POST   | Eliminar venta pendiente.                                     |
| `/api/admin/revalidate-display`       | POST   | Revalidar caché ISR tras cambios admin.                       |
| `/api/cron/rastreo`                   | GET    | Cron de rastreo logístico (`?key=CRON_SECRET`).               |
| `/uploads/[[...path]]`                | GET    | Servir imágenes locales.                                      |

---

## Imágenes

- **Subida:** `POST /api/upload` → `UPLOAD_DIR/productos/{slug}-{id}/` con variantes `thumb` (250px) y `detail` (700px, ≤100KB WebP) vía `app/lib/product-image-sharp.ts`.
- **Referencias en DB:** campo JSON `imagenes_locales` en `productos` (`{ thumb, detail }[]`).
- **Helper:** `app/lib/image-helper.ts` — resuelve URL local vs Supabase Storage vs placeholder. inicialmente se usó Supabase Storage pero se cambió a local para optimizar el rendimiento y el uso de recursos.
- **next/image:** patrones remotos para Supabase Storage, localhost y `NEXT_PUBLIC_SITE_URL` en `next.config.ts`.

---

## SEO y metadatos

- `app/layout.tsx`: metadata global, Open Graph, `metadataBase`.
- Páginas con `generateMetadata` / `metadata` export: home, productos, detalle.
- `app/sitemap.ts` — URLs de productos activos.
- `app/robots.ts`
- JSON-LD Organization + WebSite en home.

---

## Estilo y UX

- **Paleta:** fondo `#fdf8f6`, texto/accent `#4a1d44` (morado vino).
- **Tipografías:** Inter (cuerpo), Playfair Display (títulos, variable `--font-playfair`).
- **Diseño:** bordes redondeados generosos, sombras suaves, estética boutique.
- Navbar fijo con padding superior en layout (`pt-16 md:pt-20`).

---

## Variables de entorno clave

Ver `.env_example` completo. Mínimas para desarrollo:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Wompi: claves públicas/privadas e integrity secret
- App: `NEXT_PUBLIC_SITE_URL`, `UPLOAD_DIR`
- Opcionales: `PUSHOVER_*`, `NTFY_*`, `NEXT_PUBLIC_GA_ID`, `CRON_SECRET`

**Nunca commitear `.env`.**

---

## Convenciones para agentes

1. **App Router:** preferir Server Components donde no haya interactividad; `"use client"` solo cuando haga falta.
2. **Supabase en servidor:** usar service role solo en Route Handlers o RSC; nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente.
3. **Admin:** toda ruta bajo `/admin` asume auth + `es_admin`; APIs admin validan sesión y perfil.
4. **Pagos:** cambios en checkout/Wompi deben mantener idempotencia en `procesarPedidoWompiAprobado`.
5. **Stock:** descontar solo vía `aplicarDescuentoStockDesdeDetalle`, no duplicar lógica.
6. **Imágenes:** nuevas subidas deben seguir el pipeline sharp existente y actualizar `imagenes_locales`.
7. **ISR:** home y catálogo usan `revalidate = 60`; tras cambios admin usar `/api/admin/revalidate-display`.
8. **Idioma:** UI y mensajes al usuario en español colombiano.
9. **Scope:** cambios mínimos y alineados con patrones existentes; no sobre-ingeniería.
10. **proxy.ts:** es el único lugar con `createServerClient`; el resto usa `createBrowserClient` en cliente.

---

## Flujo de compra (diagrama)

```
[Catálogo] → [Detalle] → [Carrito] → [Checkout paso 1: envío]
                                              ↓
                              INSERT ventas_realizadas (PENDIENTE)
                                              ↓
                              [Checkout paso 2: método de pago]
                                              ↓
                              POST /api/pagos → Wompi
                         ┌────────────┬──────────────┐
                    Tarjeta/Nequi    PSE/Bancolombia
                         │              (hosted redirect)
                         └──────┬───────────────┘
                                ↓
              Webhook / confirm / Realtime / polling
                                ↓
                    estado_pago = APROBADO + stock -
                                ↓
                         [/gracias] + notificación admin
```

---

## Comandos útiles

```bash
npm run dev          # Desarrollo en http://localhost:3000
npm run build        # Build producción
npm run lint         # ESLint
npm run migrate:images  # Migración de imágenes (utils/migrate-images.ts - legacy, se usó para migrar las imágenes de Supabase Storage a local)
```

---

## Archivos de referencia rápida

| Tema                              | Archivo(s)                                            |
| --------------------------------- | ----------------------------------------------------- |
| Checkout completo                 | `app/checkout/page.tsx`                               |
| Pago Wompi                        | `components/BotonWompi.tsx`, `app/api/pagos/route.ts` |
| Post-pago                         | `app/lib/procesar-pedido-wompi-aprobado.ts`           |
| Carrito                           | `context/CartContext.tsx`                             |
| Auth admin                        | `proxy.ts`                                            |
| Tipos catálogo                    | `app/lib/catalog-types.ts`                            |
| Tipos checkout                    | `components/checkout/checkout-types.ts`               |
| Colombia (departamentos/ciudades) | `app/lib/colombia.ts`                                 |

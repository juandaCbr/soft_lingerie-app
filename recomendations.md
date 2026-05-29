## Escala de prioridad usada

- **P0 (Critica / inmediata)**: impacto directo en conversion, SEO base o performance severa.
- **P1 (Alta)**: impacto fuerte, deberia entrar en proximos sprints.
- **P2 (Media)**: mejora relevante pero no bloqueante.
- **P3 (Baja / estrategica)**: nice-to-have o depende de etapas futuras.

---

## UX

### Navegacion y descubrimiento
1. **Breadcrumbs**
   - **Impresion**: mejora orientacion + enlazado interno; bajo riesgo de implementacion.
   - **Prioridad**: P1

2. **Buscador**
   - **Impresion**: alto impacto en descubrimiento y conversion (catalogos medianos/grandes).
   - **Prioridad**: P0

3. **Paginacion en catalogo**
   - **Impresion**: clave para rendimiento percibido y UX si hoy carga todo de golpe.
   - **Prioridad**: P0 (si carga todo); P2 (si ya pagina bien)

4. **Filtros activos visibles (chips)**
   - **Impresion**: reduce friccion y errores de navegacion filtrada.
   - **Prioridad**: P1

### Checkout y conversion
5. **Progress bar en checkout**
   - **Impresion**: mejora claridad del proceso, reduce abandono por incertidumbre.
   - **Prioridad**: P1

6. **Resumen de pedido siempre visible en mobile**
   - **Impresion**: impacto directo en confianza y decision final de compra.
   - **Prioridad**: P0

7. **Validacion de stock en tiempo real**
   - **Impresion**: evita frustracion y caidas tardias en conversion; mas complejo tecnicamente.
   - **Prioridad**: P1

8. **Autofill de direccion**
   - **Impresion**: quick win de UX (muy buena relacion impacto/esfuerzo).
   - **Prioridad**: P0

9. **Persistencia de carrito al cerrar pestana**
   - **Impresion**: basico de e-commerce; si falla, afecta fuerte retorno de usuarios.
   - **Prioridad**: P0 (validacion y hardening)

### Producto
10. **Zoom/lightbox de imagen**
    - **Impresion**: en lenceria es importante por textura/detalle; influye en conversion.
    - **Prioridad**: P1

11. **Guia de tallas contextual**
    - **Impresion**: reduce devoluciones y dudas; muy relevante para apparel.
    - **Prioridad**: P0

12. **Stock bajo ("quedan pocas unidades")**
    - **Impresion**: buen disparador de urgencia, pero debe ser veraz para no perder confianza.
    - **Prioridad**: P2

13. **Feedback de "agregado al carrito"**
    - **Impresion**: esencial de usabilidad; evita clics duplicados y confusion.
    - **Prioridad**: P0

### Mobile-first
14. **Bottom nav bar**
    - **Impresion**: puede mejorar navegacion frecuente en mobile, pero requiere buen diseno IA.
    - **Prioridad**: P2

15. **Swipe en galeria**
    - **Impresion**: comportamiento esperado en mobile; mejora natural de interaccion.
    - **Prioridad**: P1

16. **Sticky "Agregar al carrito"**
    - **Impresion**: de las mejoras mobile con mayor efecto en conversion.
    - **Prioridad**: P0

---

## Rendimiento / Velocidad

### Critico
1. **Quitar `force-dynamic` en ficha y pasar a ISR**
   - **Impresion**: probablemente el mayor cuello de botella real.
   - **Prioridad**: P0

2. **Admin pages client-side con Supabase directo**
   - **Impresion**: importante para panel, menos urgente para storefront publico.
   - **Prioridad**: P2 (P1 si el admin es usado intensivamente)

3. **Preload de imagenes criticas**
   - **Impresion**: mejora LCP si se aplica selectivamente (sin sobrecargar preload).
   - **Prioridad**: P1

4. **Optimizacion de font loading (Playfair pesos minimos)**
   - **Impresion**: quick win tecnico en LCP/CLS.
   - **Prioridad**: P0

5. **Bundle split de `react-colorful` (solo admin)**
   - **Impresion**: muy buena practica para separar publico/admin.
   - **Prioridad**: P1

6. **`colombia.ts` (1162 lineas) y code-splitting**
   - **Impresion**: importante confirmar scope de carga; puede penalizar JS inicial.
   - **Prioridad**: P1

### Moderado
7. **`next/image` `sizes` correctos**
   - **Impresion**: optimizacion clasica con impacto acumulado fuerte.
   - **Prioridad**: P1

8. **Uso de SWR con fallback/hidratacion**
   - **Impresion**: util, pero conviene despues de estabilizar SSR/ISR/cache base.
   - **Prioridad**: P2

9. **Caching sistematico de queries Supabase server**
   - **Impresion**: importante para latencia y costo; requiere diseno cuidadoso.
   - **Prioridad**: P1

10. **Eliminar `repomix-output.xml` del build/indexacion**
    - **Impresion**: higiene de repo/deploy; impacto tecnico bajo pero recomendable.
    - **Prioridad**: P2

11. **Mover script Wompi del layout global a checkout**
    - **Impresion**: gran impacto en bloqueo de render y CWV globales.
    - **Prioridad**: P0

12. **Skeletons en home**
    - **Impresion**: mejora performance percibida mas que real; util para UX.
    - **Prioridad**: P2

### Menor prioridad
13. **Compresion gzip/brotli**
    - **Impresion**: fundamental en infraestructura; suele ser quick win de alto impacto si no esta.
    - **Prioridad**: P0 (verificacion inmediata)

14. **HTTP/2 o HTTP/3**
    - **Impresion**: importante a nivel servidor/CDN, pero depende de hosting.
    - **Prioridad**: P2

15. **Service Worker / PWA**
    - **Impresion**: estrategico; no es lo primero para mejorar conversion inmediata.
    - **Prioridad**: P3

---

## SEO

### Critico
1. **JSON-LD `Product` con `offers`**
   - **Impresion**: absolutamente clave para rich results en e-commerce.
   - **Prioridad**: P0

2. **Metadata de producto completa (`description`, `og:image`, `keywords`)**
   - **Impresion**: basico SEO on-page por producto.
   - **Prioridad**: P0

3. **Canonical correcto en slug+ID**
   - **Impresion**: esencial para evitar dilucion por duplicados.
   - **Prioridad**: P0

4. **Redirecciones/canonical entre variantes (`grupo_id`)**
   - **Impresion**: critico para consolidar senales SEO.
   - **Prioridad**: P0

5. **Paginas de categorias**
   - **Impresion**: alto potencial de trafico long-tail y arquitectura SEO.
   - **Prioridad**: P1

6. **Blog/contenido editorial**
   - **Impresion**: gran valor a mediano plazo, menor urgencia tactica inmediata.
   - **Prioridad**: P2

### Moderado
7. **Alt text descriptivo**
   - **Impresion**: SEO + accesibilidad, bajo esfuerzo y efecto acumulado.
   - **Prioridad**: P1

8. **Jerarquia de headings (H1 unico)**
   - **Impresion**: higiene SEO basica, debe quedar correcta en todas las plantillas.
   - **Prioridad**: P1

9. **Internal linking con `<a href>` real**
   - **Impresion**: muy importante para crawlability y autoridad interna.
   - **Prioridad**: P1

10. **`robots.ts` bloquear rutas sin valor SEO**
    - **Impresion**: buena higiene de rastreo y presupuesto de crawl.
    - **Prioridad**: P1

11. **`sitemap` con `lastmod` real**
    - **Impresion**: mejora calidad de indexacion y actualizacion.
    - **Prioridad**: P1

12. **OG image por producto**
    - **Impresion**: mas social/CTR que SEO puro, pero valioso comercialmente.
    - **Prioridad**: P2

13. **`hreflang="es"`**
    - **Impresion**: util, aunque con un solo idioma su impacto es acotado.
    - **Prioridad**: P3

14. **Rich snippets de reviews (`AggregateRating`)**
    - **Impresion**: muy potente, pero depende de tener resenas reales confiables.
    - **Prioridad**: P2

15. **CWV como prioridad SEO**
    - **Impresion**: totalmente correcto; debe tratarse como linea transversal.
    - **Prioridad**: P0

---

## Lectura global (impresion final)

- El documento esta bien orientado y cubre los 3 frentes correctos: UX, rendimiento y SEO.
- Las recomendaciones mas valiosas son las que corrigen render/bloqueo global y SEO estructurado por producto.
- Hay varias quick wins de alto retorno (autofill, feedback carrito, fuentes, Wompi, metadata, JSON-LD).
- Algunas recomendaciones deberian ejecutarse solo tras validacion tecnica (paginacion real, carga real de `colombia.ts`, estado de compresion del servidor).

## Prioridad agregada sugerida (primera ola)

1. `force-dynamic` -> ISR en ficha producto (P0)
2. Script Wompi solo en checkout (P0)
3. JSON-LD `Product` + metadata/canonical variantes (P0)
4. Autofill + feedback "agregado" + resumen visible checkout (P0)
5. Optimizacion de fuentes + verificar compresion servidor (P0)
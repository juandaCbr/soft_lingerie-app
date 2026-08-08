# Backlog de mejoras — Soft Lingerie

Documento de trabajo para ejecutar mejoras de forma incremental. Esta lista se
revisó contra la implementación actual; no todo lo que figuraba en la versión
anterior continúa pendiente.

## Criterio de prioridad

- **P0 — inmediata:** mejora transversal de rendimiento, conversión o SEO técnico que afecta páginas públicas clave.
- **P1 — próximo sprint:** impacto comercial o de descubrimiento alto, sin bloquear la operación actual.
- **P2 — planificable:** mejora útil de UX, accesibilidad o escalabilidad; no urgente.
- **P3 — estratégica / condicional:** depende de métricas, contenido, hosting o una decisión de producto previa.

---

## P0 — Primera ola

### 1. Optimizar la imagen crítica de la home (LCP)

- **Estado:** pendiente.
- **Motivo:** el hero público usa una etiqueta `<img>` sin la optimización y prioridad de `next/image`.
- **Alcance futuro:** optimizar la imagen principal, sus dimensiones, `sizes` y prioridad sin deteriorar la composición visual.
- **Criterio de aceptación:** la imagen hero conserva calidad y no provoca salto de layout; queda correctamente priorizada en carga.

### 2. Definir la estrategia SEO de variantes por `grupo_id`

- **Estado:** requiere decisión de producto antes de desarrollar.
- **Decisión necesaria:** determinar si las variantes (por ejemplo, colores) son páginas comerciales independientes o representaciones del mismo producto.
- **Si son independientes:** mantener URL y canonical propios con contenido diferenciado.
- **Si son el mismo producto:** consolidar señal SEO con una URL canónica y las redirecciones necesarias.
- **Criterio de aceptación:** cada variante tiene una única estrategia de indexación coherente con sitemap, canonical y navegación.

---

## P1 — Próximo sprint

### 3. Crear páginas indexables por categoría

- **Estado:** pendiente.
- **Motivo:** hoy existen filtros de catálogo, pero no rutas orientadas a búsquedas por categoría.
- **Alcance futuro:** rutas, textos SEO, metadata, canonical, enlazado interno y sitemap para categorías reales del catálogo.
- **Criterio de aceptación:** cada categoría activa importante tiene URL propia, H1, metadata y productos pertinentes.

### 4. Añadir CTA sticky de “Añadir al carrito” en móvil

- **Estado:** pendiente.
- **Motivo:** el bloque de compra de la ficha es sticky desde desktop, no en móvil.
- **Alcance futuro:** barra fija móvil que respete la selección de talla, disponibilidad y el área segura del dispositivo.
- **Criterio de aceptación:** el CTA queda accesible al desplazarse, no tapa contenido ni el carrito y refleja correctamente el estado agotado.

### 5. Mostrar filtros activos como chips y permitir limpiarlos fácilmente

- **Estado:** pendiente.
- **Motivo:** los filtros ya se conservan en URL, pero falta una representación clara de la selección activa.
- **Criterio de aceptación:** cada filtro activo se puede identificar y retirar individualmente; existe una acción para restablecer todos.

### 6. Completar autocompletado nativo del checkout

- **Estado:** pendiente parcial.
- **Motivo:** email usa `autoComplete`, pero faltan atributos estándar para nombre, teléfono y dirección.
- **Alcance futuro:** aplicar atributos HTML de autocompletado. No incorporar todavía una API externa de direcciones.
- **Criterio de aceptación:** navegadores y gestores de direcciones completan los campos compatibles sin alterar la validación actual.

### 7. Ajustar rastreo SEO: robots y sitemap

- **Estado:** pendiente.
- **Motivo:** `/rastreo` aparece en sitemap aunque es una herramienta de consulta individual, y las fechas de páginas estáticas se regeneran como si siempre hubieran cambiado.
- **Criterio de aceptación:** el sitemap contiene solo URLs indexables y sus fechas reflejan cambios reales; robots bloquea rutas privadas o sin valor de búsqueda.

### 8. Mejorar texto alternativo de imágenes de producto

- **Estado:** pendiente parcial.
- **Motivo:** hoy el alt suele ser únicamente el nombre de la prenda.
- **Criterio de aceptación:** imágenes principales y miniaturas describen producto, color o vista cuando aporte información, sin repetir texto innecesariamente.

### 9. Añadir zoom/lightbox y gesto táctil a la galería

- **Estado:** pendiente.
- **Motivo:** la ficha tiene miniaturas y controles, pero no inspección ampliada ni interacción táctil explícita.
- **Criterio de aceptación:** en móvil se puede recorrer la galería de forma natural y ampliar una imagen sin afectar accesibilidad ni rendimiento.

---

## P2 — Planificable

### 10. Implementar paginación real del catálogo cuando el volumen lo justifique

- **Estado:** pendiente condicionado por tamaño del catálogo.
- **Nota:** ya existe carga progresiva visual, pero la consulta trae todos los productos.
- **Criterio para iniciar:** métricas o crecimiento del catálogo muestran impacto de transferencia, memoria o tiempo de filtrado.
- **Criterio de aceptación:** la consulta usa paginación/cursor, conserva filtros y URLs, y evita duplicados entre grupos.

### 11. Mejorar el resumen de pedido en móvil

- **Estado:** pendiente.
- **Nota:** el resumen ya es visible en checkout; esta mejora sería hacerlo más accesible durante el desplazamiento (por ejemplo, bloque colapsable o barra con total).
- **Criterio de aceptación:** el total y el enlace al detalle son accesibles sin tapar campos ni acciones de pago.

### 12. Mostrar breadcrumbs visibles en la interfaz

- **Estado:** pendiente parcial.
- **Nota:** ya existe `BreadcrumbList` en JSON-LD para buscadores.
- **Criterio de aceptación:** la ficha muestra Inicio → Catálogo → Producto mediante enlaces funcionales y sin duplicar el H1.

### 13. Añadir indicador de progreso del checkout

- **Estado:** pendiente.
- **Criterio de aceptación:** comunica de forma clara “Datos de envío” y “Pago”, con el paso actual accesible para lector de pantalla.

### 14. Revisar imágenes no críticas y uso de `next/image`

- **Estado:** pendiente.
- **Motivo:** carrito, checkout y algunas áreas secundarias aún usan `<img>`.
- **Criterio de aceptación:** se priorizan las superficies públicas de mayor tráfico y no se empeora el coste de JavaScript ni la experiencia admin.

### 15. Mensaje de stock bajo, basado en datos reales

- **Estado:** pendiente.
- **Criterio de aceptación:** se define un umbral por talla/variante y solo se muestra cuando el inventario fresco lo respalda.

### 16. Blog o contenido editorial

- **Estado:** pendiente.
- **Dependencia:** estrategia de contenidos, responsables y calendario de publicación.
- **Criterio de aceptación:** el contenido responde a intención de búsqueda real, enlaza a categorías o productos y cuenta con mantenimiento editorial.

---

## P3 — Estratégico o sujeto a validación

### 17. Navegación inferior móvil

- **Estado:** por validar con analítica y pruebas de UX.
- **Motivo:** puede beneficiar navegación recurrente, pero también competir con el carrito y el CTA de producto.

### 18. PWA / Service Worker

- **Estado:** estratégico.
- **Motivo:** no es una palanca inmediata de conversión; requiere definir el comportamiento offline y la estrategia de actualización.

### 19. Reviews y `AggregateRating`

- **Estado:** bloqueado hasta contar con reseñas reales y un proceso para moderarlas.

### 20. `hreflang`

- **Estado:** no prioritario mientras exista un único idioma/mercado.

### 21. Rendimiento de infraestructura: Brotli, HTTP/2 y HTTP/3

- **Estado:** requiere comprobar hosting/CDN de producción.
- **Nota:** no puede determinarse desde este repositorio. Verificar antes de programar cambios de aplicación.

### 22. Refactor de páginas admin a carga server-side

- **Estado:** mejora técnica opcional.
- **Motivo:** no impacta directamente la experiencia de compra pública.

### 23. Dividir `colombia.ts`

- **Estado:** no prioritario.
- **Motivo:** hoy se consume desde checkout, no desde home o catálogo. Considerar solo si las métricas del bundle de checkout lo justifican.

---

## Ya implementado — no planificar como trabajo nuevo

- Widget de Wompi cargado únicamente en `/checkout` con estrategia no bloqueante; los flujos de pago, webhook, descuento de stock y notificaciones no se modificaron.
- Ficha de producto con ISR de 60 segundos, caché de datos e invalidación desde administración.
- Buscador del catálogo con estado en URL.
- Carga progresiva visual de productos.
- Persistencia del carrito de invitado en `localStorage`.
- Validación de stock fresco al añadir al carrito y barrera atómica al descontar inventario.
- Feedback de producto añadido mediante toast.
- Guía de tallas disponible desde la ficha.
- Metadata por producto: descripción, canonical, Open Graph y Twitter.
- JSON-LD `Product` con oferta, precio, disponibilidad y breadcrumbs estructurados.
- Skeleton del catálogo.
- SWR con datos iniciales del servidor en catálogo.
- `sizes` y prioridad en imágenes principales de catálogo y ficha.
- Aislamiento por ruta de `react-colorful` en administración; no requiere code-splitting adicional ahora.

---

## Orden de ejecución sugerido

1. Imagen crítica y LCP de home.
2. Decisión e implementación SEO de variantes.
3. Páginas de categoría.
4. CTA sticky móvil, filtros activos y autocompletado nativo de checkout.
5. Rastreo SEO, alt text y galería.

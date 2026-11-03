-- Prendas "solo catálogo por tallas" (no se venden en la tienda, solo salen en /tallas y su PDF).
--
-- Qué hace: agrega UNA columna a `productos` con valor `false` para todos los productos que ya existen.
-- No modifica ni borra ningún dato. Correr una sola vez en Supabase → SQL Editor, antes o después
-- de desplegar (el código funciona igual sin la columna; la opción aparece en el admin cuando existe).
--
-- Para deshacerlo (solo si hiciera falta): alter table productos drop column solo_catalogo;

alter table productos add column if not exists solo_catalogo boolean not null default false;

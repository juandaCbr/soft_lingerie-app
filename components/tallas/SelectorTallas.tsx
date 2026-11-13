import Link from "next/link";
import type { TallaCatalogo } from "@/app/lib/catalogo-tallas";

const href = (t: Pick<TallaCatalogo, "slug">) => `/tallas/${t.slug}`;

/** Botones para cambiar de talla. En /tallas/xs o /tallas/s queda marcado el botón "XS y S". */
export function SelectorTallas({
  tallas,
  actual,
  junta,
}: {
  tallas: TallaCatalogo[];
  actual: TallaCatalogo;
  junta?: TallaCatalogo;
}) {
  return (
    <nav aria-label="Otras tallas" className="mt-6 flex flex-wrap justify-center gap-2">
      {tallas.map((t) => {
        const activa = t.slug === actual.slug || t.slug === junta?.slug;
        return (
          <Link
            key={t.slug}
            href={href(t)}
            aria-current={activa ? "page" : undefined}
            className={`grid h-12 min-w-12 place-items-center rounded-full px-4 text-base font-bold transition-colors ${
              activa ? "bg-ink text-white" : "bg-white/85 text-ink hover:bg-white"
            }`}
          >
            {t.nombre}
          </Link>
        );
      })}
    </nav>
  );
}

/** Dentro de un enlace combinado (XS y S): ver las dos tallas o solo una. */
export function FiltroTallasJuntas({
  junta,
  separadas,
  actual,
}: {
  junta: TallaCatalogo;
  separadas: TallaCatalogo[];
  actual: TallaCatalogo;
}) {
  const opciones = [
    { slug: junta.slug, etiqueta: "Ambas" },
    ...separadas.map((t) => ({ slug: t.slug, etiqueta: `Solo ${t.nombre}` })),
  ];
  return (
    <nav
      aria-label={`Filtrar ${junta.nombre}`}
      className="mx-auto mt-3 flex w-max max-w-full items-center gap-1 rounded-full bg-white/60 p-1 text-sm font-semibold"
    >
      {opciones.map((o) => {
        const activa = o.slug === actual.slug;
        return (
          <Link
            key={o.slug}
            href={href(o)}
            aria-current={activa ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-4 transition-colors ${
              activa ? "bg-white text-ink shadow-sm" : "text-ink/65 hover:text-ink"
            }`}
          >
            {o.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}

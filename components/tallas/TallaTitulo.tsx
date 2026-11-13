import type { TallaCatalogo } from "@/app/lib/catalogo-tallas";
import { LogoMarca } from "@/components/ui/LogoMarca";

/** "Catálogo / Talla M" (o "Tallas XS y S") con la talla en letras grandes de la marca. */
export function TallaTitulo({ talla }: { talla: TallaCatalogo }) {
  const combinada = talla.tallas.length > 1;
  return (
    <>
      <LogoMarca className="mb-4" />
      <p className="font-accent text-[clamp(0.9rem,1.6vw,1.2rem)] font-semibold uppercase tracking-[0.32em]">Catálogo</p>
      <h1 className="mt-1 flex items-baseline justify-center gap-[0.25em] font-extrabold leading-[0.85] tracking-[-0.05em]">
        <span className="text-[clamp(2.5rem,7vw,5.5rem)]">{combinada ? "Tallas" : "Talla"}</span>
        <span
          // pb + mb negativo: la cola de la "y" queda dentro del degradado sin mover el resto
          className={`text-wordmark -mb-[0.18em] w-max whitespace-nowrap px-[0.12em] pb-[0.18em] ${combinada ? "text-[clamp(3.75rem,12vw,9rem)]" : "text-[clamp(5rem,16vw,12rem)]"}`}
        >
          {talla.nombre}
        </span>
      </h1>
    </>
  );
}

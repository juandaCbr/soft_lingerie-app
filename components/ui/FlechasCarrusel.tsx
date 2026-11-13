"use client";

import { RefObject, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Flechas a los costados de un carrusel horizontal (un contenedor con overflow-x-auto), para que
 * se entienda que se puede avanzar. Cada flecha se desvanece cuando ya no hay más hacia ese lado.
 *
 * Uso: el carrusel y <FlechasCarrusel scrollRef={ref} /> van dentro de un contenedor `relative`.
 */
export function FlechasCarrusel({
  scrollRef,
  tono = "claro",
  etiqueta = "prendas",
  className = "",
}: {
  scrollRef: RefObject<HTMLElement | null>;
  /** "claro": botón blanco (sobre fondos claros o fotos). "oscuro": botón vino (sobre el panel vino) */
  tono?: "claro" | "oscuro";
  /** Para lectores de pantalla: "Ver más {etiqueta}" */
  etiqueta?: string;
  className?: string;
}) {
  const [puede, setPuede] = useState({ atras: false, adelante: false });

  const medir = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Con scroll-snap el carrusel puede quedar "imantado" unos px dentro de su padding: no cuenta como avance
    const estilo = getComputedStyle(el);
    const margenIzq = parseFloat(estilo.paddingLeft) || 0;
    const margenDer = parseFloat(estilo.paddingRight) || 0;
    setPuede({ atras: el.scrollLeft > margenIzq + 4, adelante: el.scrollLeft < max - margenDer - 4 });
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      observador.disconnect();
    };
  }, [scrollRef, medir]);

  const mover = (direccion: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direccion * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const estilo =
    tono === "oscuro"
      ? "bg-brand-accent text-ink shadow-ink/40 hover:bg-white"
      : "bg-white/95 text-ink shadow-ink/20 ring-1 ring-ink/10 hover:bg-ink hover:text-white";
  const boton = `pointer-events-auto grid h-12 w-12 place-items-center rounded-full shadow-xl backdrop-blur transition-[opacity,background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-95 ${estilo}`;
  const visible = (activo: boolean) => (activo ? "opacity-100" : "pointer-events-none opacity-0");

  return (
    <div aria-hidden={!puede.atras && !puede.adelante} className={`pointer-events-none absolute inset-x-1 top-1/2 z-10 flex -translate-y-1/2 justify-between sm:inset-x-2 ${className}`}>
      <button
        type="button"
        onClick={() => mover(-1)}
        aria-label={`Ver ${etiqueta} anteriores`}
        tabIndex={puede.atras ? 0 : -1}
        className={`${boton} ${visible(puede.atras)}`}
      >
        <ChevronLeft size={22} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => mover(1)}
        aria-label={`Ver más ${etiqueta}`}
        tabIndex={puede.adelante ? 0 : -1}
        className={`${boton} ${visible(puede.adelante)}`}
      >
        <ChevronRight size={22} aria-hidden />
      </button>
    </div>
  );
}

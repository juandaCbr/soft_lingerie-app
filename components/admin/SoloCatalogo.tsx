"use client";

import { useEffect, useState } from "react";
import { BookOpen, Store } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

/**
 * "Solo catálogo por tallas": prendas que Natalia quiere mostrar en /tallas (y su PDF) pero que NO
 * se venden en la tienda. Se guardan con `solo_catalogo = true` y `activo = false`; la tienda ya oculta
 * todo lo que tiene `activo = false`, así que no hubo que tocar nada de la tienda.
 *
 * La columna `productos.solo_catalogo` se agrega con un comando SQL aparte. Mientras no exista, la
 * opción no se muestra y los formularios guardan exactamente lo mismo que antes.
 */

/** Campos a guardar según la opción elegida. Vacío si la columna aún no existe en la base de datos. */
export function camposSoloCatalogo({
  disponible,
  solo,
  antes = false,
}: {
  disponible: boolean;
  solo: boolean;
  /** Valor que tenía el producto al abrir el formulario (al editar) */
  antes?: boolean;
}): { solo_catalogo?: boolean; activo?: boolean; destacado_home?: boolean } {
  if (!disponible) return {};
  if (solo) return { solo_catalogo: true, activo: false, destacado_home: false };
  // Si deja de ser "solo catálogo", vuelve a la tienda; si nunca lo fue, no se toca su visibilidad
  return antes ? { solo_catalogo: false, activo: true } : { solo_catalogo: false };
}

/** En Nuevo producto: averigua una vez si la columna ya existe (en Editar basta con mirar el producto). */
export function useSoloCatalogoDisponible() {
  const [disponible, setDisponible] = useState(false);
  useEffect(() => {
    let vigente = true;
    supabase
      .from("productos")
      .select("solo_catalogo")
      .limit(1)
      .then(({ error }) => {
        if (vigente) setDisponible(!error);
      });
    return () => {
      vigente = false;
    };
  }, []);
  return disponible;
}

/** Selector "¿Dónde se muestra?" con las dos opciones explicadas, en el estilo del formulario. */
export function SoloCatalogoSelector({ solo, onChange }: { solo: boolean; onChange: (solo: boolean) => void }) {
  const opciones = [
    { valor: false, icono: Store, titulo: "Tienda y catálogo", detalle: "Se vende en la página y sale en el catálogo por tallas" },
    { valor: true, icono: BookOpen, titulo: "Solo catálogo por tallas", detalle: "No se vende en la página; solo sale en el catálogo y su PDF" },
  ];
  return (
    <div className="space-y-2">
      <span className="ml-2 text-[12px] font-black uppercase tracking-widest opacity-40">¿Dónde se muestra?</span>
      <div role="radiogroup" aria-label="¿Dónde se muestra?" className="grid gap-2 sm:grid-cols-2">
        {opciones.map(({ valor, icono: Icono, titulo, detalle }) => {
          const activa = solo === valor;
          return (
            <button
              key={titulo}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => onChange(valor)}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                activa ? "border-[#4a1d44] bg-[#4a1d44] text-white" : "border-[#4a1d44]/10 bg-[#fdf8f6] text-[#4a1d44] hover:border-[#4a1d44]/30"
              }`}
            >
              <Icono size={18} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <span className="block text-sm font-bold">{titulo}</span>
                <span className={`mt-0.5 block text-xs ${activa ? "text-white/75" : "text-[#4a1d44]/55"}`}>{detalle}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Etiqueta para la lista de productos del admin. */
export function EtiquetaSoloCatalogo() {
  return (
    <span className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#f2e1d9] px-4 py-2.5 text-xs font-bold text-[#4a1d44]">
      <BookOpen size={16} aria-hidden /> Solo catálogo
    </span>
  );
}

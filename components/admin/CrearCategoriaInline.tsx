"use client";

import { useState } from "react";
import { Plus, Loader2, X, Check } from "lucide-react";
import toast from "react-hot-toast";

type Categoria = { id: number | string; nombre: string };

/**
 * "+ Nueva categoría" junto al selector de categoría (Nuevo / Editar producto).
 * Crea la categoría con /api/admin/categoria-crear (solo admin) y avisa al formulario para
 * que la agregue a la lista y la deje seleccionada. No envía el formulario del producto.
 */
export default function CrearCategoriaInline({ onCreada }: { onCreada: (categoria: Categoria) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cerrar = () => {
    setAbierto(false);
    setNombre("");
  };

  const crear = async () => {
    const limpio = nombre.replace(/\s+/g, " ").trim();
    if (limpio.length < 2) {
      toast.error("Escribe el nombre de la categoría");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/categoria-crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: limpio }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.categoria) {
        toast.error(json.error || "No se pudo crear la categoría");
        return;
      }
      onCreada(json.categoria as Categoria);
      toast.success(json.ya_existia ? `"${json.categoria.nombre}" ya existía: quedó seleccionada` : `Categoría "${json.categoria.nombre}" creada`);
      cerrar();
    } catch {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-accent/60 hover:text-ink"
      >
        <Plus size={14} aria-hidden /> Nueva categoría
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 rounded-2xl bg-brand-accent/40 p-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <input
        autoFocus
        type="text"
        value={nombre}
        maxLength={60}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => {
          // Enter crea la categoría (y NO envía el formulario del producto); Escape cancela
          if (e.key === "Enter") {
            e.preventDefault();
            if (!guardando) crear();
          }
          if (e.key === "Escape") cerrar();
        }}
        placeholder="Ej: Pijamas"
        aria-label="Nombre de la nueva categoría"
        className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-brand-primary"
      />
      <button
        type="button"
        onClick={crear}
        disabled={guardando}
        aria-label="Crear categoría"
        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {guardando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Crear
      </button>
      <button
        type="button"
        onClick={cerrar}
        disabled={guardando}
        aria-label="Cancelar"
        className="grid h-10 w-10 place-items-center rounded-xl text-ink/60 transition-colors hover:bg-white hover:text-ink"
      >
        <X size={16} />
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { HexColorPicker } from 'react-colorful';
import { supabase } from '@/app/lib/supabase';
import {
  ArrowLeft,
  Plus,
  Check,
  X,
  EyeOff,
  Eye,
  Palette,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Color = {
  id: number;
  nombre: string;
  hex: string;
  activo: boolean;
};

const EMPTY_FORM = { nombre: '', hex: '#4a1d44' };

function hexValid6(h: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(h);
}

/** Evita valores incompletos al escribir HEX en el input; react-colorful exige #RRGGBB válido. */
function hexParaPicker(h: string, fallback: string): string {
  return hexValid6(h) ? h : fallback;
}

function subscribeCoarsePointer(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(pointer: coarse)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getCoarsePointerSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

function usePrefersCoarsePointer(): boolean {
  return useSyncExternalStore(subscribeCoarsePointer, getCoarsePointerSnapshot, () => false);
}

/** PostgREST / Realtime a veces entregan `activo` de forma inconsistente; forzamos booleano real. */
function parseActivo(v: unknown): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === 't' || v === '1';
  if (typeof v === 'number') return v === 1;
  return false;
}

function normalizarFila(raw: Record<string, unknown>): Color {
  return {
    id: Number(raw.id),
    nombre: String(raw.nombre ?? ''),
    hex: String(raw.hex ?? '#000000'),
    activo: parseActivo(raw.activo),
  };
}

function ordenarPorNombre(list: Color[]): Color[] {
  return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export default function GestionColoresPage() {
  const pointerTactil = usePrefersCoarsePointer();
  const [colores, setColores] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<'todos' | 'activos' | 'ocultos'>('todos');

  // null = cerrado | 'nuevo' = crear | number = editar ese id
  const [modo, setModo] = useState<'nuevo' | number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);

  const [colorAEliminar, setColorAEliminar] = useState<Color | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /** `silent`: no activa skeleton (evita parpadeo al togglear, realtime o tras guardar). */
  const cargar = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from('colores')
      .select('id, nombre, hex, activo')
      .order('nombre');
    if (error) {
      if (!silent) toast.error('Error al cargar colores');
    } else {
      setColores(ordenarPorNombre((data || []).map((r) => normalizarFila(r as Record<string, unknown>))));
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
    const canal = supabase
      .channel('colores-admin')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'colores' },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const id = Number(raw.id);
          setColores((prev) => {
            const anterior = prev.find((x) => x.id === id);
            const row = normalizarFila({
              ...(anterior ? { ...anterior, ...raw } : raw),
            } as Record<string, unknown>);
            return ordenarPorNombre(prev.map((x) => (x.id === id ? row : x)));
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'colores' },
        (payload) => {
          const row = normalizarFila(payload.new as Record<string, unknown>);
          setColores((prev) => {
            if (prev.some((x) => x.id === row.id)) return ordenarPorNombre(prev.map((x) => (x.id === row.id ? row : x)));
            return ordenarPorNombre([...prev, row]);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'colores' },
        (payload) => {
          const id = Number((payload.old as { id?: number }).id);
          if (!Number.isNaN(id)) setColores((prev) => prev.filter((x) => x.id !== id));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [cargar]);

  const abrirNuevo = () => {
    setForm(EMPTY_FORM);
    setModo('nuevo');
    // Scroll suave al formulario en móvil
    setTimeout(() => {
      document.getElementById('form-color')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const abrirEditar = (c: Color) => {
    setForm({ nombre: c.nombre, hex: c.hex || '#4a1d44' });
    setModo(c.id);
    setTimeout(() => {
      document.getElementById('form-color')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const cancelar = () => {
    setModo(null);
    setForm(EMPTY_FORM);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre del color es obligatorio');
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.hex)) {
      toast.error('El código HEX no es válido (ej. #ff0000)');
      return;
    }
    setGuardando(true);
    try {
      if (modo === 'nuevo') {
        const { error } = await supabase
          .from('colores')
          .insert({ nombre: form.nombre.trim(), hex: form.hex.toLowerCase(), activo: true });
        if (error) throw error;
        toast.success('Color creado');
      } else {
        const { error } = await supabase
          .from('colores')
          .update({ nombre: form.nombre.trim(), hex: form.hex.toLowerCase() })
          .eq('id', modo);
        if (error) throw error;
        toast.success('Color actualizado');
      }
      cancelar();
      cargar({ silent: true });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      toast.error(
        err.code === '42501'
          ? 'Sin permiso en la base de datos (RLS). Ejecuta sql/rls-colores-admin.sql en Supabase.'
          : err.message || 'Error al guardar',
        { duration: err.code === '42501' ? 8000 : 4000 },
      );
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (c: Color) => {
    const siguiente = !c.activo;
    // Actualización optimista: badge, opacidad de tarjeta e ícono cambian al instante
    setColores((prev) => prev.map((x) => (x.id === c.id ? { ...x, activo: siguiente } : x)));

    const { error } = await supabase.from('colores').update({ activo: siguiente }).eq('id', c.id);

    if (error) {
      setColores((prev) => prev.map((x) => (x.id === c.id ? { ...x, activo: c.activo } : x)));
      toast.error('No se pudo cambiar el estado del color');
      return;
    }

    if (siguiente) {
      toast.success('Color activado. Aparecerá al crear productos.');
    } else {
      toast.success('Color desactivado.');
    }
    // No llamar a cargar() aquí: un SELECT inmediato puede devolver filas en caché / carrera y
    // revertir el `activo` en pantalla. La confirmación llega vía Realtime (merge por fila) o el estado optimista ya es correcto.
  };

  const ejecutarEliminacionColor = async () => {
    if (!colorAEliminar) return;
    const id = colorAEliminar.id;
    setEliminando(true);
    const { error } = await supabase.from('colores').delete().eq('id', id);
    setEliminando(false);

    if (error) {
      if (error.code === '23503') {
        toast.error(
          'No se puede eliminar: hay productos que usan este color. Quita la asociación en esas variantes primero.',
          { duration: 6000 },
        );
      } else if (error.code === '42501') {
        toast.error(
          'Sin permiso para eliminar (RLS). Añade la política DELETE en sql/rls-colores-admin.sql y ejecútala en Supabase.',
          { duration: 8000 },
        );
      } else {
        toast.error(error.message || 'Error al eliminar el color');
      }
      return;
    }

    toast.success('Color eliminado');
    setColorAEliminar(null);
    if (modo === id) cancelar();
    setColores((prev) => prev.filter((x) => x.id !== id));
  };

  const coloresFiltrados = colores.filter((c) => {
    const matchBusqueda =
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.hex.toLowerCase().includes(busqueda.toLowerCase());
    const matchActivo =
      filtroActivo === 'todos' ? true :
      filtroActivo === 'activos' ? c.activo :
      !c.activo;
    return matchBusqueda && matchActivo;
  });

  const conteoActivos = colores.filter(c => c.activo).length;
  const conteoOcultos = colores.filter(c => !c.activo).length;

  return (
    <div className="min-h-screen bg-[#fdf8f6] p-4 pb-24 text-[#4a1d44]">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          {/* Lado izquierdo: volver + título */}
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-3 bg-white rounded-2xl shadow-sm border border-[#4a1d44]/10 shrink-0"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-black font-playfair italic uppercase leading-tight">
                Gestión de Colores
              </h1>
              <p className="text-xs opacity-40 font-bold uppercase tracking-widest mt-0.5">
                {conteoActivos} activos · {conteoOcultos} ocultos
              </p>
            </div>
          </div>

          {/* Botón: ancho completo en móvil, auto en md+ (pegado a la derecha) */}
          <button
            onClick={abrirNuevo}
            className="md:ml-auto w-full md:w-auto flex items-center justify-center gap-2 bg-[#4a1d44] text-white px-5 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#5c2454] transition-all shadow-md active:scale-95"
          >
            <Plus size={18} /> Nuevo Color
          </button>
        </header>

        {/* ── Formulario crear / editar (inline) ─────────────────── */}
        {modo !== null && (
          <div
            id="form-color"
            className="mb-6 bg-white rounded-3xl border border-[#4a1d44]/10 shadow-md p-6 animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-6">
              {modo === 'nuevo' ? '✦ Crear nuevo color' : '✦ Editar color'}
            </p>

            {/* Swatch + picker: react-colorful en táctil; nativo en ratón/lápiz fino */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {pointerTactil ? (
                <div className="w-full sm:max-w-[min(100%,320px)] shrink-0 flex flex-col gap-3 self-stretch sm:self-auto">
                  <div className="admin-colorful-touch touch-manipulation rounded-2xl overflow-hidden border border-[#4a1d44]/15 shadow-md bg-[#fdf8f6] p-2">
                    <HexColorPicker
                      color={hexParaPicker(form.hex, EMPTY_FORM.hex)}
                      onChange={(hex) => setForm((f) => ({ ...f, hex }))}
                    />
                  </div>
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <div
                      className="w-14 h-14 rounded-xl shadow-md border-4 border-white ring-2 ring-[#4a1d44]/10 shrink-0"
                      style={{ backgroundColor: hexParaPicker(form.hex, EMPTY_FORM.hex) }}
                    />
                    <p className="text-[10px] font-bold text-[#4a1d44]/50 leading-snug max-w-[11rem]">
                      Arrastra en el cuadro y en la franja de colores para afinar el tono.
                    </p>
                  </div>
                </div>
              ) : (
                <label className="shrink-0 cursor-pointer group relative self-center sm:self-auto">
                  <div
                    className="w-20 h-20 rounded-2xl shadow-md border-4 border-white ring-2 ring-[#4a1d44]/10 group-hover:ring-[#4a1d44]/30 transition-all"
                    style={{ backgroundColor: form.hex }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl bg-black/10">
                    <Palette size={22} className="text-white drop-shadow" />
                  </div>
                  <input
                    type="color"
                    value={hexParaPicker(form.hex, EMPTY_FORM.hex)}
                    onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  <p className="text-center text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">
                    Elegir color
                  </p>
                </label>
              )}

              <div className="flex-1 space-y-4 w-full min-w-0">
                {/* Nombre */}
                <div>
                  <label className="text-xs font-black uppercase tracking-widest opacity-40 ml-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') cancelar(); }}
                    placeholder="Ej: Vino Tinto"
                    autoFocus
                    className="w-full bg-[#fdf8f6] px-4 py-3.5 rounded-xl outline-none font-bold text-base mt-1 focus:ring-2 focus:ring-[#4a1d44]/10 transition-all"
                  />
                </div>

                {/* HEX manual */}
                <div>
                  <label className="text-xs font-black uppercase tracking-widest opacity-40 ml-1">
                    Código HEX
                  </label>
                  <input
                    type="text"
                    value={form.hex}
                    onChange={e => setForm(f => ({ ...f, hex: e.target.value }))}
                    placeholder="#000000"
                    maxLength={7}
                    className="w-full bg-[#fdf8f6] px-4 py-3.5 rounded-xl outline-none font-mono text-base mt-1 focus:ring-2 focus:ring-[#4a1d44]/10 transition-all"
                  />
                </div>

                {/* Botones acción */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={guardar}
                    disabled={guardando}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#4a1d44] text-white px-4 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-[#5c2454] transition-all disabled:opacity-50 active:scale-95"
                  >
                    <Check size={16} />
                    {guardando ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    onClick={cancelar}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#4a1d44]/6 text-[#4a1d44] px-4 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-[#4a1d44]/10 transition-all active:scale-95"
                  >
                    <X size={16} /> Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Búsqueda + filtros ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
            <input
              type="text"
              placeholder="Buscar por nombre o HEX…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full bg-white pl-11 pr-4 py-3.5 rounded-2xl text-sm font-bold border border-[#4a1d44]/5 outline-none focus:border-[#4a1d44]/20 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            {(['todos', 'activos', 'ocultos'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroActivo(f)}
                className={`flex-1 sm:flex-none px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                  filtroActivo === f
                    ? 'bg-[#4a1d44] text-white shadow-md'
                    : 'bg-white text-[#4a1d44]/50 border border-[#4a1d44]/5 hover:border-[#4a1d44]/20'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'activos' ? 'Activos' : 'Ocultos'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Lista ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-[#4a1d44]/5" />
            ))}
          </div>
        ) : coloresFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-30">
            <Palette size={44} className="mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">
              {busqueda || filtroActivo !== 'todos' ? 'Sin resultados' : 'Sin colores todavía'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coloresFiltrados.map(c => (
              <div
                key={c.id}
                className={`flex flex-col gap-3 bg-white rounded-2xl border px-4 py-4 transition-all duration-300 ${
                  !c.activo
                    ? 'border-gray-200 opacity-50 saturate-50 contrast-95'
                    : 'border-[#4a1d44]/5 opacity-100 saturate-100 hover:border-[#4a1d44]/15 hover:shadow-sm'
                }`}
              >
                {/* Fila superior: swatch + nombre + HEX + badge de estado */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl shadow-inner shrink-0 border-2 border-white ring-1 ring-black/5"
                    style={{ backgroundColor: c.hex || '#ccc' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base truncate">{c.nombre}</p>
                    <p className="font-mono text-xs opacity-40 uppercase">{c.hex}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                      c.activo
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {c.activo ? 'Activo' : 'Oculto'}
                  </span>
                </div>

                {/* Fila inferior: editar + visibilidad + eliminar (mismo tamaño que inventario) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => abrirEditar(c)}
                    title="Editar"
                    className="p-3 bg-white border border-[#4a1d44]/10 rounded-2xl text-[#4a1d44] hover:bg-[#f2e1d9] transition-colors"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActivo(c)}
                    title={c.activo ? 'Desactivar color' : 'Activar color'}
                    className={`p-3 rounded-2xl border transition-all ${
                      c.activo
                        ? 'bg-white border-[#4a1d44]/10 text-[#4a1d44] hover:bg-red-50 hover:border-red-100 hover:text-red-500'
                        : 'bg-[#4a1d44] text-white border-[#4a1d44] shadow-md hover:bg-[#5c2454]'
                    }`}
                  >
                    {c.activo ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorAEliminar(c)}
                    title="Eliminar color"
                    className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal confirmar eliminación */}
      {colorAEliminar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#4a1d44]/40 backdrop-blur-sm"
            onClick={() => !eliminando && setColorAEliminar(null)}
            aria-hidden
          />
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-[#4a1d44]/10 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-black text-[#4a1d44] mb-2 font-playfair uppercase italic">
                Confirmar acción
              </h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                ¿Eliminar permanentemente el color{' '}
                <span className="font-bold text-[#4a1d44]">&quot;{colorAEliminar.nombre}&quot;</span>? Si hay
                productos que lo usan, la base de datos no permitirá el borrado.
              </p>
              <div className="flex flex-col w-full gap-3">
                <button
                  type="button"
                  disabled={eliminando}
                  onClick={ejecutarEliminacionColor}
                  className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {eliminando ? <Loader2 className="animate-spin" size={20} /> : 'Eliminar color'}
                </button>
                <button
                  type="button"
                  disabled={eliminando}
                  onClick={() => setColorAEliminar(null)}
                  className="w-full bg-gray-100 text-[#4a1d44] py-4 rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50 hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

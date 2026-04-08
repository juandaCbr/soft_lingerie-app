"use client";

/**
 * Panel de inventario: listado de productos, búsqueda/filtros, activar-ocultar en tienda,
 * y eliminación delegada a /api/admin/producto-delete (validaciones + carpeta uploads).
 * La lista se sincroniza con Supabase Realtime en la tabla `productos` para reflejar cambios sin recargar.
 */

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Package, Eye, EyeOff, Loader2, Plus, Edit3, Search, X, Trash2, AlertTriangle, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProductoImage } from '@/app/lib/image-helper';

// Definicion de la estructura del producto basada en la base de datos
type Producto = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  categoria: string | { nombre: string };
  imagen_url?: string;
  imagenes_urls?: string[];
  imagenes_locales?: { thumb: string; detail: string }[] | null;
  activo: boolean;
};

export default function GestionProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroStock, setFiltroStock] = useState<"todos" | "disponibles" | "agotados">("todos");

  // Estados para el manejo del modal de eliminacion
  const [mostrarModal, setMostrarModal] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<{ id: string, nombre: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Carga inicial + suscripción Realtime: otra pestaña o el webhook de pago pueden mutar `productos`.
  useEffect(() => {
    fetchProductos();

    const canalProductos = supabase
      .channel('cambios-productos-inventario')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProductos((prev) => [payload.new as Producto, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setProductos((prev) => prev.map(p => p.id === payload.new.id ? payload.new as Producto : p));
          } else if (payload.eventType === 'DELETE') {
            setProductos((prev) => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalProductos);
    };
  }, []);

  /** Carga única al montar (y si en el futuro se expone un “refrescar”, reutilizar esta función). */
  const fetchProductos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('id', { ascending: false }); // IDs altos primero: suele coincidir con “más recientes”

      if (error) throw error;
      setProductos(data || []);
    } catch (error: any) {
      toast.error('Error al cargar los productos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Prepara el estado para la confirmacion de borrado
  const abrirModalEliminar = (id: string, nombre: string) => {
    setProductoAEliminar({ id, nombre });
    setMostrarModal(true);
  };

  /**
   * Borrado vía POST /api/admin/producto-delete: valida carrito, ventas y otras FKs en servidor,
   * borra hijos + producto con service role, y elimina la carpeta uploads/productos/{slug}-{id}/.
   */
  const ejecutarEliminacion = async () => {
    if (!productoAEliminar) return;
    setEliminando(true);
    try {
      // Cookies de sesión van en la petición (mismo origen); el servidor comprueba admin y usa service role.
      const res = await fetch('/api/admin/producto-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoAEliminar.id,
          nombre_producto: productoAEliminar.nombre,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        // Prioridad: mensaje del API (carrito, ventas, FK). Si no hay cuerpo, mensajes por código HTTP.
        const msg =
          typeof json.error === 'string'
            ? json.error
            : res.status === 401 || res.status === 403
              ? 'No tienes permiso para eliminar productos o la sesión expiró.'
              : 'No se pudo eliminar el producto.';
        toast.error(msg);
        return;
      }

      // Optimistic UI: el canal Realtime también emitiría DELETE, pero actualizamos ya para feedback instantáneo.
      setProductos(productos.filter((p) => p.id !== productoAEliminar.id));
      toast.success('Prenda eliminada correctamente');
    } catch (error: unknown) {
      console.error('Error al eliminar:', error);
      toast.error('No se pudo eliminar. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setEliminando(false);
      setMostrarModal(false);
      setProductoAEliminar(null);
    }
  };

  // Filtro reactivo para la barra de busqueda y estado de stock
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const nombre = p.nombre.toLowerCase();
      const catStr = typeof p.categoria === 'object' && p.categoria !== null
        ? (p.categoria as any).nombre
        : p.categoria;

      const cat = String(catStr || "").toLowerCase();
      const query = busqueda.toLowerCase();

      // Filtro por nombre/categoria
      const coincideBusqueda = nombre.includes(query) || cat.includes(query);

      // Filtro por estado de stock
      let coincideStock = true;
      if (filtroStock === "disponibles") coincideStock = p.stock > 0;
      if (filtroStock === "agotados") coincideStock = p.stock <= 0;

      return coincideBusqueda && coincideStock;
    });
  }, [productos, busqueda, filtroStock]);

  // Alterna el estado de visibilidad del producto en la tienda
  const toggleActivo = async (id: string, estadoActual: boolean) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo: !estadoActual })
        .eq('id', id);

      if (error) throw error;

      setProductos(productos.map(p =>
        p.id === id ? { ...p, activo: !estadoActual } : p
      ));

      toast.success(!estadoActual ? 'Producto activado' : 'Producto ocultado');
    } catch (error: any) {
      toast.error('Error al actualizar estado');
      console.error(error);
    }
  };

  // Pantalla de carga inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf8f6] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#4a1d44]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8f6] pb-24 md:pb-8 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Encabezado y controles principales */}
        <header className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="p-3 bg-white rounded-2xl shadow-sm border border-[#4a1d44]/10 text-[#4a1d44] hover:bg-[#f2e1d9] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-black font-playfair text-[#4a1d44]">Inventario</h1>
            <div className="w-10" />
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="relative group flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#4a1d44] opacity-20 group-focus-within:opacity-40 transition-opacity" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre o categoría..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-white border border-[#4a1d44]/5 py-4 pl-14 pr-12 rounded-2xl shadow-sm outline-none focus:border-[#4a1d44]/20 transition-all text-[#4a1d44] font-medium text-sm placeholder:text-[#4a1d44]/20"
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4a1d44]/30 hover:text-[#4a1d44] transition-colors p-1">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="relative min-w-[180px]">
              <select 
                value={filtroStock} 
                onChange={(e) => setFiltroStock(e.target.value as any)}
                className="w-full h-full bg-white border border-[#4a1d44]/5 py-4 px-6 rounded-2xl shadow-sm outline-none font-bold text-[10px] uppercase tracking-widest text-[#4a1d44] cursor-pointer appearance-none hover:border-[#4a1d44]/10 transition-colors"
              >
                <option value="todos">Todos los productos</option>
                <option value="disponibles">En existencia</option>
                <option value="agotados">Sin existencias</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          <Link href="/admin/productos/nuevo" className="w-full flex items-center justify-center gap-3 bg-[#4a1d44] text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-[#5c2454] transition-all active:scale-[0.98] mt-2">
            <Plus size={18} /> Añadir nueva prenda
          </Link>
        </header>

        {/* Renderizado condicional del listado de productos */}
        {productosFiltrados.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center border border-[#4a1d44]/5 shadow-sm">
            <Package className="mx-auto text-[#4a1d44]/20 mb-4" size={48} />
            <h3 className="text-xl font-bold text-[#4a1d44]">{busqueda ? "No hay resultados" : "No hay prendas"}</h3>
          </div>
        ) : (
          <div className="grid gap-4">
            {productosFiltrados.map((producto) => {
              const miniatura = getProductoImage(producto, 0, 'thumb');

              const nombreCategoria = typeof producto.categoria === 'object' && producto.categoria !== null
                ? (producto.categoria as any).nombre
                : producto.categoria;

              return (
                <div
                  key={producto.id}
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '0 100px' }}
                  className={`bg-white p-4 rounded-[2.5rem] border border-[#4a1d44]/10 shadow-sm flex flex-col md:flex-row md:items-center gap-4 transition-all ${!producto.activo ? 'opacity-60 grayscale-[0.5]' : ''} ${producto.stock <= 0 ? 'border-red-200' : ''}`}
                >
                  {/* Informacion basica del producto */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-16 h-16 shrink-0 bg-gray-50 rounded-2xl overflow-hidden shadow-sm border border-black/5">
                      <img
                        src={
                          miniatura.includes('supabase.co') && !miniatura.includes('?')
                            ? `${miniatura}?width=120&quality=60`
                            : miniatura
                        }
                        className="w-full h-full object-cover"
                        alt={producto.nombre}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.currentTarget.src = '/images/placeholder.svg'; }}
                      />
                      {producto.stock <= 0 && (
                        <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                          <div className="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                            SIN STOCK
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[#4a1d44] leading-tight">{producto.nombre}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#4a1d44]/40 bg-[#f2e1d9] px-2 py-0.5 rounded-full w-fit mt-1">
                        {nombreCategoria}
                      </span>
                    </div>
                  </div>

                  {/* Metricas: Precio y Stock */}
                  <div className="grid grid-cols-2 md:flex md:gap-8 border-y md:border-none border-[#4a1d44]/5 py-3 md:py-0 px-2 md:px-0 min-w-[200px]">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-gray-400">Precio</span>
                      <span className="font-black text-[#4a1d44]">${Number(producto.precio).toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-gray-400">Stock</span>
                      <span className={`font-bold ${producto.stock > 0 ? 'text-green-600' : 'text-red-400'}`}>
                        {producto.stock} uds.
                      </span>
                    </div>
                  </div>

                  {/* Controles de accion */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActivo(producto.id, producto.activo)}
                      className={`flex-1 md:flex-none w-full md:w-[120px] flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-xs font-bold transition-all ${producto.activo ? 'bg-[#4a1d44] text-white shadow-md' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                    >
                      {producto.activo ? <><Eye size={16} /> Visible</> : <><EyeOff size={16} /> Oculto</>}
                    </button>

                    <Link
                      href={`/admin/productos/editar/${producto.id}`}
                      className="p-3 bg-white border border-[#4a1d44]/10 rounded-2xl text-[#4a1d44] hover:bg-[#f2e1d9] transition-colors"
                    >
                      <Edit3 size={18} />
                    </Link>

                    <button
                      onClick={() => abrirModalEliminar(producto.id, producto.nombre)}
                      className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmacion de eliminacion */}
      {mostrarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#4a1d44]/40 backdrop-blur-sm"
            onClick={() => !eliminando && setMostrarModal(false)}
          />

          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-[#4a1d44]/10 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-black text-[#4a1d44] mb-2 font-playfair uppercase italic">Confirmar accion</h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                ¿Deseas eliminar permanentemente <span className="font-bold text-[#4a1d44]">"{productoAEliminar?.nombre}"</span>? Esta accion no se puede deshacer.
              </p>

              <div className="flex flex-col w-full gap-3">
                <button
                  disabled={eliminando}
                  onClick={ejecutarEliminacion}
                  className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {eliminando ? <Loader2 className="animate-spin" size={20} /> : "Proceder con la eliminacion"}
                </button>
                <button
                  disabled={eliminando}
                  onClick={() => setMostrarModal(false)}
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
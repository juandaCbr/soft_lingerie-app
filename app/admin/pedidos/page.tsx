"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { obtenerVentasAdmin } from '@/app/lib/admin';
import toast from 'react-hot-toast';
import {
  Truck,
  Package,
  MapPin,
  ExternalLink,
  ArrowLeft,
  Filter,
  ArrowDownUp
} from 'lucide-react';

export default function AdminPedidos() {
  const router = useRouter();
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el sistema de filtrado y ordenamiento
  const [filtroCiudad, setFiltroCiudad] = useState('Todas');
  const [ordenPrioridad, setOrdenPrioridad] = useState('Recientes');

  useEffect(() => {
    // Carga inicial de datos desde la base de datos
    obtenerVentasAdmin().then(data => {
      const ventasOrdenadas = data ? data.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) : [];
      setVentas(ventasOrdenadas);
      setLoading(false);
    });

    // Suscripcion a cambios en tiempo real mediante Supabase Realtime (WebSockets)
    const canalVentas = supabase
      .channel('cambios-ventas-limpio')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ventas_realizadas'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setVentas((prev) => {
              if (prev.some(v => v.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
            toast.success('Nuevo pedido recibido');
          }

          if (payload.eventType === 'UPDATE') {
            setVentas((prev) =>
              prev.map(v => v.id === payload.new.id ? payload.new : v)
            );
          }

          if (payload.eventType === 'DELETE') {
            setVentas((prev) => prev.filter(v => v.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalVentas);
    };
  }, []);

  // Obtencion de ciudades unicas para el filtro
  const ciudadesUnicas = useMemo(() => {
    const ciudades = ventas.map(v => v.ciudad).filter(Boolean);
    return ['Todas', ...Array.from(new Set(ciudades))];
  }, [ventas]);

  // Aplicacion de filtros y criterios de orden en memoria
  const ventasFiltradas = useMemo(() => {
    let resultado = [...ventas];

    if (filtroCiudad !== 'Todas') {
      resultado = resultado.filter(v => v.ciudad === filtroCiudad);
    }

    resultado.sort((a, b) => {
      if (ordenPrioridad === 'Recientes') {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      }
      if (ordenPrioridad === 'Antiguos') {
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      }
      if (ordenPrioridad === 'PrioridadLocal') {
        const aLocal = a.ciudad?.toLowerCase() === 'valledupar' ? 1 : 0;
        const bLocal = b.ciudad?.toLowerCase() === 'valledupar' ? 1 : 0;
        if (aLocal !== bLocal) return bLocal - aLocal;
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      }
      if (ordenPrioridad === 'Pendientes') {
        const aPendiente = a.estado_pago !== 'APROBADO' ? 1 : 0;
        const bPendiente = b.estado_pago !== 'APROBADO' ? 1 : 0;
        if (aPendiente !== bPendiente) return bPendiente - aPendiente;
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      }
      return 0;
    });

    return resultado;
  }, [ventas, filtroCiudad, ordenPrioridad]);

  // Estilos para las etiquetas de estado (Badge)
  const obtenerEstiloBadge = (estado: string) => {
    const status = (estado || '').toUpperCase();
    if (status === 'APROBADO' || status === 'APPROVED') {
      return 'bg-green-100 text-green-700';
    }
    if (status === 'RECHAZADO' || status === 'DECLINADO' || status === 'ERROR') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-amber-100 text-amber-700';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdf8f6]">
      <div className="text-center font-playfair animate-pulse text-[#4a1d44]">
        Cargando gestion de ventas...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdf8f6] p-4 md:p-10 text-[#4a1d44]">
      <div className="max-w-7xl mx-auto">

        {/* Navegacion de retorno */}
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-3 text-[#4a1d44]/50 hover:text-[#4a1d44] transition-all mb-8 group"
        >
          <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md group-active:scale-95 transition-all">
            <ArrowLeft size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Volver al Panel</span>
        </button>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black font-playfair text-[#4a1d44]">Pedidos Soft Lingerie</h1>
            <p className="opacity-60 text-sm mt-1">Sincronizacion en tiempo real activada</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-[#4a1d44]/5 flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold">{ventasFiltradas.length} Pedidos</span>
          </div>
        </header>

        {/* Seccion de Filtros */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-[#4a1d44]/5 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="flex items-center gap-3 w-full bg-[#fdf8f6] px-4 py-3 rounded-xl border border-[#4a1d44]/5">
              <Filter size={16} className="text-[#4a1d44] opacity-50 shrink-0" />
              <div className="flex flex-col w-full overflow-hidden">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Filtrar Ciudad</span>
                <select
                  value={filtroCiudad}
                  onChange={(e) => setFiltroCiudad(e.target.value)}
                  className="bg-transparent text-sm font-bold outline-none cursor-pointer text-[#4a1d44] w-full truncate"
                >
                  {ciudadesUnicas.map(ciudad => (
                    <option key={ciudad} value={ciudad}>{ciudad}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full bg-[#fdf8f6] px-4 py-3 rounded-xl border border-[#4a1d44]/5">
              <ArrowDownUp size={16} className="text-[#4a1d44] opacity-50 shrink-0" />
              <div className="flex flex-col w-full overflow-hidden">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Orden de lista</span>
                <select
                  value={ordenPrioridad}
                  onChange={(e) => setOrdenPrioridad(e.target.value)}
                  className="bg-transparent text-sm font-bold outline-none cursor-pointer text-[#4a1d44] w-full truncate"
                >
                  <option value="Recientes">Mas recientes</option>
                  <option value="Antiguos">Mas antiguos</option>
                  <option value="PrioridadLocal">Envios Valledupar</option>
                  <option value="Pendientes">Pagos por revisar</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Listado de Pedidos */}
        <div className="grid gap-6">
          {ventasFiltradas.length === 0 ? (
            <div className="bg-white p-10 md:p-20 rounded-[2rem] text-center border border-dashed border-[#4a1d44]/20">
              <p className="opacity-40 font-bold">No se encontraron registros coincidentes.</p>
            </div>
          ) : (
            ventasFiltradas.map((venta) => {
              const badgeColor = obtenerEstiloBadge(venta.estado_pago);

              return (
                <div
                  key={venta.id}
                  className="bg-white rounded-[2rem] border border-[#4a1d44]/10 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-[#4a1d44]/20"
                >
                  <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">

                    {/* Columna: Cliente y Ubicacion */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${badgeColor}`}>
                          {venta.estado_pago || 'PENDIENTE'}
                        </span>
                        {venta.ciudad?.toLowerCase() === 'valledupar' && (
                          <span className="bg-[#4a1d44] text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Truck size={12} /> Prioridad Local
                          </span>
                        )}
                        <span className="text-[10px] opacity-40 font-bold uppercase">
                          {new Date(venta.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-[#4a1d44]">{venta.nombre_cliente}</h3>
                        <p className="text-xs opacity-60 font-medium break-all">{venta.email_cliente} • {venta.telefono_cliente}</p>
                      </div>

                      <div className="flex items-start gap-2 text-sm text-[#4a1d44]">
                        <MapPin size={16} className="shrink-0 mt-1 opacity-30" />
                        <p className="leading-relaxed">
                          <strong className="text-[#4a1d44]">{venta.ciudad}</strong> <br />
                          <span className="opacity-60 text-xs">{venta.direccion_envio}</span>
                        </p>
                      </div>
                    </div>

                    {/* Columna: Detalle de Productos */}
                    <div className="flex-1 border-y md:border-y-0 md:border-x border-gray-100 px-0 md:px-8 py-6 md:py-0">
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2">
                        <Package size={14} /> Articulos
                      </h4>
                      <div className="space-y-2">
                        {venta.detalle_compra?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs bg-[#fdf8f6] p-3 rounded-xl border border-[#4a1d44]/5">
                            <span className="font-medium text-[#4a1d44] truncate pr-2">
                              <span className="font-black mr-2">{item.quantity}x</span>
                              {item.nombre}
                            </span>
                            <span className="font-bold text-[#4a1d44] shrink-0">${Number(item.precio).toLocaleString('es-CO')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Columna: Financiero y Auditoria */}
                    <div className="w-full md:w-48 flex flex-col justify-between items-start md:items-end gap-6">
                      <div className="text-left md:text-right w-full">
                        <p className="text-[9px] opacity-40 uppercase font-black tracking-widest mb-1">Monto Cobrado</p>
                        <p className="text-3xl font-black text-[#4a1d44]">${Number(venta.monto_total).toLocaleString('es-CO')}</p>

                        {venta.referencia_wompi && (
                          <p className="text-[8px] opacity-40 mt-2 font-mono break-all text-left md:text-right">
                            ID: {venta.referencia_wompi}
                          </p>
                        )}
                      </div>

                      <a
                        href="https://comercios.wompi.co/"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-[#f2e1d9] hover:bg-[#ebd5c8] text-[#4a1d44] py-3.5 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2 border border-[#4a1d44]/5"
                      >
                        Auditar Pago <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
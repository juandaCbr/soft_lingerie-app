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
  ArrowDownUp,
  Ruler,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function AdminPedidos() {
  const router = useRouter();
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el sistema de filtrado y ordenamiento
  const [filtroCiudad, setFiltroCiudad] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('APROBADO'); // Por defecto solo vemos lo pagado
  const [ordenPrioridad, setOrdenPrioridad] = useState('Recientes');

  useEffect(() => {
    // Carga inicial de datos
    obtenerVentasAdmin().then(data => {
      const ventasOrdenadas = data ? data.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) : [];
      setVentas(ventasOrdenadas);
      setLoading(false);
    });

    const canalVentas = supabase
      .channel('cambios-ventas-webhook')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ventas_realizadas'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setVentas((prev) => [payload.new, ...prev]);
            if (payload.new.estado_pago === 'APROBADO') {
              toast.success('¡Venta aprobada recibida!');
            }
          }

          if (payload.eventType === 'UPDATE') {
            setVentas((prev) =>
              prev.map(v => v.id === payload.new.id ? payload.new : v)
            );
            if (payload.new.estado_pago === 'APROBADO') {
              toast.success('Un pedido ha sido pagado con éxito');
            }
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

  const ciudadesUnicas = useMemo(() => {
    const ciudades = ventas.map(v => v.ciudad).filter(Boolean);
    return ['Todas', ...Array.from(new Set(ciudades))];
  }, [ventas]);

  const ventasFiltradas = useMemo(() => {
    let resultado = [...ventas];

    if (filtroCiudad !== 'Todas') {
      resultado = resultado.filter(v => v.ciudad === filtroCiudad);
    }

    if (filtroEstado !== 'Todos') {
      resultado = resultado.filter(v => (v.estado_pago || 'PENDIENTE') === filtroEstado);
    }

    resultado.sort((a, b) => {
      if (ordenPrioridad === 'Recientes') return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      if (ordenPrioridad === 'Antiguos') return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      return 0;
    });

    return resultado;
  }, [ventas, filtroCiudad, filtroEstado, ordenPrioridad]);

  const obtenerEstiloBadge = (estado: string) => {
    const status = (estado || '').toUpperCase();
    if (status === 'APROBADO') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'PENDIENTE') return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-red-50 text-red-600 border-red-100';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fdf8f6] font-playfair animate-pulse text-[#4a1d44]">Cargando gestión de ventas...</div>;

  return (
    <div className="min-h-screen bg-[#fdf8f6] p-4 md:p-10 text-[#4a1d44]">
      <div className="max-w-7xl mx-auto">

        <button onClick={() => router.push('/admin')} className="flex items-center gap-3 text-[#4a1d44]/50 hover:text-[#4a1d44] transition-all mb-8 group">
          <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all"><ArrowLeft size={18} /></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Volver al Panel</span>
        </button>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black font-playfair text-[#4a1d44]">Ventas & Pedidos</h1>
            <p className="opacity-60 text-sm mt-1">Webhook de Wompi activo • Sincronización real</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFiltroEstado('APROBADO')} className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all border ${filtroEstado === 'APROBADO' ? 'bg-[#4a1d44] text-white shadow-lg' : 'bg-white text-[#4a1d44]/40 border-transparent'}`}>
              Pagados
            </button>
            <button onClick={() => setFiltroEstado('PENDIENTE')} className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all border ${filtroEstado === 'PENDIENTE' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-[#4a1d44]/40 border-transparent'}`}>
              Pendientes
            </button>
            <button onClick={() => setFiltroEstado('Todos')} className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all border ${filtroEstado === 'Todos' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-[#4a1d44]/40 border-transparent'}`}>
              Todos
            </button>
          </div>
        </header>

        {/* Filtros Secundarios */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-[#4a1d44]/5 mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 bg-[#fdf8f6] px-4 py-3 rounded-xl">
            <Filter size={16} className="opacity-30" />
            <select value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)} className="bg-transparent text-sm font-bold outline-none w-full">
              {ciudadesUnicas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 flex items-center gap-3 bg-[#fdf8f6] px-4 py-3 rounded-xl">
            <ArrowDownUp size={16} className="opacity-30" />
            <select value={ordenPrioridad} onChange={(e) => setOrdenPrioridad(e.target.value)} className="bg-transparent text-sm font-bold outline-none w-full">
              <option value="Recientes">Más recientes</option>
              <option value="Antiguos">Más antiguos</option>
            </select>
          </div>
        </div>

        {/* Listado */}
        <div className="grid gap-6">
          {ventasFiltradas.length === 0 ? (
            <div className="bg-white p-20 rounded-[2.5rem] text-center border-2 border-dashed border-[#4a1d44]/5">
              <p className="opacity-30 font-bold italic">No hay pedidos en esta categoría.</p>
            </div>
          ) : (
            ventasFiltradas.map((venta) => (
              <div key={venta.id} className="bg-white rounded-[2.5rem] border border-[#4a1d44]/10 overflow-hidden hover:shadow-xl transition-all duration-500">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${obtenerEstiloBadge(venta.estado_pago)}`}>
                        {venta.estado_pago === 'APROBADO' ? <CheckCircle2 size={10} className="inline mr-1" /> : <Clock size={10} className="inline mr-1" />}
                        {venta.estado_pago || 'PENDIENTE'}
                      </span>
                      <span className="text-[10px] opacity-40 font-bold uppercase">{new Date(venta.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-[#4a1d44]">{venta.nombre_cliente}</h3>
                      <p className="text-xs opacity-50">{venta.email_cliente} • {venta.telefono_cliente}</p>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <MapPin size={16} className="mt-1 opacity-20" />
                      <p className="leading-tight"><strong className="text-[#4a1d44]">{venta.ciudad}</strong><br/><span className="opacity-50 text-xs">{venta.direccion_envio}</span></p>
                    </div>
                  </div>

                  <div className="flex-1 border-y md:border-y-0 md:border-x border-gray-50 px-0 md:px-8 py-6 md:py-0">
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4">Artículos</h4>
                    <div className="space-y-3">
                      {venta.detalle_compra?.map((item: any, idx: number) => (
                        <div key={idx} className="flex flex-col gap-1 bg-[#fdf8f6] p-3 rounded-2xl">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="truncate pr-2 uppercase"><span className="text-[#4a1d44]/40 mr-1">{item.quantity}x</span> {item.nombre}</span>
                            <span>${Number(item.precio * item.quantity).toLocaleString('es-CO')}</span>
                          </div>
                          {item.talla && <div className="flex items-center gap-1.5 text-[8px] font-black uppercase opacity-40 ml-5"><Ruler size={10} /> Talla: {item.talla.nombre}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full md:w-48 flex flex-col justify-between items-start md:items-end">
                    <div className="text-left md:text-right w-full">
                      <p className="text-[9px] opacity-30 uppercase font-black mb-1">Monto Total</p>
                      <p className="text-3xl font-black">${Number(venta.monto_total).toLocaleString('es-CO')}</p>
                      <p className="text-[8px] opacity-30 mt-2 font-mono break-all">{venta.referencia_wompi}</p>
                    </div>
                    
                    <a href="https://comercios.wompi.co/" target="_blank" className="w-full bg-[#f2e1d9] text-[#4a1d44] py-3.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest mt-6 flex items-center justify-center gap-2 hover:bg-[#4a1d44] hover:text-white transition-all">
                      Wompi Panel <ExternalLink size={14} />
                    </a>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
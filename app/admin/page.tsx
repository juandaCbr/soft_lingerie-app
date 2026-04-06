"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import {
  PlusCircle,
  ShoppingBag,
  PackageOpen,
  BarChart3,
  TrendingUp,
  DollarSign,
  Award,
  Calendar,
  ArrowRight
} from 'lucide-react';

// Interfaz para el mapeo de registros de ventas desde Supabase
interface Venta {
  id: string;
  fecha: string;
  monto_total: number;
  estado_pago: string;
  detalle_compra: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSemana: 0,
    totalMes: 0,
    totalPedidos: 0,
    ticketPromedio: 0,
    productoEstrella: "Cargando...",
    ventasHoy: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obtenerYCalcularEstadisticas();

    // Configuracion de escucha en tiempo real para la tabla ventas_realizadas
    const canalVentas = supabase
      .channel('cambios-dashboard-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ventas_realizadas' },
        () => {
          // Se dispara el recalculo ante cualquier cambio en la tabla
          obtenerYCalcularEstadisticas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalVentas);
    };
  }, []);

  const obtenerYCalcularEstadisticas = async () => {
    try {
      // Consulta exclusiva de transacciones aprobadas para integridad de metricas
      const { data: ventas, error } = await supabase
        .from('ventas_realizadas')
        .select('*')
        .eq('estado_pago', 'APROBADO');

      if (error) throw error;

      if (ventas) {
        const ahora = new Date();
        const unaSemanaAtras = new Date();
        unaSemanaAtras.setDate(ahora.getDate() - 7);
        const unMesAtras = new Date();
        unMesAtras.setDate(ahora.getDate() - 30);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        let sumaSemana = 0;
        let sumaMes = 0;
        let sumaHoy = 0;
        let conteoProductos: { [key: string]: number } = {};

        ventas.forEach((venta: Venta) => {
          const fechaVenta = new Date(venta.fecha);
          const monto = Number(venta.monto_total);

          if (fechaVenta >= unaSemanaAtras) sumaSemana += monto;
          if (fechaVenta >= unMesAtras) sumaMes += monto;
          if (fechaVenta >= hoy) sumaHoy += monto;

          if (Array.isArray(venta.detalle_compra)) {
            venta.detalle_compra.forEach(item => {
              const nombre = item.nombre || "S/N";
              conteoProductos[nombre] = (conteoProductos[nombre] || 0) + (item.quantity || 1);
            });
          }
        });

        const productoMasVendido = Object.entries(conteoProductos).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

        setStats({
          totalSemana: sumaSemana,
          totalMes: sumaMes,
          totalPedidos: ventas.length,
          ticketPromedio: ventas.length > 0 ? (sumaMes / (ventas.filter((v: any) => new Date(v.fecha) >= unMesAtras).length || 1)) : 0,
          productoEstrella: productoMasVendido,
          ventasHoy: sumaHoy
        });
      }
    } catch (error) {
      console.error("Error en el procesamiento de datos:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8f6] p-4 md:p-10 text-[#4a1d44]">
      <div className="max-w-6xl mx-auto">

        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black font-playfair text-[#4a1d44] mb-2 uppercase italic tracking-tighter">
            Panel de Administración
          </h1>
          <p className="text-[#4a1d44]/70">Bienvenida. Resumen operativo de Soft Lingerie.</p>
        </header>

        {/* Resumen ejecutivo de metricas financieras */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#4a1d44]/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-50 rounded-xl text-green-600"><DollarSign size={20} /></div>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Ventas (30d)</span>
            </div>
            <p className="text-2xl font-black">${stats.totalMes.toLocaleString('es-CO')}</p>
            <p className="text-[10px] mt-1 opacity-50">Ingresos totales brutos del mes.</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#4a1d44]/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Calendar size={20} /></div>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Ventas (7d)</span>
            </div>
            <p className="text-2xl font-black">${stats.totalSemana.toLocaleString('es-CO')}</p>
            <p className="text-[10px] mt-1 opacity-50">Flujo de caja de la ultima semana.</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#4a1d44]/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 rounded-xl text-purple-600"><TrendingUp size={20} /></div>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Ticket Promedio</span>
            </div>
            <p className="text-2xl font-black">${Math.round(stats.ticketPromedio).toLocaleString('es-CO')}</p>
            <p className="text-[10px] mt-1 opacity-50">Gasto medio por cada clienta.</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#4a1d44]/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Award size={20} /></div>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Top Ventas</span>
            </div>
            <p className="text-sm font-black truncate uppercase">{stats.productoEstrella}</p>
            <p className="text-[10px] mt-1 opacity-50">Articulo con mayor rotacion.</p>
          </div>
        </div>

        {/* Grid de navegacion funcional */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/admin/productos/nuevo" className="group bg-white p-8 rounded-[2rem] border border-[#4a1d44]/5 hover:border-[#4a1d44]/30 transition-all flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#fdf8f6] rounded-2xl flex items-center justify-center text-[#4a1d44] mb-6 group-hover:scale-110 transition-transform">
              <PlusCircle size={32} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-[#4a1d44] mb-2">Nuevo Producto</h2>
            <p className="text-xs text-[#4a1d44]/60">Sube fotos y precios al catalogo.</p>
          </Link>

          <Link href="/admin/pedidos" className="group bg-white p-8 rounded-[2rem] border border-[#4a1d44]/5 hover:border-[#4a1d44]/30 transition-all flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#fdf8f6] rounded-2xl flex items-center justify-center text-[#4a1d44] mb-6 group-hover:scale-110 transition-transform">
              <ShoppingBag size={32} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-[#4a1d44] mb-2">Ventas Reales</h2>
            <p className="text-xs text-[#4a1d44]/60">Gestiona pedidos en tiempo real.</p>
          </Link>

          <Link href="/admin/productos" className="group bg-white p-8 rounded-[2rem] border border-[#4a1d44]/5 hover:border-[#4a1d44]/30 transition-all flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#fdf8f6] rounded-2xl flex items-center justify-center text-[#4a1d44] mb-6 group-hover:scale-110 transition-transform">
              <PackageOpen size={32} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-[#4a1d44] mb-2">Inventario</h2>
            <p className="text-xs text-[#4a1d44]/60">Edita stock y visibilidad de prendas.</p>
          </Link>

          {/* Boton de Estadisticas ya habilitado */}
          <Link href="/admin/estadisticas" className="group bg-[#4a1d44] p-8 rounded-[2rem] transition-all hover:shadow-2xl hover:scale-[1.02] flex flex-col items-center text-center text-white">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 size={32} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold mb-2">Análisis</h2>
            <p className="text-xs text-white/60 mb-4">Graficas de rendimiento y crecimiento.</p>
            <div className="mt-auto flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-80">
              Ver Reportes <ArrowRight size={12} />
            </div>
          </Link>
        </div>

        {/* Indicador de ventas del dia actual */}
        <div className="mt-12 p-8 bg-white rounded-[2.5rem] border border-dashed border-[#4a1d44]/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-100">
              <TrendingUp size={28} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 leading-none mb-1">Total de hoy</p>
              <p className="text-3xl font-black text-[#4a1d44]">${stats.ventasHoy.toLocaleString('es-CO')} <span className="text-xs opacity-30">COP</span></p>
            </div>
          </div>
          <Link href="/admin/pedidos?hoy=1" className="px-8 py-4 bg-[#4a1d44] text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#5c2454] transition-colors shadow-lg">
            Ver pedidos hoy
          </Link>
        </div>

      </div>
    </div>
  );
}
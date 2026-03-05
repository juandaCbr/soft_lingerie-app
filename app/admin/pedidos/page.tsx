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
  XCircle,
  Send,
  Search,
  Archive,
  Inbox,
  Loader2
} from 'lucide-react';

const EMPRESAS_ENVIO = ['Interrapidisimo', 'Servientrega', 'Envía', 'Coordinadora', 'Otro'];

export default function AdminPedidos() {
  const router = useRouter();
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroCiudad, setFiltroCiudad] = useState('Todas');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState('APROBADO'); 
  const [filtroLogistica, setFiltroLogistica] = useState('PENDIENTES'); // 'PENDIENTES' (Preparando/Enviado) o 'ENTREGADOS'
  const [ordenPrioridad, setOrdenPrioridad] = useState('Recientes');

  const [pedidoADespachar, setPedidoADespachar] = useState<any>(null);
  const [guiaForm, setGuiaForm] = useState({ numero: '', empresa: 'Interrapidisimo' });
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  useEffect(() => {
    cargarVentas();
    const canalVentas = supabase.channel('cambios-ventas-full').on('postgres_changes', { event: '*', schema: 'public', table: 'ventas_realizadas' }, () => cargarVentas()).subscribe();
    return () => { supabase.removeChannel(canalVentas); };
  }, []);

  const cargarVentas = async () => {
    const data = await obtenerVentasAdmin();
    setVentas(data || []);
    setLoading(false);
  };

  const handleDespachar = async () => {
    if (!guiaForm.numero) return toast.error("Escribe el número de guía");
    setProcesandoAccion(true);
    try {
      const { error } = await supabase.from('ventas_realizadas').update({
        numero_guia: guiaForm.numero,
        empresa_envio: guiaForm.empresa,
        estado_logistico: 'ENVIADO'
      }).eq('id', pedidoADespachar.id);
      if (error) throw error;
      toast.success("Pedido enviado");
      setPedidoADespachar(null);
      setGuiaForm({ numero: '', empresa: 'Interrapidisimo' });
      cargarVentas();
    } catch (e) { toast.error("Error al actualizar"); } finally { setProcesandoAccion(false); }
  };

  const handleMarcarEntregado = async (id: string) => {
    if (!confirm("¿Confirmas que este pedido ya fue entregado al cliente?")) return;
    setProcesandoAccion(true);
    try {
      const { error } = await supabase.from('ventas_realizadas').update({ estado_logistico: 'ENTREGADO' }).eq('id', id);
      if (error) throw error;
      toast.success("Venta finalizada con éxito");
      cargarVentas();
    } catch (e) { toast.error("Error al actualizar"); } finally { setProcesandoAccion(false); }
  };

  const ciudadesUnicas = useMemo(() => {
    const ciudades = ventas.map(v => v.ciudad).filter(Boolean);
    return ['Todas', ...Array.from(new Set(ciudades))];
  }, [ventas]);

  const ventasFiltradas = useMemo(() => {
    let resultado = [...ventas];
    
    // 1. Filtro por Ciudad
    if (filtroCiudad !== 'Todas') resultado = resultado.filter(v => v.ciudad === filtroCiudad);
    
    // 2. Filtro por Estado de Pago
    if (filtroEstadoPago !== 'Todos') {
      resultado = resultado.filter(v => (v.estado_pago || 'PENDIENTE') === filtroEstadoPago);
    }

    // 3. Filtro de Logística (Solo aplica para ventas pagadas)
    if (filtroEstadoPago === 'APROBADO') {
      if (filtroLogistica === 'PENDIENTES') {
        resultado = resultado.filter(v => v.estado_logistico !== 'ENTREGADO');
      } else {
        resultado = resultado.filter(v => v.estado_logistico === 'ENTREGADO');
      }
    }

    resultado.sort((a, b) => ordenPrioridad === 'Recientes' ? new Date(b.fecha).getTime() - new Date(a.fecha).getTime() : new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    return resultado;
  }, [ventas, filtroCiudad, filtroEstadoPago, filtroLogistica, ordenPrioridad]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fdf8f6] font-playfair animate-pulse text-[#4a1d44]">Cargando gestión logística...</div>;

  return (
    <div className="min-h-screen bg-[#fdf8f6] p-4 md:p-10 text-[#4a1d44]">
      <div className="max-w-7xl mx-auto">

        <button onClick={() => router.push('/admin')} className="flex items-center gap-3 text-[#4a1d44]/50 hover:text-[#4a1d44] transition-all mb-8 group">
          <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all"><ArrowLeft size={18} /></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Volver al Panel</span>
        </button>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
          <div>
            <h1 className="text-4xl font-black font-playfair text-[#4a1d44]">Ventas & Logística</h1>
            <p className="opacity-60 text-sm mt-1">Monitorea tus envíos en tiempo real</p>
          </div>
          
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="bg-white p-1 rounded-2xl flex border border-[#4a1d44]/5 shadow-sm">
              <button onClick={() => setFiltroEstadoPago('APROBADO')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtroEstadoPago === 'APROBADO' ? 'bg-[#4a1d44] text-white shadow-md' : 'text-[#4a1d44]/40 hover:bg-gray-50'}`}>Ventas Reales</button>
              <button onClick={() => setFiltroEstadoPago('PENDIENTE')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtroEstadoPago === 'PENDIENTE' ? 'bg-amber-500 text-white shadow-md' : 'text-[#4a1d44]/40 hover:bg-gray-50'}`}>Pendientes</button>
              <button onClick={() => setFiltroEstadoPago('Todos')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtroEstadoPago === 'Todos' ? 'bg-gray-800 text-white shadow-md' : 'text-[#4a1d44]/40 hover:bg-gray-50'}`}>Historial</button>
            </div>

            {filtroEstadoPago === 'APROBADO' && (
              <div className="flex gap-2">
                <button onClick={() => setFiltroLogistica('PENDIENTES')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all ${filtroLogistica === 'PENDIENTES' ? 'bg-white border-[#4a1d44] text-[#4a1d44] shadow-sm' : 'bg-transparent border-transparent text-[#4a1d44]/30 hover:text-[#4a1d44]'}`}>
                  <Inbox size={14} /> Por Despachar
                </button>
                <button onClick={() => setFiltroLogistica('ENTREGADOS')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all ${filtroLogistica === 'ENTREGADOS' ? 'bg-white border-[#4a1d44] text-[#4a1d44] shadow-sm' : 'bg-transparent border-transparent text-[#4a1d44]/30 hover:text-[#4a1d44]'}`}>
                  <Archive size={14} /> Ya Entregados
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Listado de Pedidos */}
        <div className="grid gap-6 mb-20">
          {ventasFiltradas.length === 0 ? (
            <div className="bg-white p-20 rounded-[2.5rem] text-center border-2 border-dashed border-[#4a1d44]/5">
              <p className="opacity-30 font-bold italic">No hay pedidos pendientes en esta sección.</p>
            </div>
          ) : (
            ventasFiltradas.map((venta) => (
              <div key={venta.id} className="bg-white rounded-[2.5rem] border border-[#4a1d44]/10 overflow-hidden hover:shadow-xl transition-all duration-500">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${venta.estado_pago === 'APROBADO' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {venta.estado_pago === 'APROBADO' ? <CheckCircle2 size={10} className="inline mr-1" /> : <Clock size={10} className="inline mr-1" />}
                        {venta.estado_pago || 'PENDIENTE'}
                      </span>
                      {venta.estado_logistico && (
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${venta.estado_logistico === 'ENTREGADO' ? 'bg-blue-600 text-white border-blue-700' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {venta.estado_logistico}
                        </span>
                      )}
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

                  <div className="w-full md:w-64 flex flex-col justify-between items-start md:items-end gap-4">
                    <div className="text-left md:text-right w-full">
                      <p className="text-[9px] opacity-30 uppercase font-black mb-1">Monto Cobrado</p>
                      <p className="text-3xl font-black">${Number(venta.monto_total).toLocaleString('es-CO')}</p>
                      
                      {venta.numero_guia && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 text-left">
                          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Guía de envío</p>
                          <p className="text-xs font-bold text-blue-700">{venta.empresa_envio}: {venta.numero_guia}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full flex flex-col gap-2">
                      {venta.estado_pago === 'APROBADO' && venta.estado_logistico !== 'ENTREGADO' && (
                        <>
                          {!venta.numero_guia ? (
                            <button onClick={() => setPedidoADespachar(venta)} className="w-full bg-[#4a1d44] text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#6b2b62] transition-all shadow-md flex items-center justify-center gap-2">
                              <Truck size={14} /> Registrar Guía
                            </button>
                          ) : (
                            <button onClick={() => handleMarcarEntregado(venta.id)} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2">
                              <CheckCircle2 size={14} /> Marcar como Entregado
                            </button>
                          )}
                        </>
                      )}
                      
                      <a href="https://comercios.wompi.co/" target="_blank" className="w-full bg-[#f2e1d9] text-[#4a1d44] py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#4a1d44] hover:text-white transition-all">
                        Panel Wompi <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL PARA REGISTRAR GUÍA */}
      {pedidoADespachar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative">
            <button onClick={() => setPedidoADespachar(null)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition"><XCircle size={24} className="opacity-20" /></button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#fdf8f6] rounded-full flex items-center justify-center mx-auto mb-4 text-[#4a1d44]"><Send size={32} /></div>
              <h2 className="text-2xl font-black font-playfair">Despachar Pedido</h2>
              <p className="text-xs opacity-50 mt-1 uppercase font-bold tracking-widest">Para: {pedidoADespachar.nombre_cliente}</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Transportadora</label>
                <select value={guiaForm.empresa} onChange={(e) => setGuiaForm({...guiaForm, empresa: e.target.value})} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none font-bold text-sm border-2 border-transparent focus:border-[#4a1d44]/10 transition-all cursor-pointer">
                  {EMPRESAS_ENVIO.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Número de Guía</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <input autoFocus placeholder="Ej: 1234567890" value={guiaForm.numero} onChange={(e) => setGuiaForm({...guiaForm, numero: e.target.value})} className="w-full p-4 pl-12 rounded-2xl bg-[#fdf8f6] outline-none font-bold text-sm border-2 border-transparent focus:border-[#4a1d44]/10 transition-all" />
                </div>
              </div>
              <button disabled={procesandoAccion} onClick={handleDespachar} className="w-full bg-[#4a1d44] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-[#6b2b62] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                {procesandoAccion ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                {procesandoAccion ? 'Guardando...' : 'Confirmar Envío'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
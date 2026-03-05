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
  Loader2,
  Bike
} from 'lucide-react';

const EMPRESAS_ENVIO = ['Interrapidisimo', 'Servientrega', 'Envía', 'Coordinadora', 'Domicilio Local', 'Otro'];

export default function AdminPedidos() {
  const router = useRouter();
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros principales
  const [filtroEstadoPago, setFiltroEstadoPago] = useState('APROBADO'); 
  const [filtroLogistica, setFiltroLogistica] = useState('POR_DESPACHAR'); 
  
  // Filtros secundarios
  const [filtroCiudad, setFiltroCiudad] = useState('Todas');
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

  const handleDespacharConGuia = async () => {
    if (!guiaForm.numero) return toast.error("Escribe el número de guía");
    setProcesandoAccion(true);
    try {
      const { error } = await supabase.from('ventas_realizadas').update({
        numero_guia: guiaForm.numero,
        empresa_envio: guiaForm.empresa,
        estado_logistico: 'ENVIADO'
      }).eq('id', pedidoADespachar.id);
      
      if (error) throw error;
      
      toast.success("Pedido movido a 'En Camino'");
      setPedidoADespachar(null);
      // Forzamos actualización local inmediata
      setVentas(prev => prev.map(v => v.id === pedidoADespachar.id ? { ...v, estado_logistico: 'ENVIADO', numero_guia: guiaForm.numero, empresa_envio: guiaForm.empresa } : v));
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleDespachoDomiciliario = async (id: string) => {
    if (!confirm("¿Despachar este pedido con domiciliario local?")) return;
    setProcesandoAccion(true);
    try {
      const { error } = await supabase.from('ventas_realizadas').update({
        estado_logistico: 'ENVIADO',
        empresa_envio: 'Domicilio Local',
        numero_guia: 'DOMICILIO-' + Date.now().toString().slice(-4)
      }).eq('id', id);
      
      if (error) throw error;
      
      toast.success("Pedido movido a 'En Camino'");
      // Actualización local
      setVentas(prev => prev.map(v => v.id === id ? { ...v, estado_logistico: 'ENVIADO', empresa_envio: 'Domicilio Local' } : v));
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleMarcarEntregado = async (id: string) => {
    if (!confirm("¿Confirmas que este pedido ya fue entregado?")) return;
    setProcesandoAccion(true);
    try {
      const { error } = await supabase.from('ventas_realizadas').update({ estado_logistico: 'ENTREGADO' }).eq('id', id);
      if (error) throw error;
      toast.success("Venta movida a 'Finalizados'");
      setVentas(prev => prev.map(v => v.id === id ? { ...v, estado_logistico: 'ENTREGADO' } : v));
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setProcesandoAccion(false);
    }
  };

  const ventasSegunPagoYLogistica = useMemo(() => {
    let base = [...ventas];
    if (filtroEstadoPago !== 'Todos') {
      base = base.filter(v => (v.estado_pago || 'PENDIENTE') === filtroEstadoPago);
    }
    if (filtroEstadoPago === 'APROBADO') {
      if (filtroLogistica === 'POR_DESPACHAR') {
        base = base.filter(v => (v.estado_logistico || 'PREPARANDO') === 'PREPARANDO');
      } else if (filtroLogistica === 'EN_CAMINO') {
        base = base.filter(v => v.estado_logistico === 'ENVIADO');
      } else if (filtroLogistica === 'ENTREGADOS') {
        base = base.filter(v => v.estado_logistico === 'ENTREGADO');
      }
    }
    return base;
  }, [ventas, filtroEstadoPago, filtroLogistica]);

  const ciudadesDisponibles = useMemo(() => {
    const ciudades = ventasSegunPagoYLogistica.map(v => v.ciudad).filter(Boolean);
    return ['Todas', ...Array.from(new Set(ciudades))];
  }, [ventasSegunPagoYLogistica]);

  const ventasFinales = useMemo(() => {
    let res = [...ventasSegunPagoYLogistica];
    if (filtroCiudad !== 'Todas') res = res.filter(v => v.ciudad === filtroCiudad);
    res.sort((a, b) => ordenPrioridad === 'Recientes' ? new Date(b.fecha).getTime() - new Date(a.fecha).getTime() : new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    return res;
  }, [ventasSegunPagoYLogistica, filtroCiudad, ordenPrioridad]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fdf8f6] font-playfair animate-pulse text-[#4a1d44]">Cargando gestión logística...</div>;

  return (
    <div className="min-h-screen bg-[#fdf8f6] p-4 md:p-10 text-[#4a1d44]">
      <div className="max-w-7xl mx-auto pb-20">

        <button onClick={() => router.push('/admin')} className="flex items-center gap-3 text-[#4a1d44]/50 hover:text-[#4a1d44] transition-all mb-8 group">
          <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all"><ArrowLeft size={18} /></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Volver al Panel</span>
        </button>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black font-playfair text-[#4a1d44]">Ventas & Logística</h1>
            <p className="opacity-60 text-sm mt-1">Gestión inteligente de pedidos y envíos</p>
          </div>
          
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="bg-white p-1 rounded-2xl flex border border-[#4a1d44]/5 shadow-sm">
              {/* Botón Ventas Reales con fondo verde */}
              <button 
                onClick={() => { setFiltroEstadoPago('APROBADO'); setFiltroLogistica('POR_DESPACHAR'); }} 
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtroEstadoPago === 'APROBADO' ? 'bg-green-600 text-white shadow-lg' : 'text-[#4a1d44]/40 hover:bg-gray-50'}`}
              >
                Ventas Reales
              </button>
              <button onClick={() => setFiltroEstadoPago('PENDIENTE')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtroEstadoPago === 'PENDIENTE' ? 'bg-amber-500 text-white shadow-lg' : 'text-[#4a1d44]/40 hover:bg-gray-50'}`}>Pendientes</button>
              <button onClick={() => setFiltroEstadoPago('Todos')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtroEstadoPago === 'Todos' ? 'bg-gray-800 text-white shadow-lg' : 'text-[#4a1d44]/40 hover:bg-gray-50'}`}>Historial</button>
            </div>

            {filtroEstadoPago === 'APROBADO' && (
              <div className="flex bg-white/50 p-1 rounded-2xl gap-1">
                <button onClick={() => setFiltroLogistica('POR_DESPACHAR')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filtroLogistica === 'POR_DESPACHAR' ? 'bg-white text-[#4a1d44] shadow-sm' : 'text-[#4a1d44]/30 hover:text-[#4a1d44]'}`}>
                  <Inbox size={14} /> Por Despachar
                </button>
                <button onClick={() => setFiltroLogistica('EN_CAMINO')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filtroLogistica === 'EN_CAMINO' ? 'bg-white text-[#4a1d44] shadow-sm' : 'text-[#4a1d44]/30 hover:text-[#4a1d44]'}`}>
                  <Truck size={14} /> En camino
                </button>
                <button onClick={() => setFiltroLogistica('ENTREGADOS')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filtroLogistica === 'ENTREGADOS' ? 'bg-white text-[#4a1d44] shadow-sm' : 'text-[#4a1d44]/30 hover:text-[#4a1d44]'}`}>
                  <CheckCircle2 size={14} /> Finalizados
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Filtros Secundarios */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="bg-white px-5 py-3 rounded-2xl border border-[#4a1d44]/5 shadow-sm flex items-center gap-3 flex-1">
            <Filter size={16} className="opacity-30" />
            <div className="flex-1">
              <p className="text-[8px] font-black uppercase tracking-tighter opacity-30">Filtrar ciudad actual</p>
              <select value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)} className="bg-transparent text-sm font-bold outline-none w-full cursor-pointer">
                {ciudadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-[#4a1d44]/5 shadow-sm flex items-center gap-3 flex-1">
            <ArrowDownUp size={16} className="opacity-30" />
            <div className="flex-1">
              <p className="text-[8px] font-black uppercase tracking-tighter opacity-30">Orden de lista</p>
              <select value={ordenPrioridad} onChange={(e) => setOrdenPrioridad(e.target.value)} className="bg-transparent text-sm font-bold outline-none w-full cursor-pointer">
                <option value="Recientes">Más recientes</option>
                <option value="Antiguos">Más antiguos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listado */}
        <div className="grid gap-6">
          {ventasFinales.length === 0 ? (
            <div className="bg-white py-32 rounded-[3rem] text-center border-2 border-dashed border-[#4a1d44]/5">
              <Package size={48} className="mx-auto opacity-5 mb-4" />
              <p className="opacity-30 font-bold italic uppercase tracking-widest text-xs">Sin pedidos en esta sección</p>
            </div>
          ) : (
            ventasFinales.map((venta) => {
              const esValledupar = venta.ciudad?.toLowerCase() === 'valledupar';
              return (
                <div key={venta.id} className="bg-white rounded-[2.5rem] border border-[#4a1d44]/10 overflow-hidden hover:shadow-2xl transition-all duration-500">
                  <div className="p-6 md:p-10 flex flex-col md:flex-row gap-8">
                    
                    <div className="flex-1 space-y-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-white ${venta.estado_pago === 'APROBADO' ? 'text-green-600 border-green-100' : 'text-amber-600 border-amber-100'}`}>
                          {venta.estado_pago === 'APROBADO' ? '● PAGADO' : '○ PENDIENTE'}
                        </span>
                        
                        {esValledupar && (
                          <span className="bg-[#4a1d44] text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Truck size={12} /> Prioridad Valledupar
                          </span>
                        )}

                        <span className="text-[10px] opacity-40 font-bold uppercase">{new Date(venta.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div>
                        <h3 className="text-2xl font-black text-[#4a1d44] tracking-tight">{venta.nombre_cliente}</h3>
                        <p className="text-xs opacity-50 font-medium">{venta.email_cliente} • {venta.telefono_cliente}</p>
                      </div>

                      <div className="flex items-start gap-3 text-sm p-4 bg-[#fdf8f6] rounded-2xl border border-[#4a1d44]/5">
                        <MapPin size={18} className="shrink-0 text-[#4a1d44]/20" />
                        <p className="leading-relaxed">
                          <strong className="text-[#4a1d44]">{venta.ciudad}</strong> <br />
                          <span className="opacity-60 text-xs font-medium">{venta.direccion_envio}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 border-y md:border-y-0 md:border-x border-gray-50 px-0 md:px-8 py-6 md:py-0">
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-5 flex items-center gap-2">
                        <Package size={14} /> Artículos del Pedido
                      </h4>
                      <div className="space-y-3">
                        {venta.detalle_compra?.map((item: any, idx: number) => (
                          <div key={idx} className="flex flex-col gap-1.5 bg-[#fdf8f6]/50 p-3.5 rounded-2xl border border-[#4a1d44]/5">
                            <div className="flex justify-between text-xs font-black">
                              <span className="truncate pr-2 uppercase"><span className="bg-[#4a1d44] text-white px-1.5 py-0.5 rounded text-[9px] mr-2">{item.quantity}x</span> {item.nombre}</span>
                              <span className="text-[#4a1d44]/60">${Number(item.precio * item.quantity).toLocaleString('es-CO')}</span>
                            </div>
                            {item.talla && <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-pink-600 ml-8"><Ruler size={10} /> Talla: {item.talla.nombre}</div>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="w-full md:w-64 flex flex-col justify-between items-start md:items-end gap-6">
                      <div className="text-left md:text-right w-full">
                        <p className="text-[10px] opacity-30 uppercase font-black tracking-widest mb-1">Total Cobrado</p>
                        <p className="text-4xl font-black text-[#4a1d44]">${Number(venta.monto_total).toLocaleString('es-CO')}</p>
                        
                        {venta.numero_guia && (
                          <div className="mt-4 p-3.5 bg-blue-50 rounded-2xl border border-blue-100 text-left">
                            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Estado: {venta.estado_logistico}</p>
                            <p className="text-xs font-bold text-blue-700">{venta.empresa_envio}</p>
                            <p className="text-[10px] font-mono text-blue-800/60 mt-1">{venta.numero_guia}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="w-full flex flex-col gap-3">
                        {venta.estado_pago === 'APROBADO' && (
                          <>
                            {(venta.estado_logistico || 'PREPARANDO') === 'PREPARANDO' && (
                              <div className="flex flex-col gap-2">
                                {!esValledupar ? (
                                  <button onClick={() => setPedidoADespachar(venta)} className="w-full bg-[#4a1d44] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#6b2b62] transition-all shadow-xl flex items-center justify-center gap-2">
                                    <Truck size={16} /> Registrar Guía Nacional
                                  </button>
                                ) : (
                                  <button onClick={() => handleDespachoDomiciliario(venta.id)} className="w-full bg-[#4a1d44] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#6b2b62] transition-all shadow-xl flex items-center justify-center gap-2">
                                    <Bike size={16} /> Enviar con Domiciliario
                                  </button>
                                )}
                              </div>
                            )}

                            {venta.estado_logistico === 'ENVIADO' && (
                              <button onClick={() => handleMarcarEntregado(venta.id)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> Marcar como Entregado
                              </button>
                            )}
                          </>
                        )}
                        
                        <a href="https://comercios.wompi.co/" target="_blank" className="w-full bg-gray-50 text-[#4a1d44]/40 py-3 rounded-2xl font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white hover:text-[#4a1d44] border border-transparent hover:border-[#4a1d44]/10 transition-all">
                          Auditar en Wompi <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {pedidoADespachar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative border border-[#4a1d44]/5">
            <button onClick={() => setPedidoADespachar(null)} className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full transition"><XCircle size={28} className="opacity-20" /></button>
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-[#fdf8f6] rounded-full flex items-center justify-center mx-auto mb-4 text-[#4a1d44]"><Send size={40} /></div>
              <h2 className="text-3xl font-black font-playfair">Despacho Nacional</h2>
              <p className="text-[10px] opacity-40 mt-2 uppercase font-black tracking-widest">Pedido para: {pedidoADespachar.nombre_cliente}</p>
            </div>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-2">Empresa Transportadora</label>
                <select value={guiaForm.empresa} onChange={(e) => setGuiaForm({...guiaForm, empresa: e.target.value})} className="w-full p-5 rounded-3xl bg-[#fdf8f6] outline-none font-bold text-sm border-2 border-transparent focus:border-[#4a1d44]/10 transition-all cursor-pointer appearance-none">
                  {EMPRESAS_ENVIO.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-2">Número de Guía Oficial</label>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={20} />
                  <input autoFocus placeholder="Ej: 1098234567" value={guiaForm.numero} onChange={(e) => setGuiaForm({...guiaForm, numero: e.target.value})} className="w-full p-5 pl-14 rounded-3xl bg-[#fdf8f6] outline-none font-bold text-sm border-2 border-transparent focus:border-[#4a1d44]/10 transition-all" />
                </div>
              </div>
              <button disabled={procesandoAccion} onClick={handleDespacharConGuia} className="w-full bg-[#4a1d44] text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-[#6b2b62] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                {procesandoAccion ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                Confirmar Despacho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
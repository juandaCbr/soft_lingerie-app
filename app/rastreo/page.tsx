"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Search, Package, Truck, CheckCircle2, ArrowRight, Loader2, MapPin, Bike } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function RastreoContent() {
  const [busqueda, setBusqueda] = useState('');
  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();

  const ejecutarBusqueda = useCallback(async (termino: string) => {
    if (!termino) return;
    setLoading(true);
    setError('');
    setPedido(null);

    try {
      const { data, error: dbError } = await supabase
        .from('ventas_realizadas')
        .select('*')
        .or(`email_cliente.eq.${termino.trim()},referencia_wompi.ilike.%${termino.trim()}%`)
        .eq('estado_pago', 'APROBADO')
        .order('fecha', { ascending: false })
        .limit(1)
        .single();

      if (dbError || !data) {
        setError('No encontramos ningún pedido pagado con esos datos.');
      } else {
        setPedido(data);
      }
    } catch (err) {
      setError('Hubo un error al buscar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setBusqueda(ref);
      ejecutarBusqueda(ref);
    }
  }, [searchParams, ejecutarBusqueda]);

  // WEBSOCKET (REALTIME) - Escuchar cambios en el pedido que se está visualizando
  useEffect(() => {
    if (!pedido?.id) return;

    const canalRastreo = supabase
      .channel(`rastreo-pedido-${pedido.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'ventas_realizadas', 
          filter: `id=eq.${pedido.id}` 
        },
        (payload) => {
          // Actualizar el estado del pedido en pantalla automáticamente
          setPedido(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalRastreo);
    };
  }, [pedido?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutarBusqueda(busqueda);
  };

  const obtenerProgreso = (estado: string) => {
    if (estado === 'ENTREGADO') return 100;
    if (estado === 'ENVIADO') return 66;
    return 33;
  };

  const getLinkTransportadora = (empresa: string, guia: string) => {
    const cleanGuia = guia.trim();
    if (empresa === 'Interrapidisimo') return `https://www.interrapidisimo.com/sigue-tu-envio/?guia=${cleanGuia}`;
    if (empresa === 'Servientrega') return `https://mobile.servientrega.com/WebSite.Portal.Transporte.Rastreo/SeguimientoGuias?Id=${cleanGuia}`;
    if (empresa === 'Envía' || empresa === 'Envia') return `https://envia.co/`;
    if (empresa === 'Coordinadora') return `https://www.coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo/?guia=${cleanGuia}`;
    return '#';
  };

  return (
    <main className="min-h-screen bg-[#fdf8f6] text-[#4a1d44] py-20 px-6">
      <div className="max-w-2xl mx-auto">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black font-playfair italic mb-4 text-[#4a1d44]">Rastrea tu pedido</h1>
          <p className="opacity-60 text-sm uppercase font-bold tracking-widest">Ingresa tu correo o número de pedido</p>
        </div>

        <form onSubmit={handleSubmit} className="relative mb-12">
          <input 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="ejemplo@correo.com o SOFT-123..."
            className="w-full p-6 pr-20 rounded-[2rem] bg-white shadow-xl outline-none border-2 border-transparent focus:border-[#4a1d44]/10 transition-all font-medium text-[#4a1d44]"
          />
          <button 
            disabled={loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#4a1d44] text-white p-4 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
          </button>
        </form>

        {error && <p className="text-center text-red-500 font-bold mb-8 animate-bounce">{error}</p>}

        {pedido && (
          <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl animate-in zoom-in duration-500 border border-[#4a1d44]/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Estado del envío</span>
                <h2 className="text-2xl font-black text-[#4a1d44] uppercase tracking-tight">
                  {pedido.estado_logistico || 'PREPARANDO'}
                </h2>
              </div>
              <div className="text-left md:text-right">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Referencia</span>
                <p className="font-mono text-sm opacity-60">{pedido.referencia_wompi.split(' ')[0]}</p>
              </div>
            </div>

            <div className="relative h-2 bg-[#fdf8f6] rounded-full mb-12 overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-[#4a1d44] transition-all duration-1000 ease-out"
                style={{ width: `${obtenerProgreso(pedido.estado_logistico)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-12">
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`p-3 rounded-full ${obtenerProgreso(pedido.estado_logistico) >= 33 ? 'bg-[#4a1d44] text-white shadow-lg' : 'bg-gray-100 opacity-30'}`}><Package size={20} /></div>
                <span className="text-[8px] font-black uppercase tracking-widest">Preparando</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`p-3 rounded-full ${obtenerProgreso(pedido.estado_logistico) >= 66 ? 'bg-[#4a1d44] text-white shadow-lg' : 'bg-gray-100 opacity-30'}`}><Truck size={20} /></div>
                <span className="text-[8px] font-black uppercase tracking-widest">En camino</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`p-3 rounded-full ${obtenerProgreso(pedido.estado_logistico) >= 100 ? 'bg-[#4a1d44] text-white shadow-lg' : 'bg-gray-100 opacity-30'}`}><CheckCircle2 size={20} /></div>
                <span className="text-[8px] font-black uppercase tracking-widest">Entregado</span>
              </div>
            </div>

            {pedido.estado_logistico === 'ENVIADO' && (
              <div className="bg-[#fdf8f6] p-8 rounded-[2.5rem] border border-[#4a1d44]/5 mb-8">
                {pedido.ciudad?.toLowerCase() === 'valledupar' ? (
                  <div className="flex items-center gap-5">
                    <div className="bg-white p-4 rounded-full shadow-sm text-pink-600 animate-bounce"><Bike size={32} /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#4a1d44]/40 mb-1">Envío Local Detectado</p>
                      <p className="font-bold text-[#4a1d44] text-sm leading-relaxed">
                        ¡Buenas noticias! En breve un domiciliario llevará tu pedido directamente a tu puerta en Valledupar.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-5">
                    <div className="bg-white p-4 rounded-2xl shadow-sm text-[#4a1d44]"><MapPin size={28} /></div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Transportadora: {pedido.empresa_envio}</p>
                      <p className="font-bold text-lg mb-4">Guía: {pedido.numero_guia}</p>
                      <a 
                        href={getLinkTransportadora(pedido.empresa_envio, pedido.numero_guia)}
                        target="_blank"
                        className="inline-flex items-center gap-3 bg-[#4a1d44] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6b2b62] transition-all shadow-md"
                      >
                        Ver en tiempo real <ArrowRight size={14} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 pt-8">
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-4 text-center">Resumen de tu pedido</p>
              <div className="flex flex-wrap justify-center gap-3">
                {pedido.detalle_compra?.map((item: any, i: number) => (
                  <div key={i} className="px-4 py-2 bg-gray-50 rounded-xl text-[10px] font-bold border border-gray-100 text-[#4a1d44]/60">
                    {item.quantity}x {item.nombre} {item.talla && `(Talla: ${item.talla.nombre})`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/productos" className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all border-b border-[#4a1d44]/20 pb-1 text-[#4a1d44]">
            ← Volver a la tienda
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function RastreoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdf8f6]" />}>
      <RastreoContent />
    </Suspense>
  );
}
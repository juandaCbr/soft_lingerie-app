"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Search, Package, Truck, CheckCircle2, ArrowRight, Loader2, MapPin, Bike, Copy, ClipboardCheck, Mail, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CHECKOUT_ENVIO, esCiudadEnvioLocal } from '@/app/lib/checkout-config';
import { HomeCloud, HomeCloudBank } from '@/components/home/HomeCloud';
import { contactWhatsAppHref } from '@/app/lib/contacto';

/** Qué puede escribir la clienta en el buscador (solo informativo) */
const FORMAS_DE_BUSCAR = [
  { icon: Package, titulo: 'Tu número de pedido', texto: 'Empieza por SOFT- y lo recibiste al finalizar tu compra.' },
  { icon: Mail, titulo: 'Tu correo', texto: 'El mismo correo que usaste en el checkout.' },
  { icon: Truck, titulo: 'Tu guía de envío', texto: 'Te la compartimos cuando despachamos tu pedido.' },
];

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

    const queryTerm = termino.trim();
    console.log("Iniciando búsqueda robusta para:", queryTerm);

    const realizarBusqueda = async (t: string) => {
      // Intentamos buscar por Referencia (LIKE), Guía (EQ) o Email (EQ)
      // Usamos .or() para que sea una sola consulta eficiente
      const { data, error: dbError } = await supabase
        .from('ventas_realizadas')
        .select('*')
        .or(`referencia_wompi.ilike.%${t}%,numero_guia.eq.${t},email_cliente.eq.${t}`)
        .order('fecha', { ascending: false });
      
      return { data, error: dbError };
    };

    try {
      let { data, error: dbError } = await realizarBusqueda(queryTerm);

      // Reintento automático de 2 segundos si venimos de un pago inmediato y no hay resultados
      if ((!data || data.length === 0) && searchParams.get('ref') === termino) {
        console.log("Pedido no encontrado tras el pago. Reintentando en 2.5 segundos...");
        await new Promise(r => setTimeout(r, 2500));
        const retry = await realizarBusqueda(queryTerm);
        data = retry.data;
        dbError = retry.error;
      }

      if (dbError) throw dbError;

      if (data && data.length > 0) {
        setPedido(data[0]);
      } else {
        setError('No encontramos ningún pedido con esos datos. Verifica que la referencia, el correo o el número de guía sean correctos.');
      }
    } catch (err) {
      console.error("Error global en búsqueda:", err);
      setError('Hubo un error al buscar el pedido. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setBusqueda(ref);
      ejecutarBusqueda(ref);
    }
  }, [searchParams, ejecutarBusqueda]);

  useEffect(() => {
    if (!pedido?.id) return;
    const canalRastreo = supabase
      .channel(`rastreo-pedido-${pedido.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ventas_realizadas', filter: `id=eq.${pedido.id}` }, (payload) => {
        setPedido(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(canalRastreo); };
  }, [pedido?.id]);

  const copiarGuia = (guia: string) => {
    navigator.clipboard.writeText(guia);
    toast.success("Número de guía copiado");
  };

  const obtenerProgreso = (estado: string) => {
    if (estado === 'ENTREGADO') return 100;
    if (estado === 'ENVIADO') return 66;
    return 33;
  };

  const getLinkTransportadora = (empresa: string) => {
    if (empresa === 'Interrapidisimo') return `https://www.interrapidisimo.com/sigue-tu-envio/`;
    if (empresa === 'Servientrega') return `https://www.servientrega.com/wps/portal/Colombia/transaccional/rastreo-envios`;
    if (empresa === 'Envía' || empresa === 'Envia') return `https://envia.co/`;
    if (empresa === 'Coordinadora') return `https://www.coordinadora.com/portafolio-de-servicios/servicios-en-linea/rastreo-de-guias/`;
    return '#';
  };

  return (
    <main className="min-h-screen bg-cream pb-20 font-display text-ink">
      {/* Encabezado: el cielo rosa de la marca con el buscador flotando sobre las nubes */}
      <div className="px-2 sm:px-3">
        <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-[radial-gradient(130%_90%_at_50%_0%,#d7a9c7_0%,#e5bed7_38%,#f2cbe2_72%,#f6d6e9_100%)] px-6 pb-36 pt-14 text-center md:rounded-[2.75rem] md:pb-40 md:pt-20">
          <HomeCloud fade sizes="20vw" className="left-[-5%] top-[8%] aspect-[2/1] w-[36%] opacity-60 md:w-[14%]" />
          <HomeCloud fade flip sizes="16vw" className="right-[-4%] top-[4%] aspect-[2/1] w-[30%] opacity-50 md:w-[12%]" />
          <p className="relative text-sm font-semibold text-brand-dark">Seguimiento</p>
          <h1 className="relative mt-2 text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-7xl">Rastrea tu pedido</h1>
          <p className="relative mx-auto mt-4 max-w-md text-base text-ink/70 md:text-lg">Ingresa tu correo, tu número de pedido o tu guía de envío.</p>
          <HomeCloudBank className="inset-x-0 bottom-0 top-[78%]" />
        </div>
      </div>

      <div className="mx-auto -mt-20 max-w-2xl px-4 sm:px-6">
        <form onSubmit={(e) => { e.preventDefault(); ejecutarBusqueda(busqueda); }} className="relative z-10 mb-10">
          <label className="sr-only" htmlFor="busqueda-pedido">Correo, número de pedido o guía</label>
          <input
            id="busqueda-pedido"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="ejemplo@correo.com o SOFT-123..."
            className="w-full rounded-full bg-white py-5 pl-7 pr-20 text-base font-medium text-ink shadow-xl shadow-ink/10 outline-none ring-1 ring-ink/5 transition placeholder:text-ink/40 focus:ring-2 focus:ring-brand-primary"
          />
          <button
            disabled={loading}
            aria-label="Buscar pedido"
            className="absolute right-2.5 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-ink text-white shadow-lg transition-colors hover:bg-brand-dark active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
          </button>
        </form>

        {error && <p className="mb-8 rounded-[1.5rem] bg-white px-6 py-4 text-center font-medium text-red-600 ring-1 ring-red-100">{error}</p>}

        {pedido && (
          <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-ink/10 ring-1 ring-ink/5 animate-in zoom-in duration-500 md:p-10">
            <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <span className="text-sm font-semibold text-brand-dark">Estado del envío</span>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-bold tracking-[-0.03em]">
                    {pedido.estado_logistico || 'PREPARANDO'}
                  </h2>
                  {pedido.estado_pago === 'PENDIENTE' && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      Pago pendiente
                    </span>
                  )}
                </div>
              </div>
              <div className="text-left md:text-right">
                <span className="text-sm font-semibold text-brand-dark">Referencia</span>
                <p className="mt-1 text-sm font-medium tabular-nums text-ink/65">{pedido.referencia_wompi?.split(' ')[0] || '---'}</p>
              </div>
            </div>

            <div className="relative mb-8 h-2 overflow-hidden rounded-full bg-blush">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-ink transition-all duration-1000 ease-out"
                style={{ width: `${obtenerProgreso(pedido.estado_logistico)}%` }}
              />
            </div>

            <div className="mb-10 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className={`grid h-12 w-12 place-items-center rounded-full ${obtenerProgreso(pedido.estado_logistico) >= 33 ? 'bg-ink text-white shadow-lg shadow-ink/20' : 'bg-blush text-ink/30'}`}><Package size={20} /></div>
                <span className="text-sm font-medium">Preparando</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className={`grid h-12 w-12 place-items-center rounded-full ${obtenerProgreso(pedido.estado_logistico) >= 66 ? 'bg-ink text-white shadow-lg shadow-ink/20' : 'bg-blush text-ink/30'}`}><Truck size={20} /></div>
                <span className="text-sm font-medium">En camino</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className={`grid h-12 w-12 place-items-center rounded-full ${obtenerProgreso(pedido.estado_logistico) >= 100 ? 'bg-ink text-white shadow-lg shadow-ink/20' : 'bg-blush text-ink/30'}`}><CheckCircle2 size={20} /></div>
                <span className="text-sm font-medium">Entregado</span>
              </div>
            </div>

            {pedido.estado_logistico === 'ENVIADO' && (
              <div className="mb-8 rounded-[1.75rem] bg-cream p-6 md:p-8">
                {esCiudadEnvioLocal(pedido.ciudad ?? '') ? (
                  <div className="flex items-center gap-5">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm"><Bike size={28} /></div>
                    <div>
                      <p className="mb-1 text-sm font-semibold text-brand-dark">Envío local</p>
                      <p className="text-[15px] font-medium leading-relaxed text-ink">
                        ¡Buenas noticias! En breve un domiciliario llevará tu pedido directamente a tu puerta en {CHECKOUT_ENVIO.ciudadLocal}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-5">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm"><MapPin size={26} /></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-brand-dark">Transportadora: {pedido.empresa_envio}</p>
                      <div className="mb-4 mt-1 flex items-center gap-3">
                        <p className="text-lg font-semibold tabular-nums">Guía: {pedido.numero_guia}</p>
                        <button onClick={() => copiarGuia(pedido.numero_guia)} aria-label="Copiar número de guía" className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink/50 ring-1 ring-ink/10 transition-colors hover:text-ink">
                          <Copy size={14} />
                        </button>
                      </div>
                      <a
                        href={getLinkTransportadora(pedido.empresa_envio)}
                        target="_blank"
                        className="inline-flex min-h-12 items-center gap-3 rounded-full bg-ink px-6 text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-dark"
                      >
                        Ir a rastrear ahora <ArrowRight size={16} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-ink/5 pt-6">
              <p className="mb-4 text-center text-sm font-semibold text-ink/60">Resumen de tu pedido</p>
              <div className="flex flex-wrap justify-center gap-2">
                {pedido.detalle_compra?.filter((item: any) => !item.es_envio).map((item: any, i: number) => (
                  <div key={i} className="rounded-full bg-cream px-4 py-2 text-sm font-medium text-ink/75">
                    {item.quantity}x {item.nombre} {item.talla && `(Talla: ${item.talla.nombre})`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!pedido && !loading && (
          <div className="space-y-10">
            <section>
              <h2 className="mb-5 text-center text-2xl font-bold tracking-[-0.03em] md:text-3xl">¿Con qué puedes buscar?</h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {FORMAS_DE_BUSCAR.map(({ icon: Icono, titulo, texto }) => (
                  <li key={titulo} className="rounded-[1.75rem] bg-white p-5 text-center shadow-sm ring-1 ring-ink/5">
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-accent text-ink">
                      <Icono size={20} aria-hidden />
                    </div>
                    <p className="text-base font-semibold">{titulo}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink/60">{texto}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-5 text-center text-2xl font-bold tracking-[-0.03em] md:text-3xl">Así avanza tu pedido</h2>
              <ol className="grid grid-cols-3 gap-2 rounded-[1.75rem] bg-white p-6 ring-1 ring-ink/5">
                {[
                  { icon: Package, titulo: 'Preparando', texto: 'Empacamos tu pedido con cuidado.' },
                  { icon: Truck, titulo: 'En camino', texto: 'Va con la transportadora o el domiciliario.' },
                  { icon: CheckCircle2, titulo: 'Entregado', texto: 'Ya está en tus manos.' },
                ].map(({ icon: Icono, titulo, texto }) => (
                  <li key={titulo} className="flex flex-col items-center gap-2 text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white"><Icono size={20} aria-hidden /></div>
                    <span className="text-sm font-semibold">{titulo}</span>
                    <span className="hidden text-xs leading-snug text-ink/55 sm:block">{texto}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="relative overflow-hidden rounded-[2rem] bg-ink px-6 pb-24 pt-10 text-center text-white md:px-10">
              <div className="relative z-[1]">
                <h2 className="text-3xl font-bold tracking-[-0.03em]">¿No encuentras tu pedido?</h2>
                <p className="mx-auto mt-3 max-w-sm text-white/70">Escríbenos y lo buscamos por ti.</p>
                <a
                  href={contactWhatsAppHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-brand-accent px-8 text-sm font-bold text-ink transition-colors hover:bg-white"
                >
                  <MessageCircle size={18} aria-hidden /> Escríbenos por WhatsApp
                </a>
              </div>
              <HomeCloudBank className="inset-x-0 bottom-0 top-[74%]" />
            </section>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/productos" className="text-sm font-semibold text-ink/60 underline decoration-brand-primary decoration-2 underline-offset-4 transition-colors hover:text-ink">
            ← Volver a la tienda
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function RastreoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <RastreoContent />
    </Suspense>
  );
}
"use client";

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { COLOMBIA_COMPLETA } from '@/app/lib/colombia';
import { Truck, MapPin, Lock, ShieldCheck, ArrowLeft, User, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import toast from 'react-hot-toast';
import BotonWompi from '@/components/BotonWompi';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [preparandoPago, setPreparandoPago] = useState(false);
  const router = useRouter();

  const [referenciaUnica, setReferenciaUnica] = useState('');
  const [pedidoIdExistente, setPedidoIdExistente] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    departamento: 'Cesar',
    ciudad: '',
    direccion: '',
    barrio: '',
    apartamento: '',
  });

  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([]);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [metodoPagoEnvio, setMetodoPagoEnvio] = useState<'INCLUIDO' | 'CONTRAENTREGA'>('INCLUIDO');

  useEffect(() => {
    const ciudades = COLOMBIA_COMPLETA[formData.departamento] || [];
    setCiudadesDisponibles(ciudades);
    if (!ciudades.includes(formData.ciudad)) {
      setFormData(prev => ({ ...prev, ciudad: ciudades[0] || '' }));
    }
  }, [formData.departamento, formData.ciudad]);

  useEffect(() => {
    if (formData.ciudad === 'Valledupar') {
      setCostoEnvio(6000);
    } else if (formData.ciudad) {
      setCostoEnvio(18000);
    } else {
      setCostoEnvio(0);
    }
  }, [formData.ciudad]);

  const totalConEnvio = totalPrice + (metodoPagoEnvio === 'INCLUIDO' ? costoEnvio : 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const registrarPedidoPendiente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const referencia = referenciaUnica || `SOFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const direccionCompleta = `${formData.direccion}, Barrio: ${formData.barrio}${formData.apartamento ? ', Apto: ' + formData.apartamento : ''} (${formData.departamento})`;

      const infoEnvio = {
        nombre: `ENVÍO (${metodoPagoEnvio})`,
        precio: metodoPagoEnvio === 'INCLUIDO' ? costoEnvio : 0,
        quantity: 1,
        es_envio: true,
        metodo: metodoPagoEnvio
      };

      const datosPedido = {
        nombre_cliente: formData.nombre,
        email_cliente: formData.email,
        telefono_cliente: formData.telefono,
        direccion_envio: `${direccionCompleta} | ENVÍO: ${metodoPagoEnvio}`,
        ciudad: formData.ciudad,
        monto_total: totalConEnvio,
        estado_pago: 'PENDIENTE',
        referencia_wompi: referencia,
        detalle_compra: [...cart, infoEnvio]
      };

      if (pedidoIdExistente) {
        // Si ya se creó un registro en esta sesión, lo actualizamos en lugar de crear otro
        await supabase
          .from('ventas_realizadas')
          .update(datosPedido)
          .eq('id', pedidoIdExistente);
      } else {
        // Primera vez que confirma en esta sesión
        const { data, error } = await supabase
          .from('ventas_realizadas')
          .insert([datosPedido])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setPedidoIdExistente(data.id);
          setReferenciaUnica(referencia);
        }
      }

      setPreparandoPago(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Información confirmada.');

    } catch (error: any) {
      console.error("Error registro inicial:", error);
      toast.error('Error al preparar el pedido.');
    } finally {
      setLoading(false);
    }
  };

  const handlePagoConfirmadoVisual = async (transaccion: any) => {
    if (transaccion.status === 'APPROVED') {
      toast.success('¡Pago exitoso detectado!');
      clearCart();
      router.push(`/gracias?ref=${referenciaUnica}&city=${encodeURIComponent(formData.ciudad)}`);
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-12 text-[#4a1d44] min-h-screen">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/carrito" className="p-2 hover:bg-[#f2e1d9] rounded-full transition">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-bold font-playfair text-[#4a1d44]">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-[#4a1d44]/5">
          {!preparandoPago ? (
            <form onSubmit={registrarPedidoPendiente} className="space-y-6 animate-in fade-in duration-500">

              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2 mb-4">
                  <User size={14} /> Datos de contacto
                </h2>
                <input required name="nombre" value={formData.nombre} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border border-transparent focus:border-[#4a1d44]/10 transition-all" placeholder="Nombre completo" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border border-transparent focus:border-[#4a1d44]/10 transition-all" placeholder="Correo electrónico" />
                  <input required type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border border-transparent focus:border-[#4a1d44]/10 transition-all" placeholder="WhatsApp / Celular" />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-50">
                <h2 className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2 mb-4">
                  <MapPin size={14} /> Dirección de envío
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select name="departamento" value={formData.departamento} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none cursor-pointer">
                    {Object.keys(COLOMBIA_COMPLETA).sort().map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <select name="ciudad" value={formData.ciudad} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none cursor-pointer">
                    {ciudadesDisponibles.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {formData.ciudad === 'Valledupar' && (
                  <div className="bg-green-50 border border-green-100 p-5 rounded-3xl flex items-center gap-4 animate-in zoom-in duration-500">
                    <div className="bg-green-500 p-2 rounded-full text-white"><Truck size={20} /></div>
                    <div>
                      <p className="text-sm font-black text-green-900 leading-none">Envío Local</p>
                      <p className="text-xs text-green-700 mt-1">Recibe hoy mismo en Valledupar.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required name="direccion" value={formData.direccion} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none" placeholder="Dirección (Calle y Número)" />
                  <input required name="barrio" value={formData.barrio} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none" placeholder="Barrio" />
                </div>
                <input name="apartamento" value={formData.apartamento} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none" placeholder="Apto, Torre o Casa (Opcional)" />
              </div>

              {/* OPCIONES DE PAGO DE ENVÍO */}
              <div className="space-y-4 pt-6 border-t border-gray-50">
                <h2 className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2 mb-4">
                  <Truck size={14} /> Método de pago del envío
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setMetodoPagoEnvio('INCLUIDO')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 ${metodoPagoEnvio === 'INCLUIDO' ? 'border-[#4a1d44] bg-[#4a1d44]/5' : 'border-transparent bg-[#fdf8f6]'}`}
                  >
                    <span className="text-sm font-bold text-[#4a1d44]">Pagar envío ahora</span>
                    <span className="text-[10px] opacity-60">Se suma al total de tu compra</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPagoEnvio('CONTRAENTREGA')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 ${metodoPagoEnvio === 'CONTRAENTREGA' ? 'border-[#4a1d44] bg-[#4a1d44]/5' : 'border-transparent bg-[#fdf8f6]'}`}
                  >
                    <span className="text-sm font-bold text-[#4a1d44]">Pagar envío al recibir</span>
                    <span className="text-[10px] opacity-60">Pagas el domicilio cuando te llegue</span>
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || cart.length === 0} className="w-full bg-[#4a1d44] text-white py-6 rounded-2xl font-bold text-lg shadow-xl hover:bg-[#6b2b62] transition active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />} 
                {loading ? 'Preparando pedido...' : 'Confirmar información'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                <CreditCard size={48} />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black italic font-playfair">Información Verificada</h2>
                <p className="text-sm opacity-60">Selecciona tu método de pago para finalizar el pedido.</p>
              </div>

              <div className="w-full">
                <BotonWompi
                  montoTotal={totalConEnvio}
                  referenciaPedido={referenciaUnica}
                  onExito={handlePagoConfirmadoVisual}
                />
              </div>

              <button
                onClick={() => {
                  setPreparandoPago(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-all border-b border-[#4a1d44]/20"
              >
                ← Corregir datos de envío
              </button>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 opacity-40 grayscale">
            <img src="https://servicios.inm.gov.co/images/Boton_PSE.png" alt="PSE" className="h-6 w-auto" />
            <img src="https://mimerkato.com/wp-content/uploads/2021/04/Nequi-Depositos-2.png" alt="Nequi" className="h-6 w-auto" />
            <div className="flex items-center gap-2 text-[10px] font-black text-[#4a1d44] uppercase tracking-tighter">
              <Lock size={14} /> Pago Cifrado
            </div>
          </div>
        </div>

        <div className="space-y-8 lg:sticky lg:top-10 h-fit">
          <h2 className="text-xl font-bold font-playfair uppercase tracking-widest opacity-40">Tu selección</h2>
          <div className="bg-[#f2e1d9]/20 p-8 rounded-[2.5rem] border border-[#4a1d44]/5">
            <div className="space-y-6 mb-8">
              {cart.map((item: any) => {
                const imgPrincipal = Array.isArray(item.imagenes_urls) && item.imagenes_urls.length > 0
                  ? item.imagenes_urls[0]
                  : (item.imagen_url || "/placeholder.png");

                return (
                  <div key={`${item.id}-${item.talla_id}`} className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-20 bg-white rounded-2xl overflow-hidden border border-[#4a1d44]/10 shrink-0 shadow-sm">
                        <img src={imgPrincipal} alt={item.nombre} className="w-full h-full object-cover" />
                        <div className="absolute top-0 right-0 bg-[#4a1d44] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-bl-xl font-bold">
                          {item.quantity}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-tight text-[#4a1d44]">{item.nombre}</p>
                        <div className="flex gap-2 mt-1">
                          <p className="text-[8px] font-black opacity-30 uppercase tracking-widest">
                            ${Number(item.precio).toLocaleString('es-CO')} c/u
                          </p>
                          {item.talla && (
                            <p className="text-[8px] font-black text-pink-600 uppercase tracking-widest">
                              Talla: {item.talla.nombre}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-[#4a1d44]">
                        ${(item.precio * item.quantity).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-8 border-t-2 border-dashed border-[#4a1d44]/10 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-60">Subtotal</span>
                <span className="font-bold">${totalPrice.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-60 flex items-center gap-2">
                  Envío {metodoPagoEnvio === 'CONTRAENTREGA' && <span className="text-[10px] font-black bg-[#4a1d44]/10 px-2 py-0.5 rounded-full">Contraentrega</span>}
                </span>
                <span className="font-bold">
                  {metodoPagoEnvio === 'INCLUIDO' ? `$${costoEnvio.toLocaleString('es-CO')}` : 'Por pagar'}
                </span>
              </div>
              <div className="pt-4 border-t border-[#4a1d44]/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Total a pagar ahora</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#4a1d44]">
                    ${totalConEnvio.toLocaleString('es-CO')}
                  </span>
                  <span className="text-sm font-black opacity-30 tracking-[0.1em]">COP</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
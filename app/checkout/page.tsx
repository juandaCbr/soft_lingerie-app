"use client";

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { COLOMBIA_COMPLETA } from '@/app/lib/colombia';
import { Truck, MapPin, Lock, ShieldCheck, ArrowLeft, User, CreditCard } from 'lucide-react';
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

  useEffect(() => {
    const ciudades = COLOMBIA_COMPLETA[formData.departamento] || [];
    setCiudadesDisponibles(ciudades);
    if (!ciudades.includes(formData.ciudad)) {
      setFormData(prev => ({ ...prev, ciudad: ciudades[0] || '' }));
    }
  }, [formData.departamento, formData.ciudad]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Al confirmar, generamos referencia, cambiamos vista y subimos el scroll
  const procesarPedido = (e: React.FormEvent) => {
    e.preventDefault();

    const referencia = `SOFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setReferenciaUnica(referencia);

    // Cambiamos el estado
    setPreparandoPago(true);

    // Corregimos el problema del scroll: movemos al usuario al inicio de la pagina
    window.scrollTo({ top: 0, behavior: 'smooth' });

    toast.success('Información confirmada.');
  };

  const handlePagoExitoso = async (transaccion: any) => {
    setLoading(true);

    try {
      const direccionCompleta = `${formData.direccion}, Barrio: ${formData.barrio}${formData.apartamento ? ', Apto: ' + formData.apartamento : ''} (${formData.departamento})`;

      const { error: errorPedido } = await supabase
        .from('ventas_realizadas')
        .insert([{
          nombre_cliente: formData.nombre,
          email_cliente: formData.email,
          telefono_cliente: formData.telefono,
          direccion_envio: direccionCompleta,
          ciudad: formData.ciudad,
          monto_total: totalPrice,
          estado_pago: 'APROBADO',
          referencia_wompi: referenciaUnica,
          detalle_compra: cart
        }]);

      if (errorPedido) throw errorPedido;

      for (const item of cart) {
        const { data: productoDB, error: errorLectura } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (productoDB && !errorLectura) {
          const nuevoStock = Math.max(0, productoDB.stock - item.quantity);
          await supabase
            .from('productos')
            .update({ stock: nuevoStock })
            .eq('id', item.id);
        }
      }

      toast.success('¡Pedido realizado con éxito!');
      clearCart();
      router.push('/gracias');

    } catch (error) {
      console.error("Error post-pago:", error);
      toast.error('Error al registrar el pedido.');
    } finally {
      setLoading(false);
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
            /* FORMULARIO INICIAL */
            <form onSubmit={procesarPedido} className="space-y-6 animate-in fade-in duration-500">

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

              <button type="submit" disabled={cart.length === 0} className="w-full bg-[#4a1d44] text-white py-6 rounded-2xl font-bold text-lg shadow-xl hover:bg-[#6b2b62] transition active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                <ShieldCheck size={20} /> Confirmar información
              </button>
            </form>
          ) : (
            /* VISTA DE METODO DE PAGO */
            <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                <CreditCard size={48} />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black italic font-playfair">Información Verificada</h2>
                <p className="text-sm opacity-60">Selecciona tu método de pago para finalizar el pedido.</p>
              </div>

              <div className="w-full">
                {loading ? (
                  <div className="w-full bg-gray-50 p-6 rounded-2xl font-black text-center animate-pulse border border-[#4a1d44]/5">
                    Registrando Pedido...
                  </div>
                ) : (
                  <BotonWompi
                    montoTotal={totalPrice}
                    referenciaPedido={referenciaUnica}
                    onExito={handlePagoExitoso}
                  />
                )}
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

        {/* Resumen de Compra */}
        <div className="space-y-8 lg:sticky lg:top-10 h-fit">
          <h2 className="text-xl font-bold font-playfair uppercase tracking-widest opacity-40">Tu selección</h2>
          <div className="bg-[#f2e1d9]/20 p-8 rounded-[2.5rem] border border-[#4a1d44]/5">
            <div className="space-y-6 mb-8">
              {cart.map((item: any) => {
                const imgPrincipal = Array.isArray(item.imagenes_urls) && item.imagenes_urls.length > 0
                  ? item.imagenes_urls[0]
                  : (item.imagen_url || "/placeholder.png");

                return (
                  <div key={item.id} className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-20 bg-white rounded-2xl overflow-hidden border border-[#4a1d44]/10 shrink-0 shadow-sm">
                        <img src={imgPrincipal} alt={item.nombre} className="w-full h-full object-cover" />
                        <div className="absolute top-0 right-0 bg-[#4a1d44] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-bl-xl font-bold">
                          {item.quantity}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-tight text-[#4a1d44]">{item.nombre}</p>
                        <p className="text-[10px] font-black opacity-30 mt-1 uppercase tracking-widest">
                          ${Number(item.precio).toLocaleString('es-CO')} c/u
                        </p>
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

            <div className="pt-8 border-t-2 border-dashed border-[#4a1d44]/10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Total a pagar</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-[#4a1d44]">
                  ${totalPrice.toLocaleString('es-CO')}
                </span>
                <span className="text-sm font-black opacity-30 tracking-[0.1em]">COP</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
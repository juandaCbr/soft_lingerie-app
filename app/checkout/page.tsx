"use client";

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { COLOMBIA_COMPLETA } from '@/app/lib/colombia';
import { Truck, MapPin, Lock, ShieldCheck, ArrowLeft, User, CreditCard, Loader2, Smartphone, Bike } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import toast from 'react-hot-toast';
import BotonWompi from '@/components/BotonWompi';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [preparandoPago, setPreparandoPago] = useState(false);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState<'CARD' | 'PSE' | 'NEQUI' | 'DAVIPLATA' | 'BANCOLOMBIA' | null>(null);
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiry: '',
    cvv: '',
    phoneNequi: '',
    phoneDaviplata: '',
    bankPSE: '',
    userType: '0',
    docType: 'CC',
    docNumber: '',
  });

  const getCardBrand = (number: string) => {
    const cleanNumber = number.replace(/\s/g, '');
    if (cleanNumber.startsWith('4')) return 'VISA';
    if (/^5[1-5]/.test(cleanNumber)) return 'MASTERCARD';
    if (/^3[47]/.test(cleanNumber)) return 'AMEX';
    return null;
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) return parts.join(' ');
    return v;
  };

  const formatExpiry = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 2) {
      return v.substring(0, 2) + ' / ' + v.substring(2, 4);
    }
    return v;
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;

    if (name === 'cardNumber') {
      value = value.replace(/\D/g, '').substring(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
    }

    if (name === 'expiry') {
      const isDeleting = (e.nativeEvent as any).inputType === 'deleteContentBackward';
      if (!isDeleting) {
        value = formatExpiry(value);
      }
    }

    setPaymentData({ ...paymentData, [name]: value });
  };

  const cardBrand = getCardBrand(paymentData.cardNumber);
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
  const [bancosPSE, setBancosPSE] = useState<{ value: string, label: string }[]>([]);

  useEffect(() => {
    const fetchBancos = async () => {
      const url = `${process.env.NEXT_PUBLIC_WOMPI_API_URL}/pse/financial_institutions`;
      try {
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}` }
        });
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setBancosPSE(json.data.map((b: any) => ({
            value: b.financial_institution_code || b.code,
            label: b.financial_institution_name || b.description || b.name
          })));
        }
      } catch (e) {
        console.error("Error cargando bancos:", e);
      }
    };
    fetchBancos();
  }, []);

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
      const nuevaReferencia = `SOFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setReferenciaUnica(nuevaReferencia);

      const direccionCompleta = `${formData.direccion}, Barrio: ${formData.barrio}${formData.apartamento ? ', Apto: ' + formData.apartamento : ''} (${formData.departamento})`;

      const infoEnvio = {
        nombre: `ENVIO (${metodoPagoEnvio})`,
        precio: metodoPagoEnvio === 'INCLUIDO' ? costoEnvio : 0,
        quantity: 1,
        es_envio: true,
        metodo: metodoPagoEnvio
      };

      const datosPedido = {
        nombre_cliente: formData.nombre,
        email_cliente: formData.email,
        telefono_cliente: formData.telefono,
        direccion_envio: `${direccionCompleta} | ENVIO: ${metodoPagoEnvio}`,
        ciudad: formData.ciudad,
        monto_total: totalConEnvio,
        estado_pago: 'PENDIENTE',
        referencia_wompi: nuevaReferencia,
        detalle_compra: [...cart, infoEnvio]
      };

      if (pedidoIdExistente) {
        await supabase
          .from('ventas_realizadas')
          .update(datosPedido)
          .eq('id', pedidoIdExistente);
      } else {
        const { data, error } = await supabase
          .from('ventas_realizadas')
          .insert([datosPedido])
          .select()
          .single();

        if (error) throw error;
        if (data) setPedidoIdExistente(data.id);
      }

      setPreparandoPago(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Informacion confirmada.');

    } catch (error: any) {
      console.error("Error registro inicial:", error);
      toast.error('Error al preparar el pedido.');
    } finally {
      setLoading(false);
    }
  };

  const handlePagoConfirmadoVisual = async (transaccion: any) => {
    if (transaccion.status === 'APPROVED') {
      toast.success('Pago exitoso detectado!');
      clearCart();
      router.push(`/gracias?ref=${referenciaUnica}&city=${encodeURIComponent(formData.ciudad)}`);
    }
  };

  const metodosPago = [
    { 
      id: 'CARD', 
      label: 'Tarjeta de Crédito', 
      icon: <CreditCard size={18} />,
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" 
    },
    { 
      id: 'PSE', 
      label: 'PSE / Transferencia', 
      icon: <User size={18} />,
      logo: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PSE_Logo.png" 
    },
    { 
      id: 'NEQUI', 
      label: 'Nequi', 
      icon: <Smartphone size={18} />,
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Nequi_Logo.png/1200px-Nequi_Logo.png" 
    },
  ];

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
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border border-transparent focus:border-[#4a1d44]/10 transition-all" placeholder="Correo electronico" />
                  <input required type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border border-transparent focus:border-[#4a1d44]/10 transition-all" placeholder="WhatsApp / Celular" />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-50">
                <h2 className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2 mb-4">
                  <MapPin size={14} /> Direccion de envio
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
                      <p className="text-sm font-black text-green-900 leading-none">Envio Local</p>
                      <p className="text-xs text-green-700 mt-1">Recibe hoy mismo en Valledupar.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required name="direccion" value={formData.direccion} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none" placeholder="Direccion (Calle y Numero)" />
                  <input required name="barrio" value={formData.barrio} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none" placeholder="Barrio" />
                </div>
                <input name="apartamento" value={formData.apartamento} onChange={handleChange} className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none" placeholder="Apto, Torre o Casa (Opcional)" />
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-50">
                <h2 className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2 mb-4">
                  <Truck size={14} /> Metodo de pago del envio
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setMetodoPagoEnvio('INCLUIDO')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 ${metodoPagoEnvio === 'INCLUIDO' ? 'border-[#4a1d44] bg-[#4a1d44]/5' : 'border-transparent bg-[#fdf8f6]'}`}
                  >
                    <span className="text-sm font-bold text-[#4a1d44]">Pagar envio ahora</span>
                    <span className="text-[10px] opacity-60">Se suma al total de tu compra</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPagoEnvio('CONTRAENTREGA')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 ${metodoPagoEnvio === 'CONTRAENTREGA' ? 'border-[#4a1d44] bg-[#4a1d44]/5' : 'border-transparent bg-[#fdf8f6]'}`}
                  >
                    <span className="text-sm font-bold text-[#4a1d44]">Pagar envio al recibir</span>
                    <span className="text-[10px] opacity-60">Pagas el domicilio cuando te llegue</span>
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || cart.length === 0} className="w-full bg-[#4a1d44] text-white py-6 rounded-2xl font-bold text-lg shadow-xl hover:bg-[#6b2b62] transition active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                {loading ? 'Preparando pedido...' : 'Confirmar informacion'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-stretch py-10 space-y-8 animate-in zoom-in duration-500">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
                  <Lock size={32} />
                </div>
                <h2 className="text-2xl font-black italic font-playfair">Finalizar Pago</h2>
                <p className="text-xs opacity-60 uppercase tracking-widest font-bold">Selecciona tu metodo preferido</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {metodosPago.map((metodo) => (
                  <div key={metodo.id} className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setMetodoPagoSeleccionado(metodo.id as any)}
                      className={`w-full group p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${metodoPagoSeleccionado === metodo.id ? 'border-[#4a1d44] bg-[#4a1d44]/5' : 'border-[#4a1d44]/5 bg-[#fdf8f6] hover:border-[#4a1d44]/20'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl transition-all bg-white shadow-sm border border-black/5 flex items-center justify-center w-12 h-10 overflow-hidden`}>
                          <img src={metodo.logo} alt={metodo.label} className="w-full h-full object-contain" />
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-widest ${metodoPagoSeleccionado === metodo.id ? 'text-[#4a1d44]' : 'opacity-60'}`}>
                          {metodo.label}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${metodoPagoSeleccionado === metodo.id ? 'border-[#4a1d44] bg-[#4a1d44]' : 'border-[#4a1d44]/10'}`}>
                        {metodoPagoSeleccionado === metodo.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </button>

                    {metodoPagoSeleccionado === metodo.id && (
                      <div className="p-6 bg-white border border-[#4a1d44]/10 rounded-[2rem] shadow-inner space-y-4 animate-in slide-in-from-top-4 duration-300">

                        {metodo.id === 'CARD' && (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Datos de tarjeta</p>
                              <div className="flex gap-2">
                                <span className={`text-[8px] font-black px-2 py-1 rounded border ${cardBrand === 'VISA' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'opacity-20'}`}>VISA</span>
                                <span className={`text-[8px] font-black px-2 py-1 rounded border ${cardBrand === 'MASTERCARD' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'opacity-20'}`}>MASTER</span>
                                <span className={`text-[8px] font-black px-2 py-1 rounded border ${cardBrand === 'AMEX' ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'opacity-20'}`}>AMEX</span>
                              </div>
                            </div>
                            <input name="cardHolder" value={paymentData.cardHolder} onChange={handlePaymentChange} className="w-full p-4 rounded-xl bg-[#fdf8f6] outline-none text-xs font-bold uppercase tracking-wider border border-transparent focus:border-[#4a1d44]/10" placeholder="Nombre en la tarjeta" />
                            <input name="cardNumber" value={paymentData.cardNumber} onChange={handlePaymentChange} className="w-full p-4 rounded-xl bg-[#fdf8f6] outline-none text-sm font-mono border border-transparent focus:border-[#4a1d44]/10" placeholder="0000 0000 0000 0000" maxLength={19} />
                            <div className="grid grid-cols-2 gap-4">
                              <input name="expiry" value={paymentData.expiry} onChange={handlePaymentChange} className="w-full p-4 rounded-xl bg-[#fdf8f6] outline-none text-xs border border-transparent focus:border-[#4a1d44]/10" placeholder="MM / YY" maxLength={7} />
                              <input name="cvv" value={paymentData.cvv} onChange={handlePaymentChange} className="w-full p-4 rounded-xl bg-[#fdf8f6] outline-none text-xs border border-transparent focus:border-[#4a1d44]/10" placeholder="CVV" maxLength={4} />
                            </div>
                          </div>
                        )}

                        {metodo.id === 'NEQUI' && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-[#fdf8f6] p-4 rounded-2xl border border-[#4a1d44]/5">
                              <div className="bg-[#e6007e] p-2 rounded-lg text-white"><Smartphone size={20} /></div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#4a1d44]">Nequi Directo</p>
                                <p className="text-[9px] opacity-60">Pago rapido desde tu celular</p>
                              </div>
                            </div>
                            <input name="phoneNequi" value={paymentData.phoneNequi} onChange={handlePaymentChange} className="w-full p-5 rounded-2xl bg-[#fdf8f6] outline-none text-xl font-bold tracking-[0.2em] text-[#4a1d44] border-2 border-[#4a1d44]/10 focus:border-[#4a1d44] text-center" placeholder="300 000 0000" maxLength={10} />
                            <p className="text-[9px] opacity-40 italic text-center">Te llegara una notificacion de pago de Wompi a tu App.</p>
                          </div>
                        )}

                        {metodo.id === 'PSE' && (
                          <div className="space-y-4 text-center py-6 animate-in fade-in duration-500">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-md">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PSE_Logo.png" className="w-12 h-12 object-contain" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-black uppercase text-[#4a1d44] tracking-widest">Portal Oficial PSE</h4>
                                <p className="text-[11px] opacity-60 max-w-[280px] mx-auto leading-relaxed">
                                  Al hacer clic en el botón de abajo, te llevaré al **Portal Seguro de Wompi** donde podrás elegir tu banco y completar tu pago.
                                </p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mt-4 flex items-center gap-3 text-left">
                              <ShieldCheck size={24} className="text-blue-600 shrink-0" />
                              <p className="text-[10px] text-blue-800 font-bold leading-tight italic">
                                Tu información está protegida por la seguridad bancaria de Wompi.
                              </p>
                            </div>
                          </div>
                        )}

                        {metodo.id === 'BANCOLOMBIA' && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-[#fdf8f6] p-4 rounded-2xl border border-[#4a1d44]/5">
                              <div className="bg-[#2c2c2c] p-2 rounded-lg text-white"><Bike size={20} /></div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#4a1d44]">Bancolombia Directo</p>
                                <p className="text-[9px] opacity-60">Transferencia desde tu cuenta</p>
                              </div>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                              <p className="text-[10px] text-amber-800 font-bold leading-tight">
                                Serás redirigido al portal seguro de Bancolombia para autorizar tu pago.
                              </p>
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="w-full pt-4">
                <BotonWompi
                  montoTotal={totalConEnvio}
                  referenciaPedido={referenciaUnica}
                  onExito={handlePagoConfirmadoVisual}
                  disabled={!metodoPagoSeleccionado}
                  metodo={metodoPagoSeleccionado}
                  paymentData={paymentData}
                  email={formData.email}
                  nombre={formData.nombre}
                  telefono={formData.telefono}
                  pedidoId={pedidoIdExistente}
                />
              </div>

              <button
                onClick={() => {
                  setPreparandoPago(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-all border-b border-[#4a1d44]/20 self-center"
              >
                ← Corregir datos de envio
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
          <h2 className="text-xl font-bold font-playfair uppercase tracking-widest opacity-40">Tu seleccion</h2>
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
                  Envio {metodoPagoEnvio === 'CONTRAENTREGA' && <span className="text-[10px] font-black bg-[#4a1d44]/10 px-2 py-0.5 rounded-full">Contraentrega</span>}
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
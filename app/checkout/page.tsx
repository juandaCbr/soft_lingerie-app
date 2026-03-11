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
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState<'CARD' | 'PSE' | 'NEQUI' | 'BANCOLOMBIA' | null>(null);
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiry: '',
    cvv: '',
    phoneNequi: '',
    bankPSE: '',
    userType: '0', // 0: Persona, 1: Empresa
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
    // Solo números
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
      // Si el usuario está borrando, permitimos que borre el formato
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

  const metodosPago = [
    { id: 'CARD', label: 'Tarjeta Crédito / Débito', icon: <CreditCard size={18} /> },
    { id: 'PSE', label: 'PSE / Transferencia', icon: <User size={18} /> },
    { id: 'NEQUI', label: 'Nequi', icon: <Smartphone size={18} /> },
    { id: 'BANCOLOMBIA', label: 'Bancolombia', icon: <Bike size={18} /> },
  ];

  // Función para obtener el token de la tarjeta directamente desde Wompi
  const obtenerTokenTarjeta = async () => {
    const cleanNumber = paymentData.cardNumber.replace(/\s/g, '');
    const [month, year] = paymentData.expiry.split('/');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_API_URL}/tokens/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`
      },
      body: JSON.stringify({
        number: cleanNumber,
        cvc: paymentData.cvv,
        exp_month: month.trim(),
        exp_year: year.trim().length === 2 ? `20${year.trim()}` : year.trim(),
        card_holder: paymentData.cardHolder
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.reason || "Datos de tarjeta inválidos");
    return result.data.id;
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
            <div className="flex flex-col items-stretch py-10 space-y-8 animate-in zoom-in duration-500">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
                   <Lock size={32} />
                </div>
                <h2 className="text-2xl font-black italic font-playfair">Finalizar Pago</h2>
                <p className="text-xs opacity-60 uppercase tracking-widest font-bold">Selecciona tu método preferido</p>
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
                        <div className={`p-3 rounded-xl transition-all ${metodoPagoSeleccionado === metodo.id ? 'bg-[#4a1d44] text-white' : 'bg-white text-[#4a1d44]'}`}>
                          {metodo.icon}
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest ${metodoPagoSeleccionado === metodo.id ? 'text-[#4a1d44]' : 'opacity-60'}`}>
                          {metodo.label}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${metodoPagoSeleccionado === metodo.id ? 'border-[#4a1d44] bg-[#4a1d44]' : 'border-[#4a1d44]/10'}`}>
                        {metodoPagoSeleccionado === metodo.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </button>

                    {/* FORMULARIOS NATIVOS SEGÚN EL MÉTODO */}
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
                              <input name="expiry" value={paymentData.expiry} onChange={handlePaymentChange} className="w-full p-4 rounded-xl bg-[#fdf8f6] outline-none text-xs border border-transparent focus:border-[#4a1d44]/10" placeholder="MM / YY" maxLength={5} />
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
                                <p className="text-[9px] opacity-60">Pago rápido desde tu celular</p>
                              </div>
                            </div>
                            <input name="phoneNequi" value={paymentData.phoneNequi} onChange={handlePaymentChange} className="w-full p-5 rounded-2xl bg-[#fdf8f6] outline-none text-xl font-bold tracking-[0.2em] text-[#4a1d44] border-2 border-[#4a1d44]/10 focus:border-[#4a1d44] text-center" placeholder="300 000 0000" maxLength={10} />
                            <p className="text-[9px] opacity-40 italic text-center">Te llegará una notificación de pago de "Wompi" a tu App.</p>
                          </div>
                        )}

                        {metodo.id === 'PSE' && (
                          <div className="space-y-4">
                            <select name="bankPSE" value={paymentData.bankPSE} onChange={handlePaymentChange} className="w-full p-4 rounded-xl bg-[#fdf8f6] outline-none text-xs font-bold border border-transparent focus:border-[#4a1d44]/10">
                              <option value="">Selecciona tu banco</option>
                              <option value="1007">Bancolombia</option>
                              <option value="1040">Banco Davivienda</option>
                              <option value="1013">BBVA Colombia</option>
                              <option value="1032">Banco de Bogotá</option>
                              <option value="1051">Banco Popular</option>
                              <option value="1019">Banco de Occidente</option>
                              <option value="1001">Banco Agrario</option>
                              <option value="1002">Banco Procredit</option>
                              <option value="1006">Banco Itaú</option>
                              <option value="1014">Banco Sudameris</option>
                              <option value="1052">Banco AV Villas</option>
                              <option value="1061">Banco Coopcentral</option>
                              <option value="1062">Banco Falabella</option>
                              <option value="1063">Banco Finandina</option>
                              <option value="1064">Banco Multibank</option>
                              <option value="1065">Banco Pichincha</option>
                              <option value="1066">Banco Santander</option>
                              <option value="1067">Banco Scotiabank Colpatria</option>
                              <option value="1068">Banco Serfinanza</option>
                              <option value="1558">Nequi</option>
                              <option value="1507">DaviPlata</option>
                              <option value="1801">Lulo Bank</option>
                            </select>
                            <div className="grid grid-cols-2 gap-4">
                              <select name="docType" value={paymentData.docType} onChange={handlePaymentChange} className="w-full p-4 rounded-xl bg-[#fdf8f6] outline-none text-[10px] font-bold border border-transparent focus:border-[#4a1d44]/10">
                                <option value="CC">C. de Ciudadanía</option>
                                <option value="CE">C. de Extranjería</option>
                                <option value="NIT">NIT</option>
                              </select>
                              <input name="docNumber" value={paymentData.docNumber} onChange={handlePaymentChange} className="w-full p-4 rounded-xl bg-[#fdf8f6] outline-none text-xs border border-transparent focus:border-[#4a1d44]/10" placeholder="Número" />
                            </div>
                          </div>
                        )}

                        {metodo.id === 'BANCOLOMBIA' && (
                          <div className="text-center py-4">
                            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Pago con Transferencia Directa</p>
                            <p className="text-xs mt-2 font-bold">Serás redirigido al portal de Bancolombia.</p>
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
                />
              </div>

              <button
                onClick={() => {
                  setPreparandoPago(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-all border-b border-[#4a1d44]/20 self-center"
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
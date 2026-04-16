/**
 * Checkout en dos pasos en pantalla:
 * 1) Formulario: datos de contacto y envío (validación HTML5 en campos requeridos).
 * 2) Pago: se registra antes la fila en `ventas_realizadas` (estado PENDIENTE + referencia única Wompi)
 *    y luego el usuario paga con BotonWompi; el webhook/admin actualizarán el estado del pago.
 */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useCart } from "@/context/CartContext";
import { COLOMBIA_COMPLETA } from "@/app/lib/colombia";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import toast from "react-hot-toast";
import { CheckoutPageHeader } from "@/components/checkout/CheckoutPageHeader";
import { CheckoutShippingForm } from "@/components/checkout/CheckoutShippingForm";
import { CheckoutPaymentStep, buildMetodosCheckout } from "@/components/checkout/CheckoutPaymentStep";
import { CheckoutOrderSummary } from "@/components/checkout/CheckoutOrderSummary";
import { CheckoutPaymentTrustBar } from "@/components/checkout/CheckoutPaymentTrustBar";
import { getCardBrand, formatExpiry } from "@/components/checkout/checkout-payment-utils";
import type {
  CheckoutFormData,
  CheckoutPaymentData,
  MetodoPagoEnvio,
  MetodoPagoWompi,
  WompiExitoPayload,
  CheckoutCartLine,
} from "@/components/checkout/checkout-types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getColorNombreFromCartItem = (item: any): string | null =>
  item?.color?.nombre ||
  item?.color_nombre ||
  item?.producto_colores?.[0]?.colores?.nombre ||
  item?.producto_colores?.[0]?.nombre ||
  null;

const getImagenesLocalesFromCartItem = (item: any): Array<{ thumb: string; detail: string }> => {
  const raw = Array.isArray(item?.imagenes_locales) ? item.imagenes_locales : [];
  return raw
    .map((img: any) => {
      if (!img || typeof img !== "object") return null;
      const thumb = typeof img.thumb === "string" ? img.thumb : "";
      const detail = typeof img.detail === "string" ? img.detail : "";
      if (!thumb && !detail) return null;
      return { thumb, detail };
    })
    .filter((img): img is { thumb: string; detail: string } => Boolean(img));
};

const buildDetalleCompraFromCart = (cartItems: any[]) =>
  cartItems.map((item) => ({
    id: item.id,
    nombre: item.nombre,
    precio: Number(item.precio) || 0,
    quantity: Number(item.quantity) || 1,
    talla: item?.talla?.nombre ? { nombre: item.talla.nombre, id: item?.talla?.id ?? null } : null,
    color: getColorNombreFromCartItem(item) ? { nombre: getColorNombreFromCartItem(item) } : null,
    imagenes_locales: getImagenesLocalesFromCartItem(item),
    es_envio: false,
  }));

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [preparandoPago, setPreparandoPago] = useState(false);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState<MetodoPagoWompi | null>(null);

  const metodosCheckout = useMemo(() => buildMetodosCheckout(), []);

  const cambiarMetodo = (id: MetodoPagoWompi) => {
    setPaymentData((prev) => ({
      ...prev,
      cardNumber: "",
      cardHolder: "",
      expiry: "",
      cvv: "",
      installments: "1",
      phoneNequi: "",
    }));
    setMetodoPagoSeleccionado(id);
  };

  const [paymentData, setPaymentData] = useState<CheckoutPaymentData>({
    cardNumber: "",
    cardHolder: "",
    expiry: "",
    cvv: "",
    installments: "1",
    phoneNequi: "",
    phoneDaviplata: "",
    bankPSE: "",
    userType: "0",
    docType: "CC",
    docNumber: "",
  });

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;

    if (name === "cardNumber") {
      value = value.replace(/\D/g, "").substring(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
    }

    if (name === "expiry") {
      const isDeleting = (e.nativeEvent as InputEvent).inputType === "deleteContentBackward";
      if (!isDeleting) {
        value = formatExpiry(value);
      }
    }

    setPaymentData((prev) => ({ ...prev, [name]: value }));
  };

  const cardBrand = getCardBrand(paymentData.cardNumber);

  const [referenciaUnica, setReferenciaUnica] = useState("");
  const [pedidoIdExistente, setPedidoIdExistente] = useState<string | null>(null);

  const [formData, setFormData] = useState<CheckoutFormData>({
    nombre: "",
    email: "",
    telefono: "",
    departamento: "Cesar",
    ciudad: "",
    direccion: "",
    barrio: "",
    apartamento: "",
  });

  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([]);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [metodoPagoEnvio, setMetodoPagoEnvio] = useState<MetodoPagoEnvio>("INCLUIDO");
  const [_bancosPSE, setBancosPSE] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const fetchBancos = async () => {
      const url = `${process.env.NEXT_PUBLIC_WOMPI_API_URL}/pse/financial_institutions`;
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}` },
        });
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setBancosPSE(
            json.data.map((b: { financial_institution_code?: string; code?: string; financial_institution_name?: string; description?: string; name?: string }) => ({
              value: b.financial_institution_code || b.code,
              label: b.financial_institution_name || b.description || b.name,
            })),
          );
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
      setFormData((prev) => ({ ...prev, ciudad: ciudades[0] || "" }));
    }
  }, [formData.departamento, formData.ciudad]);

  useEffect(() => {
    if (formData.ciudad === "Valledupar") {
      setCostoEnvio(6000);
    } else if (formData.ciudad) {
      setCostoEnvio(18000);
    } else {
      setCostoEnvio(0);
    }
  }, [formData.ciudad]);

  const totalConEnvio = totalPrice + (metodoPagoEnvio === "INCLUIDO" ? costoEnvio : 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Paso intermedio antes de Wompi: persiste la venta en `ventas_realizadas`.
   * - `estado_pago: PENDIENTE` hasta que el webhook o el flujo confirme el pago.
   * - `referencia_wompi` enlaza el pedido con la transacción en Wompi.
   * Si el usuario vuelve atrás y reenvía, reutilizamos `pedidoIdExistente` (update).
   */
  const registrarPedidoPendiente = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = formData.email.trim();
    if (!EMAIL_REGEX.test(email)) {
      toast.error("Introduce un correo válido.");
      return;
    }

    setLoading(true);

    try {
      const nuevaReferencia = `SOFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setReferenciaUnica(nuevaReferencia);

      const direccionCompleta = `${formData.direccion}, Barrio: ${formData.barrio}${formData.apartamento ? ", Apto: " + formData.apartamento : ""} (${formData.departamento})`;

      const infoEnvio = {
        nombre: `ENVIO (${metodoPagoEnvio})`,
        precio: metodoPagoEnvio === "INCLUIDO" ? costoEnvio : 0,
        quantity: 1,
        es_envio: true,
        metodo: metodoPagoEnvio,
      };
      const detalleCompra = [...buildDetalleCompraFromCart(cart), infoEnvio];

      const datosPedido = {
        nombre_cliente: formData.nombre,
        email_cliente: formData.email,
        telefono_cliente: formData.telefono,
        direccion_envio: `${direccionCompleta} | ENVIO: ${metodoPagoEnvio}`,
        ciudad: formData.ciudad,
        monto_total: totalConEnvio,
        estado_pago: "PENDIENTE",
        referencia_wompi: nuevaReferencia,
        detalle_compra: detalleCompra,
      };

      if (pedidoIdExistente) {
        await supabase.from("ventas_realizadas").update(datosPedido).eq("id", pedidoIdExistente);
      } else {
        const { data, error } = await supabase.from("ventas_realizadas").insert([datosPedido]).select().single();

        if (error) throw error;
        if (data) {
          setPedidoIdExistente(data.id);
        }
      }

      setPreparandoPago(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Información confirmada.");
    } catch (error: unknown) {
      console.error("Error registro inicial:", error);
      toast.error("Error al preparar el pedido.");
    } finally {
      setLoading(false);
    }
  };

  const handlePagoConfirmadoVisual = useCallback(
    async (transaccion: WompiExitoPayload) => {
      const status = transaccion.status || transaccion.estado_pago;
      if (status === "APPROVED" || status === "APROBADO") {
        toast.dismiss();
        toast.success("¡Pago exitoso detectado!");
        clearCart();
        router.push(`/gracias?ref=${referenciaUnica}&city=${encodeURIComponent(formData.ciudad)}`);
      }
    },
    [referenciaUnica, formData.ciudad, clearCart, router],
  );

  const resetPaymentData = () => {
    setPaymentData({
      cardNumber: "",
      cardHolder: "",
      expiry: "",
      cvv: "",
      installments: "1",
      phoneNequi: "",
      phoneDaviplata: "",
      bankPSE: "",
      userType: "0",
      docType: "CC",
      docNumber: "",
    });
    setMetodoPagoSeleccionado(null);
  };

  const cartLines = cart as CheckoutCartLine[];

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-12 text-[#4a1d44] min-h-screen">
      <CheckoutPageHeader />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-[#4a1d44]/5">
          {!preparandoPago ? (
            <CheckoutShippingForm
              formData={formData}
              ciudadesDisponibles={ciudadesDisponibles}
              metodoPagoEnvio={metodoPagoEnvio}
              onFieldChange={handleChange}
              onMetodoEnvioChange={setMetodoPagoEnvio}
              onSubmit={registrarPedidoPendiente}
              loading={loading}
              cartEmpty={cart.length === 0}
            />
          ) : (
            <CheckoutPaymentStep
              metodosPago={metodosCheckout}
              metodoPagoSeleccionado={metodoPagoSeleccionado}
              onSelectMetodo={cambiarMetodo}
              paymentData={paymentData}
              onPaymentChange={handlePaymentChange}
              cardBrand={cardBrand}
              totalConEnvio={totalConEnvio}
              referenciaUnica={referenciaUnica}
              onPagoExito={handlePagoConfirmadoVisual}
              formData={formData}
              pedidoIdExistente={pedidoIdExistente}
              onVolverAEditar={() => {
                resetPaymentData();
                setPreparandoPago(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

          <CheckoutPaymentTrustBar />
        </div>

        <CheckoutOrderSummary
          cart={cartLines}
          totalPrice={totalPrice}
          metodoPagoEnvio={metodoPagoEnvio}
          costoEnvio={costoEnvio}
          totalConEnvio={totalConEnvio}
        />
      </div>
    </main>
  );
}

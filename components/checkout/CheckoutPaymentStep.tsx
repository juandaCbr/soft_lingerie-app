import { Lock } from "lucide-react";
import BotonWompi from "@/components/BotonWompi";
import type { CheckoutFormData, CheckoutPaymentData, MetodoPagoWompi, WompiExitoPayload } from "./checkout-types";
import {
  CheckoutPaymentBancolombiaInfo,
  CheckoutPaymentCardFields,
  CheckoutPaymentNequiFields,
  CheckoutPaymentPseInfo,
} from "./CheckoutPaymentDetailPanels";

export type MetodoCheckoutItem = {
  id: MetodoPagoWompi;
  label: string;
  logo: string;
};

type CheckoutPaymentStepProps = {
  metodosPago: MetodoCheckoutItem[];
  metodoPagoSeleccionado: MetodoPagoWompi | null;
  onSelectMetodo: (id: MetodoPagoWompi) => void;
  paymentData: CheckoutPaymentData;
  onPaymentChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  cardBrand: "VISA" | "MASTERCARD" | "AMEX" | null;
  totalConEnvio: number;
  referenciaUnica: string;
  onPagoExito: (transaccion: WompiExitoPayload) => void;
  formData: Pick<CheckoutFormData, "email" | "nombre" | "telefono" | "ciudad">;
  pedidoIdExistente: string | null;
  onVolverAEditar: () => void;
};

export function CheckoutPaymentStep({
  metodosPago,
  metodoPagoSeleccionado,
  onSelectMetodo,
  paymentData,
  onPaymentChange,
  cardBrand,
  totalConEnvio,
  referenciaUnica,
  onPagoExito,
  formData,
  pedidoIdExistente,
  onVolverAEditar,
}: CheckoutPaymentStepProps) {
  return (
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
              onClick={() => onSelectMetodo(metodo.id)}
              className={`w-full group p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
                metodoPagoSeleccionado === metodo.id
                  ? "border-[#4a1d44] bg-[#4a1d44]/5"
                  : "border-[#4a1d44]/5 bg-[#fdf8f6] hover:border-[#4a1d44]/20"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl transition-all bg-white shadow-sm border border-black/5 flex items-center justify-center w-12 h-10 overflow-hidden">
                  <img src={metodo.logo} alt={metodo.label} className="w-full h-full object-contain" />
                </div>
                <span
                  className={`text-[11px] font-black uppercase tracking-widest ${
                    metodoPagoSeleccionado === metodo.id ? "text-[#4a1d44]" : "opacity-60"
                  }`}
                >
                  {metodo.label}
                </span>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  metodoPagoSeleccionado === metodo.id ? "border-[#4a1d44] bg-[#4a1d44]" : "border-[#4a1d44]/10"
                }`}
              >
                {metodoPagoSeleccionado === metodo.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </button>

            {metodoPagoSeleccionado === metodo.id && (
              <div className="p-6 bg-white border border-[#4a1d44]/10 rounded-[2rem] shadow-inner space-y-4 animate-in slide-in-from-top-4 duration-300">
                {metodo.id === "CARD" && (
                  <CheckoutPaymentCardFields
                    paymentData={paymentData}
                    onPaymentChange={onPaymentChange}
                    cardBrand={cardBrand}
                  />
                )}
                {metodo.id === "NEQUI" && (
                  <CheckoutPaymentNequiFields paymentData={paymentData} onPaymentChange={onPaymentChange} />
                )}
                {metodo.id === "PSE" && <CheckoutPaymentPseInfo />}
                {metodo.id === "BANCOLOMBIA" && <CheckoutPaymentBancolombiaInfo />}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="w-full pt-4">
        <BotonWompi
          montoTotal={totalConEnvio}
          referenciaPedido={referenciaUnica}
          onExito={onPagoExito}
          disabled={!metodoPagoSeleccionado}
          metodo={metodoPagoSeleccionado}
          paymentData={paymentData}
          email={formData.email}
          nombre={formData.nombre}
          telefono={formData.telefono}
          pedidoId={pedidoIdExistente}
          ciudad={formData.ciudad}
        />
      </div>

      <button
        type="button"
        onClick={onVolverAEditar}
        className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-all border-b border-[#4a1d44]/20 self-center"
      >
        ← Corregir datos de envio
      </button>
    </div>
  );
}

/** Configuración visual de métodos (logos + iconos) — misma lista que antes en page.tsx */
export function buildMetodosCheckout(): MetodoCheckoutItem[] {
  return [
    {
      id: "CARD",
      label: "Tarjeta Crédito / Débito",
      logo: "https://assets.ntextil.com/images/responsive/checkout/credit_card_big.png",
    },
    {
      id: "PSE",
      label: "PSE / Transferencia",
      logo: "https://d1ih8jugeo2m5m.cloudfront.net/2023/05/pse-1-300x300.png",
    },
    {
      id: "NEQUI",
      label: "Nequi",
      logo: "https://nequi.com.sv/img/icon.png",
    },
  ];
}

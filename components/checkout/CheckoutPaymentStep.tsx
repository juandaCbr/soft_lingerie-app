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
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-accent text-ink">
          <Lock size={28} />
        </div>
        <h2 className="text-3xl font-bold tracking-[-0.03em]">Finalizar pago</h2>
        <p className="text-base text-ink/65">Selecciona tu método preferido</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {metodosPago.map((metodo) => (
          <div key={metodo.id} className="space-y-3">
            <button
              type="button"
              onClick={() => onSelectMetodo(metodo.id)}
              className={`group flex w-full items-center justify-between rounded-[1.5rem] border-2 p-4 transition-colors md:p-5 ${
                metodoPagoSeleccionado === metodo.id
                  ? "border-ink bg-brand-accent/40"
                  : "border-transparent bg-cream hover:border-ink/15"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm">
                  <img src={metodo.logo} alt={metodo.label} className="w-full h-full object-contain" />
                </div>
                <span
                  className={`text-base font-semibold ${
                    metodoPagoSeleccionado === metodo.id ? "text-ink" : "text-ink/70"
                  }`}
                >
                  {metodo.label}
                </span>
              </div>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                  metodoPagoSeleccionado === metodo.id ? "border-ink bg-ink" : "border-ink/20 bg-white"
                }`}
              >
                {metodoPagoSeleccionado === metodo.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </button>

            {metodoPagoSeleccionado === metodo.id && (
              <div className="space-y-4 rounded-[1.75rem] bg-white p-5 ring-1 ring-ink/10 animate-in slide-in-from-top-4 duration-300 md:p-6">
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
        className="self-center text-sm font-semibold text-ink/60 underline decoration-brand-primary decoration-2 underline-offset-4 transition-colors hover:text-ink"
      >
        ← Corregir datos de envío
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

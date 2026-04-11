import { CreditCard, ShieldCheck, Smartphone, Bike } from "lucide-react";
import type { CheckoutPaymentData } from "./checkout-types";

const BRAND_LOGOS: Record<"VISA" | "MASTERCARD" | "AMEX", string> = {
  VISA: "https://1000marcas.net/wp-content/uploads/2019/12/VISA-Logo.png",
  MASTERCARD:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png",
  AMEX: "https://cdn-icons-png.flaticon.com/512/179/179431.png",
};

type PanelsProps = {
  paymentData: CheckoutPaymentData;
  onPaymentChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  cardBrand: "VISA" | "MASTERCARD" | "AMEX" | null;
};

export function CheckoutPaymentCardFields({ paymentData, onPaymentChange, cardBrand }: PanelsProps) {
  return (
    <div className="space-y-5 pt-4 animate-in slide-in-from-top-2">
      <div className="bg-[#4a1d44]/5 p-6 rounded-[2rem] border border-[#4a1d44]/10 space-y-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {cardBrand ? (
              <img src={BRAND_LOGOS[cardBrand]} alt={cardBrand} className="h-4 w-auto object-contain animate-in zoom-in" />
            ) : (
              <CreditCard className="opacity-20" size={18} />
            )}
          </div>
          <input
            type="text"
            name="cardNumber"
            placeholder="0000 0000 0000 0000"
            value={paymentData.cardNumber}
            onChange={onPaymentChange}
            className="w-full p-4 pl-14 rounded-2xl bg-white border border-[#4a1d44]/5 outline-none focus:border-[#4a1d44] transition-all text-sm font-bold tracking-widest"
          />
          {cardBrand && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="bg-green-500 w-1.5 h-1.5 rounded-full animate-pulse" />
            </div>
          )}
        </div>
        <input
          type="text"
          name="cardHolder"
          placeholder="Nombre como aparece en la tarjeta"
          value={paymentData.cardHolder}
          onChange={onPaymentChange}
          className="w-full p-4 rounded-2xl bg-white border border-[#4a1d44]/5 outline-none focus:border-[#4a1d44] transition-all text-xs font-bold uppercase tracking-widest"
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="expiry"
            placeholder="MM / YY"
            value={paymentData.expiry}
            onChange={onPaymentChange}
            className="w-full p-4 rounded-2xl bg-white border border-[#4a1d44]/5 outline-none focus:border-[#4a1d44] transition-all text-sm font-bold text-center"
          />
          <input
            type="text"
            name="cvv"
            placeholder="CVV"
            value={paymentData.cvv}
            onChange={onPaymentChange}
            className="w-full p-4 rounded-2xl bg-white border border-[#4a1d44]/5 outline-none focus:border-[#4a1d44] transition-all text-sm font-bold text-center"
          />
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 opacity-40">
        <ShieldCheck size={14} />
        <p className="text-[9px] font-bold uppercase tracking-widest">Pago cifrado de extremo a extremo</p>
      </div>
    </div>
  );
}

export function CheckoutPaymentNequiFields({ paymentData, onPaymentChange }: Omit<PanelsProps, "cardBrand">) {
  return (
    <div className="space-y-5 pt-4 animate-in slide-in-from-top-2">
      <div className="bg-[#E00075]/5 p-8 rounded-[2.5rem] border-2 border-dashed border-[#E00075]/20 flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
          <img src="https://nequi.com.sv/img/icon.png" alt="Nequi" className="w-10 h-10 object-contain" />
        </div>
        <div className="w-full max-w-[240px]">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#E00075]/60 mb-3 block">
            Celular vinculado a Nequi
          </label>
          <input
            type="tel"
            name="phoneNequi"
            placeholder="300 000 0000"
            value={paymentData.phoneNequi}
            onChange={onPaymentChange}
            className="w-full p-5 rounded-2xl bg-white border border-[#E00075]/10 outline-none focus:border-[#E00075] transition-all text-center text-lg font-black tracking-[0.2em] text-[#E00075]"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#E00075] rounded-full">
          <Smartphone size={14} className="text-white" />
          <p className="text-[9px] text-white font-black uppercase tracking-widest">Push dinámico activo</p>
        </div>
      </div>
    </div>
  );
}

export function CheckoutPaymentPseInfo() {
  return (
    <div className="space-y-4 text-center py-6 animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-md overflow-hidden p-4">
        <img
          src="https://d1ih8jugeo2m5m.cloudfront.net/2023/05/pse-1-300x300.png"
          className="w-full h-full object-contain"
          alt=""
        />
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-black uppercase text-[#4a1d44] tracking-widest">Portal Oficial PSE</h4>
        <p className="text-[11px] opacity-60 max-w-[280px] mx-auto leading-relaxed">
          Al hacer clic en el botón de abajo, te llevaré al **Portal Seguro de Wompi** donde podrás elegir tu banco y
          completar tu pago.
        </p>
      </div>
      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mt-4 flex items-center gap-3 text-left">
        <ShieldCheck size={24} className="text-blue-600 shrink-0" />
        <p className="text-[10px] text-blue-800 font-bold leading-tight italic">
          Tu información está protegida por la seguridad bancaria de Wompi.
        </p>
      </div>
    </div>
  );
}

export function CheckoutPaymentBancolombiaInfo() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-[#fdf8f6] p-4 rounded-2xl border border-[#4a1d44]/5">
        <div className="bg-[#2c2c2c] p-2 rounded-lg text-white">
          <Bike size={20} />
        </div>
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
  );
}

import { Lock } from "lucide-react";

export function CheckoutPaymentTrustBar() {
  return (
    <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 opacity-40 grayscale">
      <img src="https://servicios.inm.gov.co/images/Boton_PSE.png" alt="PSE" className="h-6 w-auto" />
      <img src="https://mimerkato.com/wp-content/uploads/2021/04/Nequi-Depositos-2.png" alt="Nequi" className="h-6 w-auto" />
      <div className="flex items-center gap-2 text-[10px] font-black text-[#4a1d44] uppercase tracking-tighter">
        <Lock size={14} /> Pago Cifrado
      </div>
    </div>
  );
}

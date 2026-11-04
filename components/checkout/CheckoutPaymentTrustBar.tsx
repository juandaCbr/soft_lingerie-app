import { Lock } from "lucide-react";

export function CheckoutPaymentTrustBar() {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 border-t border-ink/5 pt-6">
      <img src="https://servicios.inm.gov.co/images/Boton_PSE.png" alt="PSE" className="h-6 w-auto opacity-50 grayscale" />
      <img src="https://mimerkato.com/wp-content/uploads/2021/04/Nequi-Depositos-2.png" alt="Nequi" className="h-6 w-auto opacity-50 grayscale" />
      <div className="flex items-center gap-2 text-sm font-medium text-ink/65">
        <Lock size={15} className="text-brand-dark" /> Pago cifrado
      </div>
    </div>
  );
}

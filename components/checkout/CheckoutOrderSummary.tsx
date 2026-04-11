import { getProductoImage, withSupabaseListThumbnailParams } from "@/app/lib/image-helper";
import type { CheckoutCartLine, MetodoPagoEnvio } from "./checkout-types";

type CheckoutOrderSummaryProps = {
  cart: CheckoutCartLine[];
  totalPrice: number;
  metodoPagoEnvio: MetodoPagoEnvio;
  costoEnvio: number;
  totalConEnvio: number;
};

export function CheckoutOrderSummary({
  cart,
  totalPrice,
  metodoPagoEnvio,
  costoEnvio,
  totalConEnvio,
}: CheckoutOrderSummaryProps) {
  return (
    <div className="space-y-8 lg:sticky lg:top-10 h-fit">
      <h2 className="text-xl font-bold font-playfair uppercase tracking-widest">Tu selección</h2>
      <div className="bg-white p-8 rounded-[2.5rem] border border-[#4a1d44]/5">
        <div className="space-y-6 mb-8">
          {cart.map((item) => {
            const imgPrincipal = withSupabaseListThumbnailParams(getProductoImage(item, 0, "thumb"));

            return (
              <div key={`${item.id}-${item.talla_id ?? ""}`} className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-20 bg-white rounded-2xl overflow-hidden border border-[#4a1d44]/10 shrink-0 shadow-sm">
                    <img src={imgPrincipal} alt={item.nombre} className="w-full h-full object-cover" />
                    <div className="absolute top-0 right-0 bg-[#4a1d44] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-bl-xl font-bold">
                      {item.quantity}
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-tight text-[#4a1d44]">{item.nombre}</p>
                    <div className="flex gap-2 mt-1">
                      <p className="text-[9px] font-black opacity-60 uppercase tracking-widest">
                        ${Number(item.precio).toLocaleString("es-CO")} c/u
                      </p>
                      {item.talla && (
                        <p className="text-[9px] font-black text-pink-600 uppercase tracking-widest">
                          Talla: {item.talla.nombre}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-base text-[#4a1d44]">
                    ${(item.precio * item.quantity).toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-8 border-t-2 border-dashed border-[#4a1d44]/10 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="opacity-70">Subtotal</span>
            <span className="font-bold">${totalPrice.toLocaleString("es-CO")}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="opacity-70 flex items-center gap-2">
              Envío{" "}
              {metodoPagoEnvio === "CONTRAENTREGA" && (
                <span className="text-[10px] font-black bg-[#4a1d44]/10 px-2 py-0.5 rounded-full">Contraentrega</span>
              )}
            </span>
            <span className="font-bold">
              {metodoPagoEnvio === "INCLUIDO" ? `$${costoEnvio.toLocaleString("es-CO")}` : "Por pagar"}
            </span>
          </div>
          <div className="pt-4 border-t border-[#4a1d44]/5">
            <p className="text-[12px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Total a pagar ahora</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-[#4a1d44]">${totalConEnvio.toLocaleString("es-CO")}</span>
              <span className="text-sm font-black opacity-60 tracking-[0.1em]">COP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

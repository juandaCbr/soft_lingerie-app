import { getProductoImage, withSupabaseListThumbnailParams } from "@/app/lib/image-helper";
import type { CheckoutCartLine } from "./checkout-types";

type CheckoutOrderSummaryProps = {
  cart: CheckoutCartLine[];
  totalPrice: number;
  costoEnvio: number;
  totalConEnvio: number;
};

export function CheckoutOrderSummary({
  cart,
  totalPrice,
  costoEnvio,
  totalConEnvio,
}: CheckoutOrderSummaryProps) {
  return (
    <div className="h-fit space-y-5 lg:sticky lg:top-28">
      <h2 className="text-2xl font-bold tracking-[-0.03em]">Tu selección</h2>
      <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/5 md:p-8">
        <div className="space-y-6 mb-8">
          {cart.map((item) => {
            const imgPrincipal = withSupabaseListThumbnailParams(getProductoImage(item, 0, "thumb"));

            return (
              <div key={`${item.id}-${item.talla_id ?? ""}`} className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-16 shrink-0 overflow-visible rounded-2xl bg-blush">
                    <img src={imgPrincipal} alt={item.nombre} className="h-full w-full rounded-2xl object-cover" />
                    <div className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs font-bold text-white ring-2 ring-white">
                      {item.quantity}
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-semibold leading-tight text-ink md:text-lg">{item.nombre}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <p className="text-sm text-ink/60">
                        ${Number(item.precio).toLocaleString("es-CO")} c/u
                      </p>
                      {item.talla && (
                        <p className="text-sm font-semibold text-brand-dark">
                          Talla: {item.talla.nombre}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold tabular-nums text-ink">
                    ${(item.precio * item.quantity).toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 border-t border-ink/10 pt-6">
          <div className="flex items-center justify-between text-[15px]">
            <span className="text-ink/65">Subtotal</span>
            <span className="font-semibold tabular-nums">${totalPrice.toLocaleString("es-CO")}</span>
          </div>
          <div className="flex items-center justify-between text-[15px]">
            <span className="flex items-center gap-2 text-ink/65">Envío</span>
            <span className="font-semibold tabular-nums">${costoEnvio.toLocaleString("es-CO")}</span>
          </div>
          <div className="mt-2 rounded-[1.5rem] bg-ink p-5 text-white">
            <p className="mb-1 text-sm font-semibold text-brand-accent">Total a pagar ahora</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold tabular-nums tracking-[-0.03em]">${totalConEnvio.toLocaleString("es-CO")}</span>
              <span className="text-sm font-medium text-white/60">COP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

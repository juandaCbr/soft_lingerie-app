import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function CheckoutPageHeader() {
  return (
    <div className="mb-10 flex items-center gap-4 md:mb-12">
      <Link href="/carrito" aria-label="Volver al carrito" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-ink/10 transition-colors hover:bg-ink hover:text-white">
        <ArrowLeft size={20} />
      </Link>
      <div>
        <p className="text-sm font-semibold text-brand-dark">Checkout</p>
        <h1 className="text-4xl font-bold leading-[0.95] tracking-[-0.04em] text-ink md:text-5xl">Finalizar compra</h1>
      </div>
    </div>
  );
}

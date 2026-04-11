import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function CheckoutPageHeader() {
  return (
    <div className="flex items-center gap-4 mb-10">
      <Link href="/carrito" className="p-2 hover:bg-[#f2e1d9] rounded-full transition">
        <ArrowLeft size={24} />
      </Link>
      <h1 className="text-3xl font-bold font-playfair text-[#4a1d44]">Checkout</h1>
    </div>
  );
}

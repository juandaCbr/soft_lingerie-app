import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HomeHero() {
  return (
    <section className="relative h-[80vh] w-full bg-[#4a1d44] overflow-hidden flex items-center justify-center text-center px-4">
      <div className="absolute inset-0 opacity-40">
        <img
          src="/home.jpg"
          className="w-full h-full object-cover"
          alt="Soft Lingerie Valledupar - Lencería Exclusiva"
        />
      </div>
      <div className="relative z-10 max-w-4xl">
        <span className="text-white/80 text-[12px] md:text-base font-black uppercase tracking-[0.4em] mb-4 block">
          Boutique Exclusiva
        </span>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1] font-playfair italic">
          Lencería <br className="hidden md:block" /> <span className="text-white">en Valledupar</span>
        </h1>
        <p className="text-violet-100 text-sm md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          Elegancia y diseños exclusivos que resaltan tu belleza natural. Envíos seguros a todo Colombia.
        </p>
        <Link
          href="/productos"
          className="bg-white text-[#4a1d44] px-10 py-5 rounded-full font-bold text-xs md:text-sm hover:bg-[#f2e1d9] transition-all shadow-2xl inline-flex items-center gap-3 uppercase tracking-widest active:scale-95"
        >
          Explorar Catálogo <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

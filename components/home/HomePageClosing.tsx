import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { contactWhatsAppHref } from "@/app/lib/contacto";
import { HomeOrnament, HomeSeal } from "./HomeOrnament";
import { HomeCloud } from "./HomeCloud";

export function HomePageClosing() {
  return (
    <section className="bg-cream px-4 pb-4 pt-8 sm:px-6 lg:px-8">
      <div
        data-scale-in
        className="grain relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-ink px-6 pb-36 pt-16 text-white md:rounded-[3rem] md:px-16 md:pb-52 md:pt-24"
      >
        {/* Cierre en eco con el hero: SOFT desvanecido detrás y nubes rosadas que suben desde abajo */}
        <span
          aria-hidden
          data-speed="-15"
          className="text-wordmark pointer-events-none absolute left-1/2 top-[8%] w-max -translate-x-1/2 select-none whitespace-nowrap px-[0.14em] font-display text-[clamp(8rem,30vw,26rem)] font-extrabold leading-[0.8] tracking-[-0.06em] opacity-[0.08]"
        >
          SOFT
        </span>
        <div data-speed="-12" className="absolute inset-x-[-30%] -bottom-[10%] h-[34%] md:inset-x-[-6%] md:-bottom-[20%] md:h-[48%]">
          <HomeCloud className="inset-0" />
        </div>

        <div className="relative z-[3] flex flex-col items-center gap-12 text-center md:flex-row md:justify-between md:text-left">
          <div className="max-w-xl">
            <HomeOrnament className="justify-center text-brand-accent md:justify-start" />
            <p data-reveal className="mt-5 text-sm font-semibold text-white/70">
              Asesoría personalizada
            </p>
            <h2 data-reveal-lines className="mt-5 font-display text-4xl font-bold leading-[0.95] tracking-[-0.04em] md:text-6xl">
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-line className="block">
                  ¿Dudas con tu talla?
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                <span data-line className="block text-brand-accent">
                  Te ayudamos.
                </span>
              </span>
            </h2>
            <p data-reveal className="mt-6 max-w-md text-base font-medium leading-relaxed text-white/75">
              Escríbenos por WhatsApp y te acompañamos a encontrar la prenda perfecta para ti.
            </p>

            <div data-reveal className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <a
                href={contactWhatsAppHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-brand-accent px-9 text-sm font-bold text-ink transition duration-300 hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <MessageCircle size={16} strokeWidth={1.75} aria-hidden />
                Escríbenos
              </a>
              <Link
                href="/productos"
                className="inline-flex min-h-[56px] items-center justify-center rounded-full border border-white/30 px-9 text-sm font-bold text-white transition duration-300 hover:border-white hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Ver catálogo
              </Link>
            </div>
          </div>

          <HomeSeal text="Asesoría personalizada · WhatsApp · " className="h-48 w-48 text-white md:h-60 md:w-60">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-accent text-ink md:h-24 md:w-24">
              <MessageCircle size={30} strokeWidth={1.5} aria-hidden />
            </span>
          </HomeSeal>
        </div>
      </div>
    </section>
  );
}

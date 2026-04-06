import Link from 'next/link';
import { MessageCircle, Instagram } from 'lucide-react';
import {
  contactWhatsAppHref,
  CONTACT_INSTAGRAM_URL,
} from '@/app/lib/contacto';

export default function SiteFooter() {
  const waHref = contactWhatsAppHref();

  return (
    <footer className="bg-[#4a1d44] text-white mt-20 py-10 sm:py-12 md:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:gap-12 md:grid-cols-12 md:gap-10 lg:gap-12">
          {/* Marca + redes: ancho completo en móvil; en desktop ocupa más espacio */}
          <div className="flex flex-col items-center text-center md:col-span-5 md:items-start md:text-left">
            <h3 className="font-playfair text-xl font-bold uppercase tracking-widest sm:text-2xl">
              Soft Lingerie
            </h3>
            <p className="mt-3 max-w-sm text-sm italic text-white/60">
              Resaltando tu belleza con la mejor calidad.
            </p>
            <div
              className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:justify-start"
              role="navigation"
              aria-label="Redes sociales"
            >
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escríbenos por WhatsApp"
                className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-md shadow-black/20 transition hover:scale-105 hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <MessageCircle size={22} strokeWidth={2} aria-hidden />
              </a>
              <a
                href={CONTACT_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Síguenos en Instagram"
                className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-full bg-gradient-to-tr from-[#F58529] via-[#E1306C] to-[#833AB4] text-white shadow-md shadow-black/20 transition hover:scale-105 hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Instagram size={22} strokeWidth={2} aria-hidden />
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center text-center md:col-span-3 md:items-start md:text-left">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
              Menú
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="text-white/90 underline-offset-4 hover:underline">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/productos" className="text-white/90 underline-offset-4 hover:underline">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href="/rastreo" className="text-white/90 underline-offset-4 hover:underline">
                  Rastreo
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="text-white/90 underline-offset-4 hover:underline">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center text-center md:col-span-4 md:items-start md:text-left">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
              Soporte
            </h4>
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              Pagos seguros con PSE, Nequi y Bancolombia.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

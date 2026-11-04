import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, Instagram, Mail } from 'lucide-react';
import {
  contactWhatsAppHref,
  CONTACT_INSTAGRAM_URL,
  CONTACT_INSTAGRAM_HANDLE,
  CONTACT_EMAIL,
} from '@/app/lib/contacto';

const COLUMNAS = [
  {
    titulo: 'Tienda',
    links: [
      { href: '/', label: 'Inicio' },
      { href: '/productos', label: 'Catálogo' },
      { href: '/tallas', label: 'Catálogo por tallas' },
      { href: '/#novedades', label: 'Novedades' },
      { href: '/#favoritos', label: 'Favoritos' },
    ],
  },
  {
    titulo: 'Ayuda',
    links: [
      { href: '/rastreo', label: 'Rastrear pedido' },
      { href: '/contacto', label: 'Contacto' },
      { href: '/carrito', label: 'Carrito' },
      { href: '/login', label: 'Mi cuenta' },
    ],
  },
];

const link =
  'text-white/75 transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';

/**
 * Pie del sitio con la identidad de la home: vino de marca, Outfit y la palabra SOFT
 * gigante y desvanecida al fondo (eco del hero).
 */
export default function SiteFooter() {
  const waHref = contactWhatsAppHref();

  return (
    <footer className="relative mt-12 overflow-hidden rounded-t-[2rem] bg-ink font-display text-white md:rounded-t-[2.5rem]">
      <div className="relative z-[1] mx-auto max-w-[96rem] px-6 pb-6 pt-10 sm:px-8 md:pt-12 lg:px-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-12 md:gap-8">
          {/* Marca */}
          <div className="col-span-2 md:col-span-5">
            <Link href="/" aria-label="Soft Lingerie, inicio" className="inline-flex items-center gap-3">
              <Image src="/logo.jpg" alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover ring-2 ring-white/15" />
              <span className="flex flex-col leading-none">
                <span className="text-2xl font-extrabold tracking-[-0.05em]">SOFT</span>
                <span className="mt-1 font-accent text-[10px] font-semibold uppercase tracking-[0.36em] text-white/75">Lingerie</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
              Lencería en Valledupar, con envíos a toda Colombia. Resaltando tu belleza con la mejor calidad.
            </p>
            <div className="mt-5 flex gap-3" role="navigation" aria-label="Redes sociales">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escríbenos por WhatsApp"
                className="grid h-12 w-12 place-items-center rounded-full bg-brand-accent text-ink transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <MessageCircle size={20} aria-hidden />
              </a>
              <a
                href={CONTACT_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Síguenos en Instagram"
                className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition-[translate,background-color] duration-300 hover:-translate-y-0.5 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Instagram size={20} aria-hidden />
              </a>
            </div>
          </div>

          {/* Enlaces */}
          {COLUMNAS.map(({ titulo, links }) => (
            <nav key={titulo} aria-label={titulo} className="md:col-span-2">
              <h2 className="text-sm font-semibold text-brand-accent">{titulo}</h2>
              <ul className="mt-4 space-y-2 text-[15px]">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={link}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contacto */}
          <div className="col-span-2 md:col-span-3">
            <h2 className="text-sm font-semibold text-brand-accent">Escríbenos</h2>
            <ul className="mt-4 space-y-2 text-[15px]">
              <li>
                <a href={waHref} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 ${link}`}>
                  <MessageCircle size={16} aria-hidden /> WhatsApp
                </a>
              </li>
              <li>
                <a href={CONTACT_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 ${link}`}>
                  <Instagram size={16} aria-hidden /> {CONTACT_INSTAGRAM_HANDLE}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className={`inline-flex items-center gap-2 break-all ${link}`}>
                  <Mail size={16} aria-hidden /> {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-5 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Soft Lingerie. Valledupar, Colombia.</p>
          <p>Pagos seguros con PSE, Nequi y Bancolombia.</p>
        </div>
      </div>

      {/* SOFT de fondo, detrás del contenido y cortado por el borde inferior (eco del hero, sin sumar alto) */}
      <p
        aria-hidden
        className="text-wordmark pointer-events-none absolute -bottom-[0.22em] left-1/2 z-0 w-max -translate-x-1/2 select-none whitespace-nowrap px-[0.14em] text-[clamp(7rem,24vw,22rem)] font-extrabold leading-[0.8] tracking-[-0.06em] opacity-[0.07]"
      >
        SOFT
      </p>
    </footer>
  );
}

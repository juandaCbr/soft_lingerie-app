"use client";

import { useEffect, useRef, useState } from 'react';
import LinkComponent from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { ShoppingBag, User, LogOut, Menu, X, MessageCircle, Instagram } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useCart } from '@/context/CartContext';
import { contactWhatsAppHref, CONTACT_INSTAGRAM_URL } from '@/app/lib/contacto';
import AdminButton from './AdminButton';

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/productos', label: 'Catálogo' },
  { href: '/rastreo', label: 'Rastrear pedido' },
  { href: '/contacto', label: 'Contacto' },
];

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

const iconButton =
  'grid h-11 w-11 place-items-center rounded-full text-ink/70 transition-colors duration-300 hover:bg-brand-accent/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/** Marca: misma voz que el hero (SOFT pesado y apretado, LINGERIE fino y espaciado) */
function Wordmark() {
  return (
    <LinkComponent href="/" aria-label="Soft Lingerie, inicio" className="group flex items-center gap-3">
      <Image
        src="/logo.jpg"
        alt=""
        width={48}
        height={48}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-ink/10 md:h-11 md:w-11"
        priority
      />
      <span className="flex flex-col leading-none text-ink">
        <span className="text-xl font-extrabold tracking-[-0.05em] md:text-2xl">SOFT</span>
        <span className="mt-0.5 font-accent text-[9px] font-semibold uppercase tracking-[0.36em] transition-[letter-spacing] duration-700 group-hover:tracking-[0.5em] md:text-[10px]">
          Lingerie
        </span>
      </span>
    </LinkComponent>
  );
}

export default function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);

  const cartContext = useCart();
  const totalItems = cartContext?.totalItems ?? 0;
  const pathname = usePathname();
  const router = useRouter();

  // Cierra el menú al cambiar de página
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setIsMenuOpen(false);
  }

  // Se esconde al bajar y vuelve al subir; la posición previa va en un ref para no re-renderizar en cada scroll
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setIsHidden(y > lastScrollY.current && y > 120);
      setIsScrolled(y > 8);
      lastScrollY.current = y;
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Con el menú móvil abierto no se desplaza la página de fondo
  useEffect(() => {
    if (!isMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Error session:', err);
      } finally {
        setLoading(false);
      }
    };
    getSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const hidden = isHidden && !isMenuOpen;

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-[100] font-display transition-[translate,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        } ${
          isMenuOpen
            ? 'bg-transparent'
            : isScrolled
              ? 'bg-cream/85 shadow-[0_1px_0_rgba(74,29,68,0.08)] backdrop-blur-xl'
              : 'bg-cream'
        }`}
      >
        <div className="relative z-[102] mx-auto flex h-16 max-w-[96rem] items-center justify-between gap-6 px-4 sm:px-6 md:h-20 lg:px-8">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`${iconButton} -ml-2 md:hidden`}
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isMenuOpen}
              aria-controls="menu-movil"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Wordmark />
          </div>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <LinkComponent
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative block rounded-full px-4 py-2 text-[15px] font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                      active ? 'text-ink' : 'text-ink/55 hover:text-ink'
                    }`}
                  >
                    {label}
                    <span
                      aria-hidden
                      className={`absolute inset-x-4 -bottom-0.5 h-[3px] origin-left rounded-full bg-brand-primary transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        active ? 'scale-x-100' : 'scale-x-0'
                      }`}
                    />
                  </LinkComponent>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden lg:block">{!loading && <AdminButton />}</div>

            {!loading &&
              (user ? (
                <button type="button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión" className={iconButton}>
                  <LogOut size={20} />
                </button>
              ) : (
                <LinkComponent href="/login" aria-label="Mi cuenta" title="Mi cuenta" className={iconButton}>
                  <User size={21} />
                </LinkComponent>
              ))}

            <LinkComponent
              href="/carrito"
              aria-label={totalItems > 0 ? `Carrito, ${totalItems} prendas` : 'Carrito'}
              className="group relative grid h-11 w-11 place-items-center rounded-full bg-ink text-white shadow-lg shadow-ink/20 transition-transform duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <ShoppingBag size={19} />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-accent px-1 text-[11px] font-bold tabular-nums text-ink ring-2 ring-cream">
                  {totalItems}
                </span>
              )}
            </LinkComponent>
          </div>
        </div>
      </nav>

      {/* Menú móvil: el mismo cielo rosa del hero, con enlaces grandes y nubes al pie */}
      <div
        id="menu-movil"
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
        className={`fixed inset-0 z-[99] flex flex-col overflow-hidden bg-[radial-gradient(130%_90%_at_50%_0%,#d7a9c7_0%,#e5bed7_38%,#f2cbe2_72%,#f6d6e9_100%)] font-display transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
          isMenuOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0'
        }`}
      >
        <ul className="flex flex-1 flex-col justify-center gap-2 px-6 pt-16">
          {LINKS.map(({ href, label }, i) => {
            const active = isActive(pathname, href);
            return (
              <li
                key={href}
                className={`transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
                style={{ transitionDelay: isMenuOpen ? `${120 + i * 60}ms` : '0ms' }}
              >
                <LinkComponent
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`block py-1 text-[clamp(2.5rem,12vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.05em] ${
                    active ? 'text-white' : 'text-ink'
                  }`}
                >
                  {label}
                </LinkComponent>
              </li>
            );
          })}
        </ul>

        <div className="relative z-[1] flex items-center justify-between gap-4 px-6 pb-8">
          <div>{!loading && <AdminButton />}</div>
          <div className="flex gap-2">
            <a
              href={contactWhatsAppHref()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Escríbenos por WhatsApp"
              className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white"
            >
              <MessageCircle size={20} aria-hidden />
            </a>
            <a
              href={CONTACT_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Síguenos en Instagram"
              className="grid h-12 w-12 place-items-center rounded-full bg-white text-ink"
            >
              <Instagram size={20} aria-hidden />
            </a>
          </div>
        </div>

        <Image
          src="/images/nube-rosa.webp"
          alt=""
          aria-hidden
          width={2400}
          height={1227}
          sizes="200vw"
          className="pointer-events-none absolute -bottom-[30%] left-1/2 h-[55%] w-auto max-w-none -translate-x-1/2 opacity-90"
        />
      </div>
    </>
  );
}

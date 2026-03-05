"use client";

import { useEffect, useState } from 'react';
import LinkComponent from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, User, LogOut, Loader2, Menu, X } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useCart } from '@/context/CartContext';
import AdminButton from './AdminButton'; 

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const { totalItems } = useCart(); 
  const pathname = usePathname();
  const router = useRouter();

  // Cerrar el menú si cambiamos de página
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Scroll Inteligente
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
        setIsMenuOpen(false); // También cerramos el menú si el usuario scrollea
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Manejo de Sesión
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
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

  const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => {
    const active = pathname === href;
    return (
      <LinkComponent href={href} className="relative py-2 px-1">
        <span className={`
          block transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] uppercase font-bold text-[14px] md:text-[15px]
          ${active 
            ? 'text-[#4a1d44] tracking-[0.15em] opacity-100' 
            : 'text-[#4a1d44] opacity-30 hover:opacity-100 hover:tracking-[0.1em] tracking-normal'
          }
        `}>
          {children}
        </span>
        <span className={`
          absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#4a1d44] rounded-full 
          transition-all duration-700 ease-out
          ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
        `}></span>
      </LinkComponent>
    );
  };

  return (
    <>
      {/* OVERLAY: Capa para cerrar el menú al tocar fuera */}
      <div 
        className={`fixed inset-0 bg-black/5 backdrop-blur-[2px] z-[90] transition-opacity duration-500 md:hidden ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMenuOpen(false)}
      />

      <nav className={`fixed top-0 left-0 right-0 z-[100] bg-white/60 backdrop-blur-2xl transition-all duration-700 ease-in-out ${
        isVisible ? "translate-y-0 shadow-sm" : "-translate-y-full"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex justify-between items-center relative z-[101]">
          
          {/* LOGO */}
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-[#4a1d44] p-1 active:scale-90 transition-transform" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <LinkComponent href="/" className="flex flex-col group cursor-pointer">
              <span className="text-[16px] md:text-2xl font-black text-[#4a1d44] leading-none uppercase transition-all duration-1000 ease-out tracking-tight group-hover:tracking-[0.05em]">
                Soft
              </span>
              <span className="text-[16px] md:text-2xl font-black text-[#4a1d44] leading-none uppercase transition-all duration-1000 ease-out opacity-80 tracking-widest group-hover:tracking-[0.35em]">
                Lingerie
              </span>
            </LinkComponent>
          </div>

          {/* NAVEGACIÓN PC */}
          <div className="hidden md:flex items-center gap-10">
            <NavLink href="/">Inicio</NavLink>
            <NavLink href="/productos">Catálogo</NavLink>
            <NavLink href="/contacto">Contacto</NavLink>
          </div>

          {/* BOTONES DERECHA */}
          <div className="flex gap-4 md:gap-6 items-center">
            <div className="hidden sm:block">
              {!loading && <AdminButton />}
            </div>

            <div className="flex items-center gap-3">
              {!loading && (
                user ? (
                  <button onClick={handleLogout} className="text-[#4a1d44]/60 hover:text-[#4a1d44] transition-colors duration-500">
                    <LogOut size={20} />
                  </button>
                ) : (
                  <LinkComponent href="/login" className="text-[#4a1d44]/60 hover:text-[#4a1d44] transition-colors duration-500">
                    <User size={22} />
                  </LinkComponent>
                )
              )}
              
              <LinkComponent href="/carrito" className="relative group">
                <div className="bg-[#4a1d44] text-white p-2.5 rounded-full shadow-lg group-hover:scale-105 transition-all duration-500">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-[#4a1d44] text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-[#4a1d44]">
                    {totalItems}
                  </span>
                )}
              </LinkComponent>
            </div>
          </div>
        </div>

        {/* MENÚ MÓVIL */}
        <div className={`md:hidden overflow-hidden transition-all duration-1000 ease-in-out bg-white/95 backdrop-blur-md relative z-[101] ${
          isMenuOpen ? "max-h-screen opacity-100 border-b border-[#4a1d44]/5" : "max-h-0 opacity-0"
        }`}>
          <div className="p-10 flex flex-col items-center gap-6">
            <LinkComponent href="/" onClick={() => setIsMenuOpen(false)} className="text-base font-bold tracking-[0.15em] text-[#4a1d44] uppercase">Inicio</LinkComponent>
            <LinkComponent href="/productos" onClick={() => setIsMenuOpen(false)} className="text-base font-bold tracking-[0.15em] text-[#4a1d44] uppercase">Catálogo</LinkComponent>
            <LinkComponent href="/contacto" onClick={() => setIsMenuOpen(false)} className="text-base font-bold tracking-[0.15em] text-[#4a1d44] uppercase pb-4 w-full text-center border-b border-[#4a1d44]/5">Contacto</LinkComponent>
            <div className="pt-2">
              {!loading && <AdminButton />}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
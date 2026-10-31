"use client";

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '@/context/CartContext'; // 1. Importamos el hook del carrito
import { CieloRosa } from '@/components/ui/CieloRosa';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart(); // 2. Extraemos la función para limpiar

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (searchParams.get('verified') === 'true') {
        setMensajeExito("¡Cuenta verificada con éxito! Ya puedes iniciar sesión.");
        if (session) {
          await supabase.auth.signOut();
          clearCart(); // Limpiamos carrito si había una sesión vieja
          router.refresh();
        }
      } 
      else if (session) {
        router.push('/');
      }
    };

    checkUser();
  }, [searchParams, router, clearCart]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 3. Antes de intentar el nuevo login, nos aseguramos de limpiar lo que haya en el local
      clearCart(); 

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('¡Bienvenida de nuevo!');
      
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 500);

    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CieloRosa as="main" variante="pagina" banco="top-[82%]" className="mx-2 mb-4 flex min-h-[calc(100svh-6rem)] items-center justify-center px-4 pb-28 pt-12 font-display text-ink sm:mx-3">
      <div className="relative z-10 w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl shadow-ink/15 md:p-10">
        
        {mensajeExito && (
          <div className="mb-8 flex items-center gap-3 rounded-[1.25rem] bg-brand-accent/60 p-4 animate-in fade-in zoom-in duration-500">
            <CheckCircle2 className="shrink-0 text-ink" size={20} />
            <p className="text-sm font-medium leading-snug text-ink">
              {mensajeExito}
            </p>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-[-0.04em] text-ink">Iniciar sesión</h1>
          <p className="mt-2 text-base text-ink/60">Gestiona tus pedidos y tu perfil</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="ml-2 block text-sm font-semibold text-ink/75">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-2xl bg-cream py-4 pl-12 pr-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-2 block text-sm font-semibold text-ink/75">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <input 
                required
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl bg-cream py-4 pl-12 pr-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="group flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-ink text-base font-bold text-white shadow-xl shadow-ink/25 transition-colors hover:bg-brand-dark active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                Entrar a mi cuenta
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-ink/5 pt-6 text-center">
          <p className="text-[15px] text-ink/60">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="font-semibold text-ink underline decoration-brand-primary decoration-2 underline-offset-4 hover:text-brand-dark">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </CieloRosa>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <Loader2 className="animate-spin text-ink" size={40} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
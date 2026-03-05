"use client";

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '@/context/CartContext'; // 1. Importamos el hook del carrito

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
    <main className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#fdf8f6] p-6">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl shadow-[#4a1d44]/5 p-8 md:p-12 border border-[#4a1d44]/5">
        
        {mensajeExito && (
          <div className="mb-8 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-500">
            <CheckCircle2 className="text-green-600 shrink-0" size={20} />
            <p className="text-green-800 text-xs font-bold leading-tight">
              {mensajeExito}
            </p>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black font-playfair text-[#4a1d44] tracking-tight">Iniciar Sesión</h1>
          <p className="text-sm text-[#4a1d44]/50 mt-2 font-medium">Gestiona tus pedidos y tu perfil</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a1d44]/40 ml-4">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a1d44]/30" size={18} />
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-[#fdf8f6] border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[#4a1d44]/10 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a1d44]/40 ml-4">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a1d44]/30" size={18} />
              <input 
                required
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#fdf8f6] border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[#4a1d44]/10 outline-none transition-all"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-[#4a1d44] text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-[#4a1d44]/20 hover:bg-[#6b2b62] transition-all active:scale-95 flex items-center justify-center gap-2 group"
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

        <div className="mt-8 pt-8 border-t border-gray-50 text-center">
          <p className="text-sm text-[#4a1d44]/40">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="text-[#4a1d44] font-bold hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8f6]">
        <Loader2 className="animate-spin text-[#4a1d44]" size={40} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
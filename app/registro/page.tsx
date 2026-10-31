"use client";

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Loader2, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { CieloRosa } from '@/components/ui/CieloRosa';

export default function RegisterPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombre,
          },
          // CAMBIO AQUÍ: Redirigimos al login con el parámetro de verificado
          emailRedirectTo: `${window.location.origin}/login?verified=true`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('perfiles')
          .insert([{
            id: authData.user.id,
            nombre_completo: nombre,
            email: email,
            telefono: telefono,
            es_admin: false 
          }]);
        
        if (profileError) {
          console.error("Error al crear perfil:", profileError);
          throw new Error("El usuario se creó, pero hubo un error al guardar el perfil.");
        }
      }

      toast.success('¡Revisa tu correo para verificar tu cuenta!', {
        duration: 5000,
      });
      
      setTimeout(() => {
        router.push('/verificar');
      }, 1500);

    } catch (error: any) {
      toast.error(error.message || 'Hubo un error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CieloRosa variante="pagina" banco="top-[82%]" className="mx-2 mb-4 flex min-h-[calc(100svh-6rem)] items-center justify-center px-4 pb-28 pt-12 font-display text-ink sm:mx-3">
      <div className="relative z-10 w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl shadow-ink/15 md:p-10">
        
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold tracking-[-0.04em] text-ink">Crear cuenta</h2>
          <p className="mt-2 text-base text-ink/60">Únete a la comunidad de Soft Lingerie</p>
        </div>

        <form className="space-y-5" onSubmit={handleRegister}>
          <div className="space-y-1">
            <label className="ml-2 block text-sm font-semibold text-ink/75">Nombre Completo</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <input 
                type="text" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-2xl bg-cream py-4 pl-12 pr-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
                placeholder="Tu nombre completo"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="ml-2 block text-sm font-semibold text-ink/75">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl bg-cream py-4 pl-12 pr-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
                placeholder="ejemplo@correo.com"
                required
                maxLength={254}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="ml-2 block text-sm font-semibold text-ink/75">Teléfono / WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <input 
                type="tel" 
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-2xl bg-cream py-4 pl-12 pr-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
                placeholder="300 123 4567"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="ml-2 block text-sm font-semibold text-ink/75">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl bg-cream py-4 pl-12 pr-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-ink text-base font-bold text-white shadow-xl shadow-ink/25 transition-colors hover:bg-brand-dark active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Registrarme'}
          </button>
        </form>

        <div className="mt-8 border-t border-ink/5 pt-6 text-center text-[15px] text-ink/60">
          ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-ink underline decoration-brand-primary decoration-2 underline-offset-4 hover:text-brand-dark">Inicia sesión</Link>
        </div>
      </div>
    </CieloRosa>
  );
}
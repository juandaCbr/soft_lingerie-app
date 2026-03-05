"use client";

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Loader2, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

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
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 bg-[#fdf8f6]">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl p-8 md:p-10 border border-[#4a1d44]/5">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black font-playfair text-[#4a1d44] tracking-tight">Crear Cuenta</h2>
          <p className="text-[#4a1d44]/60 mt-2 font-medium">Únete a la comunidad de Soft Lingerie</p>
        </div>

        <form className="space-y-5" onSubmit={handleRegister}>
          <div className="space-y-1">
            <label className="block text-[#4a1d44] font-bold ml-2 text-[10px] uppercase tracking-widest opacity-60">Nombre Completo</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a1d44]/30" size={18} />
              <input 
                type="text" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#fdf8f6] border-none rounded-2xl outline-none text-sm text-[#4a1d44] focus:ring-2 focus:ring-[#4a1d44]/10 transition-all"
                placeholder="Tu nombre completo"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[#4a1d44] font-bold ml-2 text-[10px] uppercase tracking-widest opacity-60">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a1d44]/30" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#fdf8f6] border-none rounded-2xl outline-none text-sm text-[#4a1d44] focus:ring-2 focus:ring-[#4a1d44]/10 transition-all"
                placeholder="ejemplo@correo.com"
                required
                maxLength={254}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[#4a1d44] font-bold ml-2 text-[10px] uppercase tracking-widest opacity-60">Teléfono / WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a1d44]/30" size={18} />
              <input 
                type="tel" 
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#fdf8f6] border-none rounded-2xl outline-none text-sm text-[#4a1d44] focus:ring-2 focus:ring-[#4a1d44]/10 transition-all"
                placeholder="300 123 4567"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[#4a1d44] font-bold ml-2 text-[10px] uppercase tracking-widest opacity-60">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a1d44]/30" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#fdf8f6] border-none rounded-2xl outline-none text-sm text-[#4a1d44] focus:ring-2 focus:ring-[#4a1d44]/10 transition-all"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#4a1d44] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#6b2b62] transition-all flex justify-center items-center gap-2 mt-4 shadow-lg shadow-[#4a1d44]/20 active:scale-95 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Registrarme'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-[#4a1d44]/60 pt-6 border-t border-[#4a1d44]/5">
          ¿Ya tienes cuenta? <Link href="/login" className="text-[#4a1d44] font-black hover:underline">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import { Settings } from 'lucide-react';

export default function AdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Función que va a la tabla 'perfiles' a ver si tiene el rol de admin
    const verificarAdmin = async (userId: string) => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('es_admin')
        .eq('id', userId)
        .single();
        
      if (data && data.es_admin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };

    // 1. Revisar si ya hay alguien logueado cuando se recarga la página
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) verificarAdmin(session.user.id);
    });

    // 2. MAGIA: Escuchar en tiempo real cuando alguien hace Login o Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        verificarAdmin(session.user.id);
      } else {
        setIsAdmin(false); // Si cierra sesión, escondemos el botón
      }
    });

    // Limpiar el escuchador cuando desmontamos el componente
    return () => subscription.unsubscribe();
  }, []);

  // Si no es admin, devolvemos 'null' para que el botón sea invisible
  if (!isAdmin) return null; 

  // Si sí es admin, mostramos el botón con el diseño de Soft Lingerie
  return (
    <Link 
      href="/admin" 
      className="flex min-h-11 items-center gap-2 rounded-full border border-ink/20 bg-cream px-4 font-display text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
    >
      <Settings size={16} />
      Panel Admin
    </Link>
  );
}
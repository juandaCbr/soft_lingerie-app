import { MailCheck } from 'lucide-react';
import Link from 'next/link';

export default function VerifyPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 bg-[#fdf8f6]">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl p-10 text-center border border-[#4a1d44]/5">
        
        <div className="flex justify-center mb-8">
          <div className="bg-[#f2e1d9] p-5 rounded-full shadow-inner">
            <MailCheck size={56} className="text-[#4a1d44]" />
          </div>
        </div>
        
        <h2 className="text-3xl font-black font-playfair text-[#4a1d44] tracking-tight mb-4">
          ¡Casi listo!
        </h2>
        
        <p className="text-[#4a1d44]/70 mb-8 leading-relaxed font-medium">
          Hemos enviado un enlace de confirmación a tu correo electrónico. 
          Por favor, verifícalo para activar tu cuenta en <strong className="font-black">Soft Lingerie</strong>.
        </p>
        
        <div className="space-y-6 pt-6 border-t border-[#4a1d44]/5">
          <p className="text-xs text-[#4a1d44]/50 font-medium">
            ¿No recibiste nada? Revisa tu carpeta de spam o correo no deseado.
          </p>
          
          <Link 
            href="/login" 
            className="inline-block bg-[#4a1d44] text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-[#6b2b62] transition-all active:scale-95"
          >
            Ir a Iniciar Sesión
          </Link>
        </div>

      </div>
    </div>
  );
}
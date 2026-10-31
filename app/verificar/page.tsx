import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { HomeCloud, HomeCloudBank } from '@/components/home/HomeCloud';

export default function VerifyPage() {
  return (
    <div className="relative isolate mx-2 mb-4 flex min-h-[calc(100svh-6rem)] items-center justify-center overflow-hidden rounded-[1.75rem] bg-[radial-gradient(130%_90%_at_50%_0%,#d7a9c7_0%,#e5bed7_38%,#f2cbe2_72%,#f6d6e9_100%)] px-4 pb-28 pt-12 font-display text-ink sm:mx-3 md:rounded-[2.75rem]">
        <HomeCloud fade sizes="20vw" className="left-[-5%] top-[8%] -z-10 aspect-[2/1] w-[40%] opacity-60 md:w-[16%]" />
        <HomeCloud fade flip sizes="16vw" className="right-[-4%] top-[4%] -z-10 aspect-[2/1] w-[34%] opacity-50 md:w-[13%]" />
        <HomeCloudBank className="inset-x-0 bottom-0 top-[82%] -z-10" />
      <div className="relative z-10 w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl shadow-ink/15 md:p-10 text-center">
        
        <div className="flex justify-center mb-8">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-accent">
            <MailCheck size={36} className="text-ink" />
          </div>
        </div>
        
        <h2 className="mb-4 text-4xl font-bold tracking-[-0.04em] text-ink">
          ¡Casi listo!
        </h2>
        
        <p className="mb-8 text-base leading-relaxed text-ink/70">
          Hemos enviado un enlace de confirmación a tu correo electrónico. 
          Por favor, verifícalo para activar tu cuenta en <strong className="font-semibold text-ink">Soft Lingerie</strong>.
        </p>
        
        <div className="space-y-6 border-t border-ink/5 pt-6">
          <p className="text-sm text-ink/55">
            ¿No recibiste nada? Revisa tu carpeta de spam o correo no deseado.
          </p>
          
          <Link 
            href="/login" 
            className="inline-flex min-h-[52px] items-center rounded-full bg-ink px-8 text-sm font-bold text-white shadow-xl shadow-ink/25 transition-colors hover:bg-brand-dark active:scale-[0.98]"
          >
            Ir a iniciar sesión
          </Link>
        </div>

      </div>
    </div>
  );
}
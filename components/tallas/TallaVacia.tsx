import { Heart, MessageCircle } from "lucide-react";
import { contactWhatsAppHref } from "@/app/lib/contacto";

/** Talla que existe pero hoy no tiene prendas con stock. */
export function TallaVacia({ talla }: { talla: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-[2rem] bg-white px-6 py-20 text-center ring-1 ring-ink/5">
      <Heart size={40} className="mb-4 text-brand-primary" aria-hidden />
      <p className="text-xl font-semibold">Por ahora no hay prendas en talla {talla}</p>
      <p className="mt-2 text-ink/60">Escríbenos y te avisamos apenas llegue algo para ti.</p>
      <a
        href={contactWhatsAppHref()}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-7 text-sm font-bold text-white"
      >
        <MessageCircle size={17} aria-hidden /> Escríbenos por WhatsApp
      </a>
    </div>
  );
}

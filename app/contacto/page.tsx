"use client";

import React from 'react';
import {
  MessageCircle,
  Instagram,
  Mail,
  Clock,
  ArrowRight,
  Heart,
  MapPin
} from 'lucide-react';
import {
  contactWhatsAppHref,
  CONTACT_INSTAGRAM_URL,
  CONTACT_INSTAGRAM_HANDLE,
  CONTACT_EMAIL,
} from '@/app/lib/contacto';
import { CieloRosa } from '@/components/ui/CieloRosa';

const canal =
  'group flex items-center justify-between gap-4 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-ink/5 transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-ink/10 md:p-6';

export default function ContactoPage() {
  const whatsappHref = contactWhatsAppHref();

  return (
    <div className="min-h-screen bg-cream pb-20 font-display text-ink">
      {/* Encabezado: el cielo rosa de la marca */}
      <div className="px-2 sm:px-3">
        <CieloRosa className="px-6 pb-36 pt-14 text-center md:pb-44 md:pt-20">
          <p className="relative text-sm font-semibold text-brand-dark">Atención personalizada</p>
          <h1 className="relative mx-auto mt-2 max-w-3xl text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-7xl">
            Estamos para acompañarte
          </h1>
          <p className="relative mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink/75 md:text-lg">
            Cada prenda de Soft Lingerie busca resaltar tu confianza. Si tienes dudas con tu talla o el estado de tu pedido, nuestro equipo está listo para asesorarte.
          </p>

          <ul className="relative mt-8 flex flex-wrap justify-center gap-3 text-sm font-medium">
            <li className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2">
              <Clock size={15} className="text-brand-dark" aria-hidden /> Lunes a sábado: 9:00 AM - 7:00 PM
            </li>
            <li className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2">
              <Heart size={15} className="text-brand-dark" aria-hidden /> Atención personalizada y discreta
            </li>
          </ul>
        </CieloRosa>
      </div>

      {/* Canales de contacto */}
      <div className="relative z-10 mx-auto -mt-24 max-w-3xl px-4 sm:px-6">
        <h2 className="sr-only">Nuestros canales</h2>
        <div className="grid gap-3 md:gap-4">
          {/* Opcion: WhatsApp */}
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={canal}>
            <div className="flex items-center gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-white">
                <MessageCircle size={24} />
              </div>
              <div>
                <p className="text-lg font-semibold">WhatsApp asesoría</p>
                <p className="text-[15px] text-ink/60">Respuesta inmediata</p>
              </div>
            </div>
            <ArrowRight size={20} className="shrink-0 text-ink/30 transition-[color,translate] group-hover:translate-x-1 group-hover:text-ink" />
          </a>

          {/* Opcion: Instagram */}
          <a href={CONTACT_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={canal}>
            <div className="flex items-center gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-accent text-ink">
                <Instagram size={24} />
              </div>
              <div>
                <p className="text-lg font-semibold">Instagram</p>
                <p className="text-[15px] text-ink/60">{CONTACT_INSTAGRAM_HANDLE}</p>
              </div>
            </div>
            <ArrowRight size={20} className="shrink-0 text-ink/30 transition-[color,translate] group-hover:translate-x-1 group-hover:text-ink" />
          </a>

          {/* Opcion: Email */}
          <a href={`mailto:${CONTACT_EMAIL}`} className={canal}>
            <div className="flex min-w-0 items-center gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blush text-ink">
                <Mail size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold">Correo electrónico</p>
                <p className="break-all text-[15px] text-ink/60">{CONTACT_EMAIL}</p>
              </div>
            </div>
            <ArrowRight size={20} className="shrink-0 text-ink/30 transition-[color,translate] group-hover:translate-x-1 group-hover:text-ink" />
          </a>
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-center font-accent text-sm font-semibold uppercase tracking-[0.32em] text-ink/80">
          <MapPin size={16} className="text-brand-dark" aria-hidden /> Valledupar, Colombia
        </p>
      </div>
    </div>
  );
}

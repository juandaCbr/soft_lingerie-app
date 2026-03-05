"use client";

import React from 'react';
import {
  MessageCircle,
  Instagram,
  Mail,
  Clock,
  ArrowRight,
  Heart
} from 'lucide-react';

export default function ContactoPage() {
  const numeroWhatsApp = "573118897646";
  const mensaje = encodeURIComponent("¡Hola! Me gustaría recibir asesoría personalizada sobre sus prendas.");

  return (
    <div className="min-h-screen bg-[#fdf8f6] flex items-center justify-center p-4 md:p-10 text-[#4a1d44]">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-[3rem] shadow-[0_30px_100px_-20px_rgba(74,29,68,0.15)] overflow-hidden border border-[#4a1d44]/5">

        {/* Columna Izquierda: Mensaje y Marca */}
        <div className="p-10 md:p-16 flex flex-col justify-center bg-[#4a1d44] text-white relative overflow-hidden">
          {/* Decoracion de fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-60 mb-4 block">Atención Premium</span>
            <h1 className="text-4xl md:text-5xl font-black font-playfair italic mb-6 leading-tight">
              Estamos para <br /> acompañarte
            </h1>
            <p className="text-white/70 text-sm leading-relaxed mb-8 font-medium">
              Cada prenda de Soft Lingerie busca resaltar tu confianza. Si tienes dudas con tu talla o el estado de tu pedido, nuestro equipo está listo para asesorarte.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs font-bold opacity-80">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Clock size={14} />
                </div>
                <span>Lunes a Sábado: 9:00 AM - 7:00 PM</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold opacity-80">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Heart size={14} />
                </div>
                <span>Atención personalizada y discreta</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Canales de Contacto */}
        <div className="p-10 md:p-16 flex flex-col justify-center bg-white">
          <h2 className="text-xs font-black uppercase tracking-widest mb-10 opacity-40">Nuestros Canales</h2>

          <div className="space-y-6">
            {/* Opcion: WhatsApp */}
            <a
              href={`https://wa.me/${numeroWhatsApp}?text=${mensaje}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-6 bg-[#25D366]/5 hover:bg-[#25D366]/10 border border-[#25D366]/10 rounded-[2rem] transition-all active:scale-95"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-[#25D366] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#25D366]/20">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tighter">WhatsApp Asesoría</p>
                  <p className="text-[10px] font-bold opacity-50">Respuesta inmediata</p>
                </div>
              </div>
              <ArrowRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </a>

            {/* Opcion: Instagram */}
            <a
              href="https://instagram.com/soft.lingerie_"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-6 bg-[#E1306C]/5 hover:bg-[#E1306C]/10 border border-[#E1306C]/10 rounded-[2rem] transition-all active:scale-95"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-gradient-to-tr from-[#F58529] via-[#E1306C] to-[#833AB4] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#E1306C]/20">
                  <Instagram size={24} />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tighter">Instagram</p>
                  <p className="text-[10px] font-bold opacity-50">@soft.lingerie_</p>
                </div>
              </div>
              <ArrowRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </a>

            {/* Opcion: Email */}
            <div className="flex items-center gap-5 p-6 border border-[#4a1d44]/5 rounded-[2rem] opacity-60">
              <div className="w-12 h-12 bg-[#4a1d44]/5 text-[#4a1d44] rounded-2xl flex items-center justify-center">
                <Mail size={24} />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-tighter">Correo Electrónico</p>
                <p className="text-[10px] font-bold">softlingerie8@gmail.com</p>
              </div>
            </div>
          </div>

          <p className="mt-12 text-[9px] font-bold uppercase tracking-[0.3em] text-center opacity-30">
            Valledupar, Colombia
          </p>
        </div>

      </div>
    </div>
  );
}
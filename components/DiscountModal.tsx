"use client";

import { useState, useEffect } from 'react';
import { X, Gift, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DiscountModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verificar si ya se mostró o si el usuario ya está logueado
    const hasSeenModal = localStorage.getItem('hasSeenDiscountModal');
    
    if (!hasSeenModal) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000); // Aparece a los 3 segundos
      return () => clearTimeout(timer);
    }
  }, []);

  const closeModal = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenDiscountModal', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
        
        <button onClick={closeModal} className="absolute top-4 right-4 text-brand-dark/40 hover:text-brand-dark transition">
          <X size={24} />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Lado de la imagen/color */}
          <div className="bg-[#4a1d44] md:w-1/3 flex items-center justify-center p-8">
            <Gift size={60} className="text-white animate-bounce" />
          </div>

          {/* Contenido */}
          <div className="p-8 md:w-2/3">
            <h2 className="text-2xl font-bold text-brand-dark mb-2">¡Bienvenida a Soft!</h2>
            <p className="text-brand-dark/60 text-sm mb-6">
              Regístrate hoy y obtén un <span className="font-bold text-brand-secondary text-lg">10% OFF</span> en tu primera compra de lencería.
            </p>

            <div className="flex flex-col gap-3">
              <Link 
                href="/registro" 
                onClick={closeModal}
                className="bg-brand-dark text-white text-center py-3 rounded-xl font-bold hover:bg-brand-secondary transition flex items-center justify-center gap-2"
              >
                Crear mi cuenta <ArrowRight size={18} />
              </Link>
              <button 
                onClick={closeModal}
                className="text-xs text-brand-dark/40 hover:underline"
              >
                No gracias, prefiero pagar precio completo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
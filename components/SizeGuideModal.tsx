"use client";

import { X, Ruler } from 'lucide-react';
import { useEffect } from 'react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  // Bloquear el scroll del fondo cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const tallas = [
    { talla: 'XS', brasier: '30', busto: '78 - 82 cm' },
    { talla: 'S', brasier: '32', busto: '83 - 87 cm' },
    { talla: 'M', brasier: '34', busto: '88 - 92 cm' },
    { talla: 'L', brasier: '36', busto: '93 - 97 cm' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
      {/* Overlay con fade-in */}
      <div 
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content - Ajustado para móviles */}
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-cream p-6 font-display text-ink shadow-2xl animate-in slide-in-from-bottom duration-300 md:p-10 md:zoom-in-95">
        
        {/* Boton Cerrar Fijo */}
        <button 
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-ink/50 shadow-sm transition-colors hover:text-ink"
        >
          <X size={20} />
        </button>

        {/* Contenido Scrolleable */}
        <div className="overflow-y-auto pr-1 custom-scrollbar">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-4 grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-accent text-ink">
              <Ruler size={24} />
            </div>
            <h2 className="text-2xl font-bold tracking-[-0.03em] md:text-3xl">Guía de tallas</h2>
          </div>

          <div className="mb-6 overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-ink/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-accent/50">
                  <th className="p-3 text-sm font-semibold text-ink/70 md:p-4">Talla</th>
                  <th className="p-3 text-sm font-semibold text-ink/70 md:p-4">Equivalente</th>
                  <th className="p-3 text-sm font-semibold text-ink/70 md:p-4">Busto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {tallas.map((item) => (
                  <tr key={item.talla} className="transition-colors hover:bg-cream">
                    <td className="p-3 text-base font-bold text-ink md:p-4">{item.talla}</td>
                    <td className="p-3 text-[15px] font-medium tabular-nums text-ink/70 md:p-4">{item.brasier}</td>
                    <td className="p-3 text-[15px] font-medium tabular-nums text-ink/70 md:p-4">{item.busto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-2 rounded-[1.5rem] bg-white p-5 ring-1 ring-ink/5">
            <h4 className="mb-2 text-base font-semibold">¿Cómo medirte?</h4>
            <p className="text-[15px] leading-relaxed text-ink/70">
              Mídete directamente sobre la piel sin ropa apretada. 
              <strong> Contorno de Busto:</strong> Mide alrededor de la parte más prominente del pecho con una cinta métrica nivelada.
            </p>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="pt-4 shrink-0">
          <button 
            onClick={onClose}
            className="w-full rounded-full bg-ink py-4 text-sm font-bold text-white transition-colors hover:bg-brand-dark active:scale-[0.98]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

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
        className="absolute inset-0 bg-[#4a1d44]/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content - Ajustado para móviles */}
      <div className="relative bg-[#fdf8f6] w-full max-w-lg rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-[#4a1d44]/10 animate-in slide-in-from-bottom md:zoom-in-95 duration-300 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Boton Cerrar Fijo */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-md hover:bg-white rounded-full transition-colors text-[#4a1d44]/40 hover:text-[#4a1d44] shadow-sm"
        >
          <X size={20} />
        </button>

        {/* Contenido Scrolleable */}
        <div className="overflow-y-auto pr-1 custom-scrollbar">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 text-[#4a1d44] shadow-sm shrink-0">
              <Ruler size={24} />
            </div>
            <h2 className="text-xl md:text-2xl font-black font-playfair text-[#4a1d44] italic uppercase">Guía de Tallas</h2>
            <div className="h-[2px] w-8 bg-[#4a1d44]/20 mt-2" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#4a1d44]/5 bg-white shadow-sm mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#4a1d44]/5">
                  <th className="p-3 md:p-4 text-[9px] font-black uppercase tracking-widest text-[#4a1d44]/60">Talla</th>
                  <th className="p-3 md:p-4 text-[9px] font-black uppercase tracking-widest text-[#4a1d44]/60">Equivalente</th>
                  <th className="p-3 md:p-4 text-[9px] font-black uppercase tracking-widest text-[#4a1d44]/60">Busto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#4a1d44]/5">
                {tallas.map((item) => (
                  <tr key={item.talla} className="hover:bg-[#fdf8f6]/50 transition-colors">
                    <td className="p-3 md:p-4 text-xs md:text-sm font-black text-[#4a1d44]">{item.talla}</td>
                    <td className="p-3 md:p-4 text-xs md:text-sm font-medium text-[#4a1d44]/70">{item.brasier}</td>
                    <td className="p-3 md:p-4 text-xs md:text-sm font-medium text-[#4a1d44]/70">{item.busto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-[#4a1d44]/5 mb-2">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-[#4a1d44] mb-2">¿Cómo medirte?</h4>
            <p className="text-[11px] text-[#4a1d44]/60 leading-relaxed">
              Mídete directamente sobre la piel sin ropa apretada. 
              <strong> Contorno de Busto:</strong> Mide alrededor de la parte más prominente del pecho con una cinta métrica nivelada.
            </p>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="pt-4 shrink-0">
          <button 
            onClick={onClose}
            className="w-full bg-[#4a1d44] text-white py-4 rounded-2xl font-bold text-[10px] tracking-widest uppercase shadow-lg active:scale-95 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

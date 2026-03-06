"use client";

import { X, Ruler } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  if (!isOpen) return null;

  const tallas = [
    { talla: 'XS', brasier: '30', busto: '78 - 82 cm' },
    { talla: 'S', brasier: '32', busto: '83 - 87 cm' },
    { talla: 'M', brasier: '34', busto: '88 - 92 cm' },
    { talla: 'L', brasier: '36', busto: '93 - 97 cm' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-[#4a1d44]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-[#fdf8f6] w-full max-w-lg rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-[#4a1d44]/10 animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-[#4a1d44]/5 rounded-full transition-colors text-[#4a1d44]/40 hover:text-[#4a1d44]"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 text-[#4a1d44] shadow-sm">
            <Ruler size={24} />
          </div>
          <h2 className="text-2xl font-black font-playfair text-[#4a1d44] italic uppercase">Guía de Tallas</h2>
          <div className="h-[2px] w-8 bg-[#4a1d44]/20 mt-3" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#4a1d44]/5 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#4a1d44]/5">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#4a1d44]/60">Talla</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#4a1d44]/60">Equivalente Brasier</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#4a1d44]/60">Contorno de Busto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#4a1d44]/5">
              {tallas.map((item) => (
                <tr key={item.talla} className="hover:bg-[#fdf8f6]/50 transition-colors">
                  <td className="p-4 text-sm font-black text-[#4a1d44]">{item.talla}</td>
                  <td className="p-4 text-sm font-medium text-[#4a1d44]/70">{item.brasier}</td>
                  <td className="p-4 text-sm font-medium text-[#4a1d44]/70">{item.busto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 p-6 bg-white rounded-3xl border border-[#4a1d44]/5">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#4a1d44] mb-3">¿Cómo medir?</h4>
          <p className="text-xs text-[#4a1d44]/60 leading-relaxed">
            Para obtener una medida precisa, usa una cinta métrica flexible y mídete directamente sobre la piel sin ropa apretada. 
            <strong> Contorno de Busto:</strong> Mide alrededor de la parte más prominente del pecho.
          </p>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 bg-[#4a1d44] text-white py-4 rounded-2xl font-bold text-[11px] tracking-widest uppercase shadow-lg active:scale-95 transition-all"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

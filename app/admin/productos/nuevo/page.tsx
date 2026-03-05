"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, Tag, ArrowLeft, X, Palette, Hash, DollarSign, List, Ruler, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NuevoProductoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Estados para imágenes
  const [archivosImagenes, setArchivosImagenes] = useState<File[]>([]);
  const [previsualizaciones, setPrevisualizaciones] = useState<string[]>([]);
  
  // Estados para colores y tallas
  const [coloresDB, setColoresDB] = useState<any[]>([]);
  const [tallasDB, setTallasDB] = useState<any[]>([]);
  const [colorSeleccionado, setColorSeleccionado] = useState<string>("");
  const [stocksPorTalla, setStocksPorTalla] = useState<{[key: string]: number}>({});

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: '',
    grupo_id: '',
  });

  useEffect(() => {
    const fetchDatos = async () => {
      const { data: colores } = await supabase.from('colores').select('*').order('nombre');
      if (colores) setColoresDB(colores);

      const { data: tallas } = await supabase.from('tallas').select('*').order('orden');
      if (tallas) setTallasDB(tallas);
    };
    fetchDatos();
  }, []);

  const resetFormulario = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      categoria: '',
      grupo_id: '',
    });
    setArchivosImagenes([]);
    setPrevisualizaciones([]);
    setColorSeleccionado("");
    setStocksPorTalla({});
  };

  const handleTallaToggle = (id: string) => {
    setStocksPorTalla(prev => {
      const newStocks = { ...prev };
      if (id in newStocks) {
        delete newStocks[id];
      } else {
        newStocks[id] = 1;
      }
      return newStocks;
    });
  };

  const handleStockChange = (id: string, value: string) => {
    if (value === "") {
      setStocksPorTalla(prev => ({ ...prev, [id]: "" as any }));
      return;
    }
    const val = parseInt(value, 10);
    if (!isNaN(val)) {
      setStocksPorTalla(prev => ({ ...prev, [id]: val }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setArchivosImagenes(prev => [...prev, ...files]);
      const nuevasPrev = files.map(file => URL.createObjectURL(file));
      setPrevisualizaciones(prev => [...prev, ...nuevasPrev]);
    }
  };

  const quitarImagen = (index: number) => {
    setArchivosImagenes(prev => prev.filter((_, i) => i !== index));
    setPrevisualizaciones(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (archivosImagenes.length === 0) {
      toast.error('¡Sube al menos una foto!');
      return;
    }
    if (!colorSeleccionado) {
      toast.error('¡Selecciona un color para esta variante!');
      return;
    }
    if (Object.keys(stocksPorTalla).length === 0) {
      toast.error('¡Selecciona al menos una talla!');
      return;
    }

    setLoading(true);

    try {
      const urlsSubidas = [];
      for (const archivo of archivosImagenes) {
        const fileExt = archivo.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `lenceria/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('productos')
          .upload(filePath, archivo);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('productos')
          .getPublicUrl(filePath);
        
        urlsSubidas.push(publicUrlData.publicUrl);
      }

      const stockTotal = Object.values(stocksPorTalla).reduce((a, b) => Number(a) + Number(b || 0), 0);

      const { data: nuevoProducto, error: dbError } = await supabase
        .from('productos')
        .insert([{
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio: Math.round(parseFloat(formData.precio)),
          stock: stockTotal,
          categoria: formData.categoria,
          grupo_id: formData.grupo_id.trim() || null,
          imagenes_urls: urlsSubidas
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      const { error: colorError } = await supabase
        .from('producto_colores')
        .insert([{
          producto_id: nuevoProducto.id,
          color_id: colorSeleccionado
        }]);

      if (colorError) throw colorError;

      const insertTallas = Object.entries(stocksPorTalla).map(([tallaId, stockVal]) => ({
        producto_id: nuevoProducto.id,
        talla_id: tallaId,
        stock_talla: Number(stockVal || 0)
      }));

      const { error: tallasError } = await supabase
        .from('producto_tallas')
        .insert(insertTallas);

      if (tallasError) throw tallasError;

      toast.success('¡Producto publicado con éxito! Formulario listo para el siguiente.', { duration: 4000 });
      resetFormulario();
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error: any) {
      toast.error(error.message || 'Error al publicar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8f6] p-4 md:p-8 text-[#4a1d44]">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/admin')} className="flex items-center gap-3 mb-6 group">
          <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all">
            <ArrowLeft size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Volver al Panel</span>
        </button>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-[#4a1d44]/5">
          <h1 className="text-3xl font-black font-playfair mb-8 text-[#4a1d44]">Nuevo Producto</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Fotos del Producto</label>
              <div className="grid grid-cols-3 gap-4">
                {previsualizaciones.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-[#4a1d44]/10">
                    <img src={url} className="w-full h-full object-cover" alt="Preview" />
                    <button type="button" onClick={() => quitarImagen(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-2xl border-2 border-dashed border-[#4a1d44]/20 flex flex-col items-center justify-center cursor-pointer hover:bg-[#fdf8f6] transition-colors">
                  <Upload size={24} className="opacity-30" />
                  <span className="text-[9px] font-bold mt-2 uppercase">Añadir</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-pink-600 ml-2">ID de Grupo (Agrupar colores)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-3.5 bg-[#fdf8f6] rounded-2xl outline-none text-sm border border-pink-100 focus:border-pink-300 transition-colors" 
                    placeholder="Ej: conjunto-seda" 
                    value={formData.grupo_id} 
                    onChange={e => setFormData({...formData, grupo_id: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Color</label>
                <div className="relative">
                  <Palette className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <select 
                    required 
                    className="w-full pl-12 pr-4 py-3.5 bg-[#fdf8f6] rounded-2xl outline-none text-sm appearance-none cursor-pointer border border-transparent focus:border-[#4a1d44]/10 transition-colors" 
                    value={colorSeleccionado} 
                    onChange={e => setColorSeleccionado(e.target.value)}
                  >
                    <option value="">Elegir color...</option>
                    {coloresDB.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2 flex items-center gap-2">
                <Ruler size={14} /> Gestión de Inventario por Talla
              </label>
              
              <div className="grid grid-cols-1 gap-3">
                {tallasDB.map(t => {
                  const isSelected = t.id.toString() in stocksPorTalla;
                  return (
                    <div key={t.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isSelected ? 'bg-[#4a1d44]/5 border-[#4a1d44]/20' : 'bg-white border-[#4a1d44]/5'}`}>
                      <button
                        type="button"
                        onClick={() => handleTallaToggle(t.id.toString())}
                        className={`flex items-center gap-3 font-bold text-sm ${isSelected ? 'text-[#4a1d44]' : 'text-[#4a1d44]/40'}`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-[#4a1d44] border-[#4a1d44]' : 'border-[#4a1d44]/20'}`}>
                          {isSelected && <Plus size={12} className="text-white" />}
                        </div>
                        Talla {t.nombre}
                      </button>

                      {isSelected && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#4a1d44]/10 shadow-sm">
                          <Hash size={12} className="opacity-30" />
                          <span className="text-[10px] font-bold uppercase opacity-40">Stock:</span>
                          <input
                            type="number"
                            min="0"
                            value={stocksPorTalla[t.id.toString()]}
                            onChange={(e) => handleStockChange(t.id.toString(), e.target.value)}
                            className="w-12 bg-transparent outline-none font-black text-sm text-[#4a1d44]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Nombre del Producto</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                <input 
                  required 
                  type="text" 
                  className="w-full pl-12 pr-4 py-3.5 bg-[#fdf8f6] rounded-2xl outline-none text-sm" 
                  placeholder="Ej: Conjunto Encaje Rojo" 
                  value={formData.nombre} 
                  onChange={e => setFormData({...formData, nombre: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Precio</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <input 
                    required 
                    type="number" 
                    className="w-full pl-12 pr-4 py-3.5 bg-[#fdf8f6] rounded-2xl outline-none text-sm" 
                    placeholder="0.00" 
                    value={formData.precio} 
                    onChange={e => setFormData({...formData, precio: e.target.value})} 
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Categoría</label>
                <div className="relative">
                  <List className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <select 
                    required 
                    className="w-full pl-12 pr-4 py-3.5 bg-[#fdf8f6] rounded-2xl outline-none text-sm appearance-none cursor-pointer" 
                    value={formData.categoria} 
                    onChange={e => setFormData({...formData, categoria: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="conjuntos">Conjuntos</option>
                    <option value="bodys">Bodys</option>
                    <option value="brasieres">Brasieres</option>
                    <option value="pantis">Pantis</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Descripción</label>
              <textarea 
                required 
                className="w-full px-4 py-3.5 bg-[#fdf8f6] rounded-2xl outline-none text-sm min-h-[120px] resize-none border border-transparent focus:border-[#4a1d44]/10 transition-colors" 
                placeholder="Describe los detalles de la prenda..." 
                value={formData.descripcion} 
                onChange={e => setFormData({...formData, descripcion: e.target.value})} 
              />
            </div>

            <button 
              disabled={loading} 
              className="w-full bg-[#4a1d44] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#5d2555] transition-all disabled:opacity-50 shadow-lg shadow-[#4a1d44]/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Publicar Producto'}
            </button>
            
          </form>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, Tag, ArrowLeft, X, Palette, Hash, DollarSign, List, Ruler } from 'lucide-react';
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
  const [tallasSeleccionadas, setTallasSeleccionadas] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '1',
    categoria: '',
    grupo_id: '', // Crucial para agrupar colores
  });

  // Cargar colores y tallas desde Supabase
  useEffect(() => {
    const fetchDatos = async () => {
      const { data: colores } = await supabase.from('colores').select('*').order('nombre');
      if (colores) setColoresDB(colores);

      const { data: tallas } = await supabase.from('tallas').select('*').order('orden');
      if (tallas) setTallasDB(tallas);
    };
    fetchDatos();
  }, []);

  const handleTallaToggle = (id: string) => {
    setTallasSeleccionadas(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
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
    
    // Validaciones básicas
    if (archivosImagenes.length === 0) {
      toast.error('¡Sube al menos una foto!');
      return;
    }
    if (!colorSeleccionado) {
      toast.error('¡Selecciona un color para esta variante!');
      return;
    }
    if (tallasSeleccionadas.length === 0) {
      toast.error('¡Selecciona al menos una talla!');
      return;
    }

    setLoading(true);

    try {
      const urlsSubidas = [];

      // 1. Subida de múltiples imágenes al Storage
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

      // 2. Insertar el producto en la tabla 'productos'
      const { data: nuevoProducto, error: dbError } = await supabase
        .from('productos')
        .insert([{
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio: parseFloat(formData.precio),
          stock: parseInt(formData.stock),
          categoria: formData.categoria,
          grupo_id: formData.grupo_id.trim() || null, // Si está vacío, es null
          imagenes_urls: urlsSubidas
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Vincular el color en la tabla intermedia 'producto_colores'
      const { error: colorError } = await supabase
        .from('producto_colores')
        .insert([{
          producto_id: nuevoProducto.id,
          color_id: colorSeleccionado
        }]);

      if (colorError) throw colorError;

      // 4. Vincular las tallas en la tabla intermedia 'producto_tallas'
      const insertTallas = tallasSeleccionadas.map(tallaId => ({
        producto_id: nuevoProducto.id,
        talla_id: tallaId,
        stock_talla: Math.floor(parseInt(formData.stock) / tallasSeleccionadas.length) || 1
      }));

      const { error: tallasError } = await supabase
        .from('producto_tallas')
        .insert(insertTallas);

      if (tallasError) throw tallasError;

      toast.success('¡Producto publicado con éxito!');
      router.push('/admin');
      router.refresh();

    } catch (error: any) {
      toast.error(error.message || 'Error al publicar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8f6] p-4 md:p-8 text-[#4a1d44]">
      <div className="max-w-2xl mx-auto">
        
        {/* Botón Volver */}
        <button onClick={() => router.back()} className="flex items-center gap-3 mb-6 group">
          <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all">
            <ArrowLeft size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Volver al Panel</span>
        </button>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-[#4a1d44]/5">
          <h1 className="text-3xl font-black font-playfair mb-8 text-[#4a1d44]">Nuevo Producto</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* GALERÍA DE IMÁGENES */}
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

            {/* AGRUPACIÓN Y COLOR (Estructura de 2 columnas) */}
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

            {/* TALLAS */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2 flex items-center gap-2">
                <Ruler size={14} /> Tallas Disponibles
              </label>
              <div className="flex flex-wrap gap-2">
                {tallasDB.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTallaToggle(t.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      tallasSeleccionadas.includes(t.id)
                        ? 'bg-[#4a1d44] text-white border-[#4a1d44]'
                        : 'bg-white text-[#4a1d44] border-[#4a1d44]/10 hover:border-[#4a1d44]/30'
                    }`}
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* NOMBRE */}
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

            {/* PRECIO Y CATEGORÍA */}
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

            {/* DESCRIPCIÓN */}
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

            {/* BOTÓN DE PUBLICACIÓN */}
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
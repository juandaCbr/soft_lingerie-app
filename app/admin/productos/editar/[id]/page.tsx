"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { ArrowLeft, Save, Loader2, X, Plus, ChevronDown, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// 1. CATEGORÍAS ESPECÍFICAS DE LENCERÍA
const CATEGORIAS_LENCERIA = [
  "Conjuntos",
  "Bodys",
  "Pijamas",
  "Baby-dolls",
  "Panties",
  "Brasieres",
  "Batas",
  "Accesorios / Ligas",
  "Cuidado Corporal"
];

export default function EditarProductoPage() {
  const params = useParams();
  const router = useRouter();
  const idProducto = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState(""); 
  const [imagenesUrls, setImagenesUrls] = useState<string[]>([]);
  const [nuevasImagenes, setNuevasImagenes] = useState<File[]>([]);
  const [previsualizaciones, setPrevisualizaciones] = useState<string[]>([]);
  
  const [esCategoriaManual, setEsCategoriaManual] = useState(false);

  const cargarProducto = useCallback(async () => {
    if (!idProducto) return;
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', idProducto)
        .single();

      if (error) throw error;
      if (data) {
        setNombre(data.nombre || "");
        setPrecio(data.precio?.toString() || "0");
        setStock(data.stock?.toString() || "0");
        setCategoria(data.categoria || "");
        setDescripcion(data.descripcion || ""); 
        setImagenesUrls(Array.isArray(data.imagenes_urls) ? data.imagenes_urls : []);
        
        // Si la categoría no está en la lista de lencería, activamos modo manual
        if (data.categoria && !CATEGORIAS_LENCERIA.includes(data.categoria)) {
          setEsCategoriaManual(true);
        }
      }
    } catch (error: any) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [idProducto]);

  useEffect(() => { cargarProducto(); }, [cargarProducto]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNuevasImagenes(prev => [...prev, ...filesArray]);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPrevisualizaciones(prev => [...prev, ...newPreviews]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const urlsNuevasSubidas = [];
      for (const file of nuevasImagenes) {
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
        const { data, error } = await supabase.storage.from('productos').upload(`public/${fileName}`, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('productos').getPublicUrl(data.path);
        urlsNuevasSubidas.push(publicUrl);
      }

      const listaFinalUrls = [...imagenesUrls, ...urlsNuevasSubidas];

      const { error } = await supabase.from('productos').update({
        nombre,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria,
        descripcion,
        imagenes_urls: listaFinalUrls
      }).eq('id', idProducto);

      if (error) throw error;
      toast.success("¡Prenda de lencería actualizada!");
      router.push("/admin/productos");
      router.refresh();
    } catch (error: any) {
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#fdf8f6]"><Loader2 className="animate-spin text-[#4a1d44]" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#fdf8f6] p-4 pb-24 text-[#4a1d44]">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <Link href="/admin/productos" className="p-3 bg-white rounded-2xl shadow-sm border border-[#4a1d44]/10"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-black font-playfair italic uppercase">Editar Prenda</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* GALERÍA */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#4a1d44]/5">
            <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-2">Fotos</h2>
            <div className="grid grid-cols-3 gap-3">
              {imagenesUrls.map((url, i) => (
                <div key={`old-${i}`} className="relative aspect-square">
                  <img src={url} className="w-full h-full object-cover rounded-2xl border shadow-inner" alt="Prenda" />
                  <button type="button" onClick={() => setImagenesUrls(imagenesUrls.filter(u => u !== url))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg"><X size={12} strokeWidth={3} /></button>
                </div>
              ))}
              {previsualizaciones.map((url, i) => (
                <div key={`new-${i}`} className="relative aspect-square">
                  <img src={url} className="w-full h-full object-cover rounded-2xl border-2 border-[#4a1d44]/20 opacity-60" alt="Nueva" />
                  <div className="absolute inset-0 flex items-center justify-center"><ImageIcon size={18} className="text-[#4a1d44]/40" /></div>
                </div>
              ))}
              <label className="border-2 border-dashed border-[#4a1d44]/10 rounded-2xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                <Plus size={24} className="opacity-20" />
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>

          {/* DATOS */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#4a1d44]/5 space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase opacity-30 ml-2">Nombre del Artículo</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-[#fdf8f6] p-4 rounded-2xl outline-none font-bold mt-1 shadow-inner focus:ring-2 focus:ring-[#4a1d44]/5 transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase opacity-30 ml-2">Precio</label>
                <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} className="w-full bg-[#fdf8f6] p-4 rounded-2xl outline-none font-bold mt-1 shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase opacity-30 ml-2">Stock</label>
                <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full bg-[#fdf8f6] p-4 rounded-2xl outline-none font-bold mt-1 shadow-inner" />
              </div>
            </div>

            {/* --- DESPLEGABLE DE CATEGORÍA LENCERÍA --- */}
            <div>
              <label className="text-[10px] font-black uppercase opacity-30 ml-2 tracking-widest">Tipo de Prenda</label>
              {!esCategoriaManual ? (
                <div className="relative mt-1">
                  <select 
                    value={categoria}
                    onChange={(e) => {
                      if (e.target.value === "NUEVA") {
                        setEsCategoriaManual(true);
                        setCategoria("");
                      } else {
                        setCategoria(e.target.value);
                      }
                    }}
                    className="w-full bg-[#fdf8f6] p-4 rounded-2xl outline-none font-bold appearance-none shadow-inner cursor-pointer"
                  >
                    <option value="">Selecciona una categoría...</option>
                    {CATEGORIAS_LENCERIA.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="NUEVA">+ Otra categoría...</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" size={20} />
                </div>
              ) : (
                <div className="flex gap-2 mt-1">
                  <input 
                    autoFocus
                    placeholder="Ej: Medias veladas..."
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="flex-1 bg-[#fdf8f6] p-4 rounded-2xl outline-none font-bold shadow-inner"
                  />
                  <button type="button" onClick={() => { setEsCategoriaManual(false); setCategoria(""); }} className="bg-gray-100 px-5 rounded-2xl font-black text-[10px]">X</button>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black uppercase opacity-30 ml-2 tracking-widest">Descripción / Tallas / Material</label>
              <textarea 
                value={descripcion} 
                onChange={e => setDescripcion(e.target.value)} 
                className="w-full bg-[#fdf8f6] p-4 rounded-2xl outline-none h-32 resize-none mt-1 shadow-inner leading-relaxed" 
                placeholder="Ej: Material encaje, disponible en Talla S, M y L..."
              />
            </div>
          </div>

          <button disabled={saving} className="w-full bg-[#4a1d44] text-white p-5 rounded-[2rem] font-bold shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
            {saving ? "Guardando..." : "Actualizar Producto"}
          </button>
        </form>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { ArrowLeft, Save, Loader2, X, Plus, ChevronDown, Image as ImageIcon, Ruler, Hash, AlertTriangle, Palette } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { uploadConReintento } from '@/app/lib/upload-with-retry';
import { normalizeImagenesLocales } from '@/app/lib/image-helper';
import { slugify } from '@/app/lib/utils';

export default function EditarProductoPage() {
  const params = useParams();
  const router = useRouter();
  const idProducto = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState(""); 
  const [nombreInicial, setNombreInicial] = useState("");
  const [imagenesLocales, setImagenesLocales] = useState<{ thumb: string; detail: string }[]>([]);
  const [imagenesUrls, setImagenesUrls] = useState<string[]>([]);
  const [nuevasImagenes, setNuevasImagenes] = useState<File[]>([]);
  const [previsualizaciones, setPrevisualizaciones] = useState<string[]>([]);
  // Índices de imagenesLocales que no cargan (404 / archivo no disponible en este equipo)
  const [rotasLocales, setRotasLocales] = useState<Set<number>>(new Set());
  
  const [tallasDB, setTallasDB] = useState<any[]>([]);
  const [categoriasDB, setCategoriasDB] = useState<any[]>([]);
  // Ahora guardamos un objeto { talla_id: stock }
  const [stocksPorTalla, setStocksPorTalla] = useState<{[key: string]: number}>({});
  
  const [esCategoriaManual, setEsCategoriaManual] = useState(false);
  const [grupoId, setGrupoId] = useState("");
  const [coloresDB, setColoresDB] = useState<any[]>([]);
  const [colorSeleccionado, setColorSeleccionado] = useState<string>("");
  const [destacadoHome, setDestacadoHome] = useState(false);

  const cargarProducto = useCallback(async () => {
    if (!idProducto) {
      setLoading(false);
      return;
    }
    try {
      const { data: catData, error: catError } = await supabase.from('categorias').select('*').order('nombre');
      let currentCats = [];
      if (catData && !catError) {
        setCategoriasDB(catData);
        currentCats = catData.map(c => c.nombre);
      } else {
        const fallback = ["Conjuntos", "Bodys", "Pijamas", "Baby-dolls", "Panties", "Brasieres", "Batas", "Accesorios / Ligas", "Cuidado Corporal"];
        setCategoriasDB(fallback.map(c => ({ nombre: c })));
        currentCats = fallback;
      }

      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', idProducto)
        .single();

      if (error) throw error;
      if (data) {
        setNombre(data.nombre || "");
        setNombreInicial((data.nombre || "").trim());
        setPrecio(data.precio?.toString() || "0");
        setCategoria(data.categoria || "");
        setDescripcion(data.descripcion || ""); 
        setImagenesUrls(Array.isArray(data.imagenes_urls) ? data.imagenes_urls : []);
        setImagenesLocales(normalizeImagenesLocales(data.imagenes_locales));
        setRotasLocales(new Set());
        setGrupoId(data.grupo_id != null && data.grupo_id !== '' ? String(data.grupo_id) : '');
        setDestacadoHome(data.destacado_home === true);
        
        if (data.categoria && !currentCats.includes(data.categoria)) {
          setEsCategoriaManual(true);
        }
      }

      const { data: colores } = await supabase.from('colores').select('*').eq('activo', true).order('nombre');
      if (colores) setColoresDB(colores);

      const { data: colorRows } = await supabase
        .from('producto_colores')
        .select('color_id')
        .eq('producto_id', idProducto)
        .limit(1);
      const cid = colorRows?.[0]?.color_id;
      setColorSeleccionado(cid != null ? String(cid) : '');

      const { data: tallas } = await supabase.from('tallas').select('*').order('orden');
      if (tallas) setTallasDB(tallas);

      const { data: tallasRel } = await supabase
        .from('producto_tallas')
        .select('talla_id, stock_talla')
        .eq('producto_id', idProducto);
      
      if (tallasRel) {
        const stocksInitial: {[key: string]: number} = {};
        tallasRel.forEach(r => {
          stocksInitial[r.talla_id.toString()] = r.stock_talla || 0;
        });
        setStocksPorTalla(stocksInitial);
      }

    } catch (error: any) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [idProducto]);

  useEffect(() => { cargarProducto(); }, [cargarProducto]);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onerror = () => resolve(file);
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => resolve(file);
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > height && width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          } else if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSaving(true); // Bloqueamos para evitar acciones mientras procesa
      toast.loading('Optimizando imágenes...', { id: 'img-opt-edit' });
      
      const optimizedFiles: File[] = [];
      for (const file of filesArray) {
        const optimized = await compressImage(file);
        optimizedFiles.push(optimized);
      }

      setNuevasImagenes(prev => [...prev, ...optimizedFiles]);
      const newPreviews = optimizedFiles.map(file => URL.createObjectURL(file));
      setPrevisualizaciones(prev => [...prev, ...newPreviews]);
      
      toast.success('Imágenes optimizadas', { id: 'img-opt-edit' });
      setSaving(false);
    }
  };

  const handleTallaToggle = (id: string) => {
    setStocksPorTalla(prev => {
      const newStocks = { ...prev };
      if (id in newStocks) {
        delete newStocks[id];
      } else {
        newStocks[id] = 1; // Stock inicial de 1 al seleccionar
      }
      return newStocks;
    });
  };

  const handleStockChange = (id: string, value: string) => {
    // Si esta vacio, lo dejamos como string vacio temporalmente para poder borrar el 0
    if (value === "") {
      setStocksPorTalla(prev => ({ ...prev, [id]: "" as any }));
      return;
    }
    const val = parseInt(value, 10);
    if (!isNaN(val)) {
      setStocksPorTalla(prev => ({ ...prev, [id]: val }));
    }
  };

  /**
   * Guardado del producto (orden del flujo):
   * 1) Si cambió el nombre → renombrar carpeta y .webp en disco (/api/upload-rename).
   * 2) Si hay fotos nuevas → subir con /api/upload (indice_inicio según cuántas locales queden).
   * 3) Persistir fila en Supabase (imagenes_urls legacy + imagenes_locales).
   * 4) /api/upload-cleanup → quitar del disco los .webp que ya no están en imagenes_locales.
   * 5) Sincronizar producto_tallas (delete + insert).
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(stocksPorTalla).length === 0) {
      toast.error("Selecciona al menos una talla");
      return;
    }
    if (!colorSeleccionado) {
      toast.error("Selecciona un color");
      return;
    }

    setSaving(true);
    try {
      /* --- Flujo anterior: nuevas fotos solo a Supabase Storage ---
      const urlsNuevasSubidas = [];
      for (const file of nuevasImagenes) {
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
        const { data, error } = await supabase.storage.from('productos').upload(`lenceria/${fileName}`, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('productos').getPublicUrl(data.path);
        urlsNuevasSubidas.push(publicUrl);
      }
      const listaFinalUrls = [...imagenesUrls, ...urlsNuevasSubidas];
      */

      let localesMut = [...imagenesLocales];

      if (nombre.trim() !== nombreInicial.trim()) {
        const rr = await fetch('/api/upload-rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            producto_id: idProducto,
            nombre_anterior: nombreInicial,
            nombre_nuevo: nombre,
          }),
        });
        const rj = await rr.json();
        if (!rr.ok || !rj.success) {
          throw new Error(rj.error || 'Error al renombrar carpeta de imágenes');
        }
        if (rj.changed && Array.isArray(rj.imagenes_locales)) {
          localesMut = normalizeImagenesLocales(rj.imagenes_locales);
        }
      }

      if (nuevasImagenes.length > 0) {
        const fd = new FormData();
        fd.append('nombre_producto', nombre);
        fd.append('producto_id', String(idProducto));
        const indiceInicio = localesMut.length > 0 ? localesMut.length + 1 : 1;
        fd.append('indice_inicio', String(indiceInicio));
        nuevasImagenes.forEach((f) => fd.append('files', f));
        const { ok, json } = await uploadConReintento(fd);
        if (!ok || !json.success) {
          throw new Error(json.error || 'Error al subir nuevas imágenes');
        }
        localesMut = [...localesMut, ...normalizeImagenesLocales(json.imagenes_locales || [])];
      }

      const listaFinalUrls = [...imagenesUrls];
      const stockTotal = Object.values(stocksPorTalla).reduce((a, b) => a + Number(b || 0), 0);

      const cleanId = parseInt(idProducto);
      
      const { error } = await supabase.from('productos').update({
        nombre,
        precio: Math.round(parseFloat(precio)),
        stock: stockTotal,
        categoria,
        descripcion,
        grupo_id: grupoId.trim() || null,
        destacado_home: destacadoHome,
        imagenes_urls: listaFinalUrls,
        imagenes_locales: localesMut.length > 0 ? localesMut : null,
      }).eq('id', cleanId);

      if (error) throw error;

      /*
       * Limpieza de disco (upload-cleanup): /api/upload solo añade archivos; al quitar fotos en el
       * formulario, la BD ya refleja el array final pero podían quedar .webp huérfanos en la carpeta.
       * Tras persistir el producto, borramos del FS todo .webp en productos/{slug}-{id} que no esté
       * en imagenes_locales. Detalle: app/api/upload-cleanup/route.ts
       */
      try {
        const cleanupRes = await fetch('/api/upload-cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            producto_id: cleanId,
            nombre_producto: nombre,
            imagenes_locales: localesMut.length > 0 ? localesMut : [],
          }),
        });
        const cleanupJson = await cleanupRes.json();
        if (!cleanupRes.ok || !cleanupJson.success) {
          console.warn('[editar producto] Limpieza de uploads:', cleanupJson?.error ?? cleanupRes.status);
        }
      } catch (cleanupErr) {
        console.warn('[editar producto] Limpieza de uploads (red):', cleanupErr);
      }

      // Intentar actualizar tallas, pero atrapar el error específicamente aquí
      try {
        const { error: deleteError } = await supabase.from('producto_tallas').delete().eq('producto_id', cleanId);
        if (deleteError) throw deleteError;

        const insertTallas = Object.entries(stocksPorTalla).map(([tallaId, stockVal]) => ({
          producto_id: cleanId,
          talla_id: parseInt(tallaId),
          stock_talla: Number(stockVal || 0)
        }));

        const { error: tallasError } = await supabase
          .from('producto_tallas')
          .insert(insertTallas);

        if (tallasError) throw tallasError;

        const { error: delColorErr } = await supabase.from('producto_colores').delete().eq('producto_id', cleanId);
        if (delColorErr) throw delColorErr;

        const { error: colorErr } = await supabase
          .from('producto_colores')
          .insert([{ producto_id: cleanId, color_id: colorSeleccionado }]);
        if (colorErr) throw colorErr;
        
        toast.success("¡Producto e inventario actualizados!");
      } catch (tallaErr: any) {
        console.error("Error en tallas/color:", tallaErr);
        toast.error("Datos guardados parcialmente: revisa permisos (tallas/color) en RLS o inténtalo de nuevo.");
      }

      previsualizaciones.forEach((u) => URL.revokeObjectURL(u));
      setNuevasImagenes([]);
      setPrevisualizaciones([]);
      setNombreInicial(nombre.trim());
      setImagenesLocales(localesMut);

      try {
        const productPath = `/productos/${slugify(nombre.trim())}-${cleanId}`;
        await fetch('/api/admin/revalidate-display', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productPath }),
        });
      } catch (revErr) {
        console.warn('[editar producto] revalidate-display:', revErr);
      }

      router.push("/admin/productos");
      router.refresh();
    } catch (error: any) {
      console.error("Error al guardar producto:", error);
      toast.error(`Error al guardar cambios: ${error.message || "Error desconocido"}`);
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
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#4a1d44]/5">
            <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-2">Fotos</h2>

            {/* Banner de advertencia cuando hay imágenes no disponibles en este equipo */}
            {rotasLocales.size > 0 && (
              <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-700">
                    {rotasLocales.size} {rotasLocales.size === 1 ? 'imagen no disponible' : 'imágenes no disponibles'} en este dispositivo
                  </p>
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    Elimínalas con la ✕ y sube las fotos nuevamente para que queden guardadas aquí.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Quitar automáticamente todas las imágenes rotas
                    setImagenesLocales(prev => prev.filter((_, i) => !rotasLocales.has(i)));
                    setRotasLocales(new Set());
                  }}
                  className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  Limpiar rotas
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {imagenesLocales.map((img, i) => {
                const rota = rotasLocales.has(i);
                return (
                  <div key={`loc-${i}-${img.thumb}`} className={`relative aspect-square ${rota ? 'ring-2 ring-amber-400 rounded-2xl' : ''}`}>
                    <img
                      key={img.thumb}
                      src={img.thumb}
                      className="w-full h-full object-cover rounded-2xl border shadow-inner"
                      alt="Prenda"
                      onError={(e) => {
                        e.currentTarget.src = '/images/placeholder.svg';
                        setRotasLocales(prev => new Set([...prev, i]));
                      }}
                    />
                    {rota && (
                      <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none rounded-2xl bg-amber-400/10">
                        <span className="text-[8px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
                          No disponible
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setImagenesLocales(imagenesLocales.filter((_, j) => j !== i));
                        // Reindexar el set de rotas después de eliminar
                        setRotasLocales(prev => {
                          const next = new Set<number>();
                          prev.forEach(idx => { if (idx !== i) next.add(idx > i ? idx - 1 : idx); });
                          return next;
                        });
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
              {imagenesUrls.map((url, i) => (
                <div key={`old-${i}`} className="relative aspect-square">
                  <img src={url} className="w-full h-full object-cover rounded-2xl border shadow-inner" alt="Prenda" onError={(e) => { e.currentTarget.src = '/images/placeholder.svg'; }} />
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

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#4a1d44]/5 space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase opacity-30 ml-2">Nombre del Artículo</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-[#fdf8f6] p-4 rounded-2xl outline-none font-bold mt-1 shadow-inner focus:ring-2 focus:ring-[#4a1d44]/5 transition-all" />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase opacity-30 ml-2">Precio</label>
              <input 
                type="number" 
                value={precio} 
                onChange={e => setPrecio(e.target.value)} 
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full bg-[#fdf8f6] p-4 rounded-2xl outline-none font-bold mt-1 shadow-inner" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-pink-600 ml-2">ID de grupo (variantes por color)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-3.5 bg-[#fdf8f6] rounded-2xl outline-none text-sm border border-transparent focus:border-[#4a1d44]/10 transition-colors"
                    placeholder="Ej: conjunto-seda"
                    value={grupoId}
                    onChange={(e) => setGrupoId(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Color</label>
                <div className="relative">
                  <Palette className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <select
                    className="w-full pl-12 pr-4 py-3.5 bg-[#fdf8f6] rounded-2xl outline-none text-sm appearance-none cursor-pointer border border-transparent focus:border-[#4a1d44]/10 transition-colors"
                    value={colorSeleccionado}
                    onChange={(e) => setColorSeleccionado(e.target.value)}
                  >
                    <option value="">Elegir color…</option>
                    {coloresDB.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" size={18} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">
                ¿Producto destacado?
              </label>
              <button
                type="button"
                onClick={() => setDestacadoHome((prev) => !prev)}
                className="w-full flex items-center justify-between bg-[#fdf8f6] border border-[#4a1d44]/10 rounded-2xl px-4 py-3.5"
                aria-pressed={destacadoHome}
              >
                <span className="text-sm font-bold text-[#4a1d44]">
                  {destacadoHome ? "Sí, mostrar como destacado" : "No destacado"}
                </span>
                <span
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    destacadoHome ? "bg-[#4a1d44]" : "bg-[#4a1d44]/20"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      destacadoHome ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </span>
              </button>
            </div>

            {/* TALLAS Y STOCKS ESPECÍFICOS */}
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
                    {categoriasDB.map(c => <option key={c.id || c.nombre} value={c.nombre}>{c.nombre}</option>)}
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
              <label className="text-[10px] font-black uppercase opacity-30 ml-2 tracking-widest">Descripción / Material</label>
              <textarea 
                value={descripcion} 
                onChange={e => setDescripcion(e.target.value)} 
                className="w-full bg-[#fdf8f6] p-4 rounded-2xl outline-none h-32 resize-none mt-1 shadow-inner leading-relaxed" 
                placeholder="Ej: Material encaje, detalles bordados..."
              />
            </div>
          </div>

          <button disabled={saving} className="w-full bg-[#4a1d44] text-white p-5 rounded-[2rem] font-bold shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
            {saving ? "Guardando Inventario..." : "Actualizar Producto"}
          </button>
        </form>
      </div>
    </div>
  );
}
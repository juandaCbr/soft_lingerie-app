"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import {
    ArrowLeft,
    BarChart3,
    TrendingUp,
    MapPin,
    CheckCircle2,
    XCircle,
    PieChart,
    CalendarDays,
    CalendarRange,
    History
} from 'lucide-react';

type VistaGrafica = 'semana' | 'mes' | 'año';

export default function EstadisticasPage() {
    const [ventas, setVentas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [vistaActual, setVistaActual] = useState<VistaGrafica>('mes');

    // Inicializacion y suscripcion en tiempo real
    useEffect(() => {
        fetchDatos();

        const canalVentasRealtime = supabase
            .channel('estadisticas-live')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ventas_realizadas' },
                () => {
                    // Re-ejecuta la consulta completa para refrescar graficas
                    fetchDatos();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(canalVentasRealtime);
        };
    }, []);

    const fetchDatos = async () => {
        // Consulta de todos los registros de la tabla ventas_realizadas
        const { data, error } = await supabase
            .from('ventas_realizadas')
            .select('*');
        if (!error && data) {
            setVentas(data);
        }
        setLoading(false);
    };

    const datosGrafica = useMemo(() => {
        // Filtramos por pagos exitosos ignorando mayusculas
        const ventasAprobadas = ventas.filter(v =>
            v.estado_pago?.toUpperCase() === 'APROBADO' ||
            v.estado_pago?.toUpperCase() === 'APPROVED'
        );

        if (vistaActual === 'semana') {
            const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return {
                    label: diasSemana[d.getDay()],
                    fechaClave: d.toISOString().split('T')[0],
                    total: 0
                };
            });

            ventasAprobadas.forEach(v => {
                if (!v.fecha) return;
                const fechaV = new Date(v.fecha).toISOString().split('T')[0];
                const diaEncontrado = ultimos7Dias.find(d => d.fechaClave === fechaV);
                if (diaEncontrado) diaEncontrado.total += Number(v.monto_total || 0);
            });

            const max = Math.max(...ultimos7Dias.map(d => d.total), 1);
            return ultimos7Dias.map(d => ({ label: d.label, total: d.total, porcentaje: (d.total / max) * 100 }));
        }

        if (vistaActual === 'mes') {
            const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const datosMes = meses.map((m, i) => ({ label: m, total: 0, mesIndex: i }));
            const añoEnCurso = new Date().getFullYear();

            ventasAprobadas.forEach(v => {
                if (!v.fecha) return;
                const fecha = new Date(v.fecha);
                if (fecha.getFullYear() === añoEnCurso) {
                    datosMes[fecha.getMonth()].total += Number(v.monto_total || 0);
                }
            });

            const max = Math.max(...datosMes.map(d => d.total), 1);
            return datosMes.map(d => ({ label: d.label, total: d.total, porcentaje: (d.total / max) * 100 }));
        }

        if (vistaActual === 'año') {
            const añoActual = new Date().getFullYear();
            const años = [añoActual - 2, añoActual - 1, añoActual];
            const datosAño = años.map(a => ({ label: a.toString(), total: 0 }));

            ventasAprobadas.forEach(v => {
                if (!v.fecha) return;
                const añoV = new Date(v.fecha).getFullYear();
                const añoEncontrado = datosAño.find(d => d.label === añoV.toString());
                if (añoEncontrado) añoEncontrado.total += Number(v.monto_total || 0);
            });

            const max = Math.max(...datosAño.map(d => d.total), 1);
            return datosAño.map(d => ({ label: d.label, total: d.total, porcentaje: (d.total / max) * 100 }));
        }

        return [];
    }, [ventas, vistaActual]);

    const rankingCiudades = useMemo(() => {
        const conteo: { [key: string]: number } = {};
        ventas.filter(v => v.estado_pago?.toUpperCase() === 'APROBADO').forEach(v => {
            const ciudad = v.ciudad || "Otras";
            conteo[ciudad] = (conteo[ciudad] || 0) + Number(v.monto_total || 0);
        });
        return Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [ventas]);

    if (loading) return (
        <div className="min-h-screen bg-[#fdf8f6] flex items-center justify-center">
            <div className="animate-pulse text-[#4a1d44] font-black font-playfair uppercase">Procesando metricas...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fdf8f6] p-4 md:p-10 text-[#4a1d44]">
            <div className="max-w-6xl mx-auto">

                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-3 bg-white rounded-2xl shadow-sm border border-[#4a1d44]/10 hover:bg-[#f2e1d9] transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black font-playfair uppercase italic tracking-tighter">Reportes de Ventas</h1>
                            <p className="opacity-40 text-[10px] font-black uppercase tracking-widest">Analisis automatico de ingresos</p>
                        </div>
                    </div>

                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-[#4a1d44]/5 flex gap-1">
                        <button onClick={() => setVistaActual('semana')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vistaActual === 'semana' ? 'bg-[#4a1d44] text-white' : 'opacity-40 hover:bg-gray-50'}`}>
                            Semana
                        </button>
                        <button onClick={() => setVistaActual('mes')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vistaActual === 'mes' ? 'bg-[#4a1d44] text-white' : 'opacity-40 hover:bg-gray-50'}`}>
                            Mes
                        </button>
                        <button onClick={() => setVistaActual('año')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vistaActual === 'año' ? 'bg-[#4a1d44] text-white' : 'opacity-40 hover:bg-gray-50'}`}>
                            Años
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#4a1d44]/5 min-h-[450px] flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-10">
                            <h2 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
                                <BarChart3 size={20} /> Desglose por {vistaActual}
                            </h2>
                            <div className="text-right">
                                <p className="text-[9px] font-black opacity-30 uppercase">Recaudacion</p>
                                <p className="text-2xl font-black text-green-600">${datosGrafica.reduce((acc, c) => acc + c.total, 0).toLocaleString('es-CO')}</p>
                            </div>
                        </div>

                        <div className="flex items-end justify-between h-64 gap-2 md:gap-4 px-2">
                            {datosGrafica.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                    <div className="w-full relative flex flex-col justify-end h-48">
                                        {d.total > 0 && (
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#4a1d44] text-white text-[9px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold shadow-lg">
                                                ${d.total.toLocaleString()}
                                            </div>
                                        )}
                                        <div
                                            style={{ height: `${Math.max(d.porcentaje, 2)}%` }}
                                            className={`w-full transition-all duration-700 rounded-t-lg ${d.total > 0 ? 'bg-[#4a1d44] cursor-pointer hover:opacity-80' : 'bg-gray-100'}`}
                                        />
                                    </div>
                                    <span className="text-[8px] font-black opacity-30 uppercase truncate w-full text-center">{d.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#4a1d44]/5">
                            <h2 className="text-[10px] font-black mb-6 uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
                                <PieChart size={14} /> Tasa de Aprobacion
                            </h2>
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-4xl font-black">
                                    {Math.round((ventas.filter(v => v.estado_pago?.toUpperCase() === 'APROBADO').length / (ventas.length || 1)) * 100)}%
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-green-600 uppercase">Aprobados</p>
                                    <p className="text-[8px] font-bold opacity-30">Historico</p>
                                </div>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${(ventas.filter(v => v.estado_pago?.toUpperCase() === 'APROBADO').length / (ventas.length || 1)) * 100}%` }}
                                    className="h-full bg-green-500 transition-all duration-1000"
                                />
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#4a1d44]/5">
                            <h2 className="text-[10px] font-black mb-6 uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
                                <MapPin size={14} /> Ciudades Top
                            </h2>
                            <div className="space-y-5">
                                {rankingCiudades.length > 0 ? rankingCiudades.map(([ciudad, monto], idx) => (
                                    <div key={idx} className="flex flex-col gap-1.5">
                                        <div className="flex justify-between text-[10px] font-black uppercase">
                                            <span>{ciudad}</span>
                                            <span className="opacity-40">${Number(monto).toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                                            <div
                                                style={{ width: `${(Number(monto) / Number(rankingCiudades[0][1])) * 100}%` }}
                                                className="h-full bg-[#4a1d44]"
                                            />
                                        </div>
                                    </div>
                                )) : <p className="text-[10px] opacity-40 italic">Sin datos de ciudad</p>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 bg-[#4a1d44] text-white p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1">
                        <h3 className="text-2xl font-black font-playfair mb-3 italic tracking-tight flex items-center gap-3">
                            <TrendingUp className="text-green-400" /> Rendimiento de Soft Lingerie
                        </h3>
                        <p className="text-xs opacity-60 leading-relaxed max-w-2xl font-medium">
                            Este desglose se genera automaticamente cruzando los datos de la tabla de ventas.
                            Asegurate de que los pagos esten marcados como "APROBADO" para que se sumen a las graficas financieras.
                        </p>
                    </div>
                    <div className="bg-white/10 px-8 py-6 rounded-[2rem] border border-white/10 text-center min-w-[200px]">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Ordenes Registradas</p>
                        <p className="text-4xl font-black">{ventas.length}</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
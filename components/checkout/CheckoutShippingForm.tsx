import { Truck, MapPin, User, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { COLOMBIA_COMPLETA } from "@/app/lib/colombia";
import { CHECKOUT_ENVIO, esCiudadEnvioLocal } from "@/app/lib/checkout-config";
import { validarNombreCompleto } from "@/app/lib/utils";
import type { CheckoutFormData } from "./checkout-types";
import { useState } from "react";

type CheckoutShippingFormProps = {
  formData: CheckoutFormData;
  ciudadesDisponibles: string[];
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  cartEmpty: boolean;
};

export function CheckoutShippingForm({
  formData,
  ciudadesDisponibles,
  onFieldChange,
  onSubmit,
  loading,
  cartEmpty,
}: CheckoutShippingFormProps) {
  // Validación visual del nombre: se evalúa on-blur y al escribir si ya hubo error.
  const [nombreTouched, setNombreTouched] = useState(false);
  const errorNombre = nombreTouched ? validarNombreCompleto(formData.nombre) : null;
  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h2 className="text-base font-black uppercase tracking-widest flex items-center gap-2 mb-4">
          <User size={14} /> Datos de contacto
        </h2>

        <div className="space-y-1.5">
          <label className="text-[12px] font-black uppercase tracking-widest opacity-60 ml-1 flex items-center gap-2">
            <Mail size={12} /> Correo electrónico
          </label>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={onFieldChange}
            className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border border-transparent focus:border-[#4a1d44]/10 transition-all"
            placeholder="tu@correo.com"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-black uppercase tracking-widest opacity-60 ml-1 flex items-center gap-2">
            <User size={12} /> Nombre y apellido
          </label>
          <input
            required
            name="nombre"
            value={formData.nombre}
            onChange={(e) => {
              onFieldChange(e);
              if (nombreTouched) {
                // revalida en vivo tras el primer blur para que el usuario vea
                // cómo el error desaparece al añadir el apellido.
              }
            }}
            onBlur={() => setNombreTouched(true)}
            className={`w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border transition-all focus:border-[#4a1d44]/10 ${
              errorNombre ? "border-red-400 focus:border-red-500" : "border-transparent"
            }`}
            placeholder="Ej: María Pérez (nombre y apellido)"
          />
          {errorNombre && (
            <p className="text-[11px] font-bold text-red-500 ml-1 flex items-center gap-1">
              {errorNombre}
            </p>
          )}
        </div>
        <input
          required
          type="tel"
          name="telefono"
          value={formData.telefono}
          onChange={onFieldChange}
          className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border border-transparent focus:border-[#4a1d44]/10 transition-all"
          placeholder="WhatsApp / Celular"
        />
        <div className="space-y-1.5">
          <label className="text-[12px] font-black uppercase tracking-widest opacity-60 ml-1">
            Número de cédula/documento
          </label>
          <input
            required
            type="text"
            name="documento_cliente"
            inputMode="numeric"
            autoComplete="off"
            maxLength={15}
            value={formData.documento_cliente}
            onChange={onFieldChange}
            className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border border-transparent focus:border-[#4a1d44]/10 transition-all"
            placeholder="Ej: 1234567890"
          />
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-gray-50">
        <h2 className="text-[12px] font-black uppercase tracking-widest opacity-70 flex items-center gap-2 mb-4">
          <MapPin size={14} /> Dirección de envío
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            name="departamento"
            value={formData.departamento}
            onChange={onFieldChange}
            className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none cursor-pointer"
          >
            {Object.keys(COLOMBIA_COMPLETA)
              .sort()
              .map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
          </select>
          <select
            name="ciudad"
            value={formData.ciudad}
            onChange={onFieldChange}
            className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none cursor-pointer"
          >
            {ciudadesDisponibles.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {esCiudadEnvioLocal(formData.ciudad) && (
          <div className="bg-green-50 border border-green-100 p-5 rounded-3xl flex items-center gap-4 animate-in zoom-in duration-500">
            <div className="bg-green-500 p-2 rounded-full text-white">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-green-900 leading-none">Envio Local</p>
              <p className="text-xs text-green-700 mt-1">Recibe hoy mismo en {CHECKOUT_ENVIO.ciudadLocal}.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            required
            name="direccion"
            value={formData.direccion}
            onChange={onFieldChange}
            className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none"
            placeholder="Direccion (Calle y Numero)"
          />
          <input
            required
            name="barrio"
            value={formData.barrio}
            onChange={onFieldChange}
            className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none"
            placeholder="Barrio"
          />
        </div>
        <input
          name="apartamento"
          value={formData.apartamento}
          onChange={onFieldChange}
          className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none"
          placeholder="Apto, Torre o Casa (Opcional)"
        />
      </div>

      <button
        type="submit"
        disabled={loading || cartEmpty}
        className="w-full bg-[#4a1d44] text-white py-6 rounded-2xl font-bold text-lg shadow-xl hover:bg-[#6b2b62] transition active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
        {loading ? "Preparando pedido..." : "Confirmar información"}
      </button>
    </form>
  );
}

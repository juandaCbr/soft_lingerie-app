import { Truck, MapPin, User, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { COLOMBIA_COMPLETA } from "@/app/lib/colombia";
import type { CheckoutFormData, MetodoPagoEnvio } from "./checkout-types";

type CheckoutShippingFormProps = {
  formData: CheckoutFormData;
  ciudadesDisponibles: string[];
  metodoPagoEnvio: MetodoPagoEnvio;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onMetodoEnvioChange: (m: MetodoPagoEnvio) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  cartEmpty: boolean;
};

export function CheckoutShippingForm({
  formData,
  ciudadesDisponibles,
  metodoPagoEnvio,
  onFieldChange,
  onMetodoEnvioChange,
  onSubmit,
  loading,
  cartEmpty,
}: CheckoutShippingFormProps) {
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

        <input
          required
          name="nombre"
          value={formData.nombre}
          onChange={onFieldChange}
          className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border border-transparent focus:border-[#4a1d44]/10 transition-all"
          placeholder="Nombre completo"
        />
        <input
          required
          type="tel"
          name="telefono"
          value={formData.telefono}
          onChange={onFieldChange}
          className="w-full p-4 rounded-2xl bg-[#fdf8f6] outline-none border border-transparent focus:border-[#4a1d44]/10 transition-all"
          placeholder="WhatsApp / Celular"
        />
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

        {formData.ciudad === "Valledupar" && (
          <div className="bg-green-50 border border-green-100 p-5 rounded-3xl flex items-center gap-4 animate-in zoom-in duration-500">
            <div className="bg-green-500 p-2 rounded-full text-white">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-green-900 leading-none">Envio Local</p>
              <p className="text-xs text-green-700 mt-1">Recibe hoy mismo en Valledupar.</p>
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

      <div className="space-y-4 pt-6 border-t border-gray-50">
        <h2 className="text-[12px] font-black uppercase tracking-widest opacity-70 flex items-center gap-2 mb-4">
          <Truck size={14} /> Método de pago del envío
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onMetodoEnvioChange("INCLUIDO")}
            className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 ${
              metodoPagoEnvio === "INCLUIDO"
                ? "border-[#4a1d44] bg-[#4a1d44]/5"
                : "border-transparent bg-[#fdf8f6]"
            }`}
          >
            <span className="text-sm font-bold text-[#4a1d44]">Pagar envio ahora</span>
            <span className="text-[10px] opacity-60">Se suma al total de tu compra</span>
          </button>
          <button
            type="button"
            onClick={() => onMetodoEnvioChange("CONTRAENTREGA")}
            className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 ${
              metodoPagoEnvio === "CONTRAENTREGA"
                ? "border-[#4a1d44] bg-[#4a1d44]/5"
                : "border-transparent bg-[#fdf8f6]"
            }`}
          >
            <span className="text-sm font-bold text-[#4a1d44]">Pagar envío al recibir</span>
            <span className="text-[10px] opacity-60">Pagas el domicilio cuando te llegue</span>
          </button>
        </div>
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
